import type { RepositoryFacts } from "../../models/repositoryFacts";
import type {
  CheckResult,
  HealthPlugin,
  Recommendation,
} from "../../models/healthReport";
import { RECOGNIZED_MANIFEST_FILE_NAMES } from "../dependency-manifests";
import {
  buildPluginResult,
  createFailedCheck,
  createPassedCheck,
  createUndeterminedCheck,
  hasRootDirectory,
} from "../plugin-utils";
import { hasDependencyManifest } from "../test-detection";

const CATEGORY_ID = "project-structure";
const CATEGORY_LABEL = "Project Structure";

const LICENSE_POINTS = 6;
const GITIGNORE_POINTS = 4;
const MANIFEST_POINTS = 6;
const ORGANIZATION_POINTS = 4;

const CONVENTIONAL_SOURCE_DIRECTORIES = [
  "src",
  "app",
  "lib",
  "packages",
  "modules",
] as const;

const SOURCE_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".rb",
  ".cs",
  ".cpp",
  ".c",
  ".h",
]);

export class ProjectStructureHealthPlugin implements HealthPlugin {
  readonly id = CATEGORY_ID;
  readonly categoryLabel = CATEGORY_LABEL;
  readonly maxPoints = 20;

  analyze(facts: RepositoryFacts) {
    const checks: CheckResult[] = [
      this.checkLicense(facts),
      this.checkGitignore(facts),
      this.checkDependencyManifest(facts),
      this.checkSourceOrganization(facts),
    ];

    const recommendations = checks.flatMap((check) =>
      this.recommendationForCheck(check),
    );

    return buildPluginResult(
      CATEGORY_ID,
      CATEGORY_LABEL,
      this.maxPoints,
      checks,
      recommendations,
    );
  }

  private checkLicense(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "license-exists",
      label: "License exists",
      pointsAvailable: LICENSE_POINTS,
      detectionMethod: "RepositoryFacts.license or RepositoryFacts.licenseFileExists",
    };

    if (facts.license !== null) {
      return createPassedCheck({
        ...base,
        explanation: `Recognized license metadata is set to ${facts.license.name}.`,
      });
    }

    if (facts.licenseFileExists) {
      return createPassedCheck({
        ...base,
        explanation:
          "A LICENSE file exists, but license metadata is not configured on GitHub.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No license metadata or LICENSE file was detected.",
    });
  }

  private checkGitignore(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "gitignore-exists",
      label: ".gitignore exists",
      pointsAvailable: GITIGNORE_POINTS,
      detectionMethod: "Root entry filename equals .gitignore",
    };

    const hasGitignore = facts.rootEntries.some(
      (entry) => entry.type === "file" && entry.name === ".gitignore",
    );

    if (hasGitignore) {
      return createPassedCheck({
        ...base,
        explanation: "A .gitignore file exists in the repository root.",
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No .gitignore file was detected in the repository root.",
    });
  }

  private checkDependencyManifest(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "dependency-manifest-exists",
      label: "Dependency manifest exists",
      pointsAvailable: MANIFEST_POINTS,
      detectionMethod: "Recognized dependency manifest filenames",
    };

    if (hasDependencyManifest(facts)) {
      const manifestNames = collectManifestNames(facts);

      return createPassedCheck({
        ...base,
        explanation: `Detected dependency manifest(s): ${manifestNames.join(", ")}.`,
      });
    }

