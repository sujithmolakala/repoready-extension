import type {
  FileEntry,
  RepositoryFacts,
  RepositoryFile,
} from "../../domain/models/repositoryFacts";
import {
  applyReadmeContentPolicy,
  applyRepositoryFileContentPolicy,
  createSkippedLockfileRecord,
} from "./repository-file-content";
import {
  DEPENDENCY_FILE_NAMES,
  isLockfileName,
  LICENSE_FILE_NAMES,
} from "./dependency-file-names";
import type { GitHubClient } from "./GitHubClient";
import { logTreeCollectionDiagnostic } from "./tree-diagnostics";
import type {
  GitHubContentResponse,
  GitHubRepositoryResponse,
} from "./types";

export class FactCollector {
  constructor(private readonly githubClient: GitHubClient) {}

  async collect(owner: string, name: string): Promise<RepositoryFacts> {
    const repository = await this.githubClient.getRepository(owner, name);
    const defaultBranch = readString(repository.default_branch) ?? "main";
    const collectionWarnings: string[] = [];

    const [
      languages,
      rootContents,
      githubContents,
      readme,
      treeResult,
      hasReleases,
    ] = await Promise.all([
      this.githubClient.getLanguages(owner, name),
      this.githubClient.getDirectoryContents(owner, name, ""),
      this.githubClient.getDirectoryContents(owner, name, ".github"),
      this.githubClient.getReadme(owner, name),
      this.collectTree(owner, name, defaultBranch),
      this.githubClient.hasReleases(owner, name),
    ]);

    const rootEntries = parseFileEntries(rootContents);
    const rootEntryByPath = new Map(
      rootEntries
        .filter((entry) => entry.type === "file")
        .map((entry) => [entry.path, entry]),
    );

    const [dependencyFiles, workflowFiles] = await Promise.all([
      this.collectDependencyFiles(
        owner,
        name,
        rootEntries,
        rootEntryByPath,
        treeResult.paths,
        collectionWarnings,
      ),
      this.collectWorkflowFiles(owner, name, collectionWarnings),
    ]);

    return {
      owner,
      name,
      defaultBranch,
      description: readNullableString(repository.description),
      homepage: readNullableString(repository.homepage),
      visibility: parseVisibility(repository),
      archived: repository.archived === true,
      fork: repository.fork === true,
      license: parseLicense(repository.license),
      licenseFileExists: hasLicenseFile(rootEntries),
      primaryLanguage: readNullableString(repository.language),
      languages,
      rootEntries,
      githubEntries: parseFileEntries(githubContents),
      readme: {
        exists: readme !== null,
        path: readme?.path ?? null,
        content:
          readme === null
            ? null
            : applyReadmeContentPolicy(readme.content),
      },
      dependencyFiles,
      workflowFiles,
      tree: {
        paths: treeResult.paths,
        truncated: treeResult.truncated,
        skipped: treeResult.skipped,
      },
      activity: {
        pushedAt: readNullableString(repository.pushed_at),
        updatedAt: readNullableString(repository.updated_at),
        openIssuesCount: readNumber(repository.open_issues_count) ?? 0,
        hasReleases,
      },
      fetchedAt: new Date().toISOString(),
      collectionWarnings,
    };
  }

  private async collectDependencyFiles(
    owner: string,
    name: string,
    rootEntries: FileEntry[],
    rootEntryByPath: Map<string, FileEntry>,
    treePaths: string[],
    warnings: string[],
  ): Promise<RepositoryFile[]> {
    const paths = detectDependencyPaths(rootEntries, treePaths);

    const fetched = await Promise.all(
      paths.map(async (path): Promise<RepositoryFile | null> => {
        const fileName = path.split("/").at(-1);

        if (fileName === undefined) {
          return null;
        }

        const rootEntry = rootEntryByPath.get(path);

        if (isLockfileName(fileName) && rootEntry !== undefined) {
          return {
            path,
            name: fileName,
            size: rootEntry.size,
            ...createSkippedLockfileRecord(),
          };
        }

        try {
          const file = await this.githubClient.getFileContent(owner, name, path);
          const stored = applyRepositoryFileContentPolicy(fileName, file.content);

          return {
            path: file.path,
            name: fileName,
            size: file.size ?? rootEntry?.size ?? null,
            ...stored,
          };
        } catch {
          warnings.push(`Failed to fetch dependency file: ${path}`);

          return null;
        }
      }),
    );

    return fetched.filter((file): file is RepositoryFile => file !== null);
  }