    return createFailedCheck({
      ...base,
      explanation: "No recognized dependency manifest was detected.",
    });
  }

  private checkSourceOrganization(facts: RepositoryFacts): CheckResult {
    const base = {
      id: "source-organized",
      label: "Source is organized",
      pointsAvailable: ORGANIZATION_POINTS,
      detectionMethod:
        "Conventional source directory, loose root file count, or meaningful root directories",
    };

    if (facts.rootEntries.length === 0 && facts.tree.skipped) {
      return createUndeterminedCheck({
        ...base,
        explanation:
          "Root entries and tree paths were unavailable, so organization could not be evaluated.",
      });
    }

    const conventionalDirectory = CONVENTIONAL_SOURCE_DIRECTORIES.find((directory) =>
      hasRootDirectory(facts.rootEntries, directory),
    );

    if (conventionalDirectory !== undefined) {
      return createPassedCheck({
        ...base,
        explanation: `Repository root contains a conventional source directory: ${conventionalDirectory}.`,
      });
    }

    const looseRootFiles = facts.rootEntries.filter((entry) => entry.type === "file");
    const rootDirectories = facts.rootEntries.filter((entry) => entry.type === "dir");

    if (looseRootFiles.length < 15) {
      return createPassedCheck({
        ...base,
        explanation: `Repository root has ${String(looseRootFiles.length)} loose files, below the 15-file threshold.`,
      });
    }

    const meaningfulDirectories = rootDirectories.filter(
      (entry) => !entry.name.startsWith("."),
    );
    const looseSourceFiles = looseRootFiles.filter((entry) =>
      isLooseSourceFile(entry.name),
    );
    const dominatedByLooseSource =
      looseSourceFiles.length > 0 &&
      looseSourceFiles.length >= looseRootFiles.length - looseSourceFiles.length;

    if (meaningfulDirectories.length >= 2 && !dominatedByLooseSource) {
      return createPassedCheck({
        ...base,
        explanation:
          "Repository root contains multiple meaningful directories without loose source-file sprawl.",
      });
    }

    if (looseRootFiles.length > 15) {
      return createFailedCheck({
        ...base,
        explanation:
          "Repository root has more than 15 loose files and no conventional source directory.",
      });
    }

    return createUndeterminedCheck({
      ...base,
      explanation: "Organization evidence was incomplete.",
    });
  }

  private recommendationForCheck(check: CheckResult): Recommendation[] {
    if (check.status === "passed" || check.status === "undetermined") {
      return [];
    }

    switch (check.id) {
      case "license-exists":
        return [
          {
            id: "project-structure-add-license",
            categoryId: CATEGORY_ID,
            title: "Add a license",
            description:
              "Add a LICENSE file and configure license metadata so others know how to use the project.",
            actionType: "generate-document",
            relatedDocumentType: "license",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "gitignore-exists":
        return [
          {
            id: "project-structure-add-gitignore",
            categoryId: CATEGORY_ID,
            title: "Add a .gitignore",
            description:
              "Add a .gitignore file to keep build artifacts and local files out of version control.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "dependency-manifest-exists":
        return [
          {
            id: "project-structure-add-manifest",
            categoryId: CATEGORY_ID,
            title: "Add a dependency manifest",
            description:
              "Add a recognized dependency manifest such as package.json, pyproject.toml, or go.mod.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      case "source-organized":
        return [
          {
            id: "project-structure-organize-source",
            categoryId: CATEGORY_ID,
            title: "Organize source files",
            description:
              "Move source code into a conventional directory such as src/ instead of keeping many loose root files.",
            actionType: "manual-fix",
            potentialPoints: check.pointsAvailable,
          },
        ];
      default:
        return [];
    }
  }
}

function collectManifestNames(facts: RepositoryFacts): string[] {
  const names = new Set<string>();

  for (const entry of facts.rootEntries) {
    if (entry.type === "file" && RECOGNIZED_MANIFEST_FILE_NAMES.has(entry.name)) {
      names.add(entry.name);
    }
  }

  for (const file of facts.dependencyFiles) {
    if (RECOGNIZED_MANIFEST_FILE_NAMES.has(file.name)) {
      names.add(file.name);
    }
  }

  return [...names];
}

function isLooseSourceFile(fileName: string): boolean {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";

  return SOURCE_FILE_EXTENSIONS.has(extension);
}

export const projectStructureHealthPlugin = new ProjectStructureHealthPlugin();