  private async collectWorkflowFiles(
    owner: string,
    name: string,
    warnings: string[],
  ): Promise<RepositoryFile[]> {
    const entries = await this.githubClient.getDirectoryContents(
      owner,
      name,
      ".github/workflows",
    );

    const workflowEntries = entries.filter((entry) => {
      const entryName = readString(entry.name);
      const entryType = entry.type;

      if (entryName === null || entryType !== "file") {
        return false;
      }

      return entryName.endsWith(".yml") || entryName.endsWith(".yaml");
    });

    const fetched = await Promise.all(
      workflowEntries.map(async (entry): Promise<RepositoryFile | null> => {
        const path = readString(entry.path);
        const entryName = readString(entry.name);

        if (path === null || entryName === null) {
          return null;
        }

        try {
          const file = await this.githubClient.getFileContent(owner, name, path);
          const stored = applyRepositoryFileContentPolicy(entryName, file.content);

          return {
            path: file.path,
            name: entryName,
            size: file.size,
            ...stored,
          };
        } catch {
          warnings.push(`Failed to fetch workflow file: ${path}`);

          return null;
        }
      }),
    );

    return fetched.filter((file): file is RepositoryFile => file !== null);
  }

  private async collectTree(
    owner: string,
    name: string,
    branch: string,
  ): Promise<{ paths: string[]; truncated: boolean; skipped: boolean }> {
    try {
      const tree = await this.githubClient.getRecursiveTree(owner, name, branch);

      logTreeCollectionDiagnostic({
        stage: "complete",
        message: `Collected ${String(tree.paths.length)} tree paths.`,
      });

      return {
        paths: tree.paths,
        truncated: tree.truncated,
        skipped: false,
      };
    } catch (error) {
      logTreeCollectionDiagnostic({
        stage: "failed",
        errorCode: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : "Tree collection failed.",
      });

      return {
        paths: [],
        truncated: false,
        skipped: true,
      };
    }
  }
}

export function detectDependencyPaths(
  rootEntries: FileEntry[],
  treePaths: string[],
): string[] {
  const paths = new Set<string>();

  for (const entry of rootEntries) {
    if (entry.type === "file" && DEPENDENCY_FILE_NAMES.has(entry.name)) {
      paths.add(entry.path);
    }
  }

  for (const path of treePaths) {
    const fileName = path.split("/").at(-1);

    if (fileName !== undefined && DEPENDENCY_FILE_NAMES.has(fileName)) {
      paths.add(path);
    }
  }

  return [...paths];
}

export function hasLicenseFile(rootEntries: FileEntry[]): boolean {
  return rootEntries.some(
    (entry) => entry.type === "file" && LICENSE_FILE_NAMES.has(entry.name),
  );
}

function parseFileEntries(entries: GitHubContentResponse[]): FileEntry[] {
  return entries.flatMap((entry) => {
    const entryName = readString(entry.name);
    const path = readString(entry.path);
    const type = parseEntryType(entry.type);

    if (entryName === null || path === null || type === null) {
      return [];
    }

    return [
      {
        name: entryName,
        path,
        type,
        size: readNumber(entry.size),
      },
    ];
  });
}

function parseEntryType(
  value: unknown,
): FileEntry["type"] | null {
  if (value === "file" || value === "dir" || value === "symlink" || value === "submodule") {
    return value;
  }

  return null;
}

function parseVisibility(
  repository: GitHubRepositoryResponse,
): RepositoryFacts["visibility"] {
  if (repository.visibility === "internal") {
    return "internal";
  }

  if (repository.visibility === "private" || repository.private === true) {
    return "private";
  }

  return "public";
}

function parseLicense(value: unknown): RepositoryFacts["license"] {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const license = value as {
    key?: unknown;
    name?: unknown;
    spdx_id?: unknown;
  };

  const key = readString(license.key);
  const licenseName = readString(license.name);

  if (key === null || licenseName === null) {
    return null;
  }

  return {
    key,
    name: licenseName,
    spdxId: readNullableString(license.spdx_id),
  };
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}
