import {
  findLoadedManifest,
  hasGoTestFiles,
  hasPythonTestFramework,
  hasTestPaths,
} from "../health/test-detection";
import { contentIncludesTestCommand } from "../health/workflow-analysis";
import type { RepositoryFacts } from "../models/repositoryFacts";

export type PackageManager = "npm" | "yarn" | "pnpm";

const LOCKFILE_PACKAGE_MANAGERS: Record<string, PackageManager> = {
  "package-lock.json": "npm",
  "yarn.lock": "yarn",
  "pnpm-lock.yaml": "pnpm",
};

export function detectPackageManager(facts: RepositoryFacts): PackageManager | null {
  const detected = new Set<PackageManager>();

  for (const lockfileName of Object.keys(LOCKFILE_PACKAGE_MANAGERS)) {
    if (hasLockfile(facts, lockfileName)) {
      detected.add(LOCKFILE_PACKAGE_MANAGERS[lockfileName]);
    }
  }

  if (detected.size === 1) {
    return [...detected][0] ?? null;
  }

  return null;
}

export function detectInstallCommand(facts: RepositoryFacts): string | null {
  if (!hasPackageJson(facts)) {
    return null;
  }

  const packageManager = detectPackageManager(facts);

  switch (packageManager) {
    case "npm":
      return "npm install";
    case "yarn":
      return "yarn install";
    case "pnpm":
      return "pnpm install";
    default:
      return null;
  }
}

export function detectTestCommand(facts: RepositoryFacts): string | null {
  const packageJsonTestCommand = detectJavaScriptTestCommand(facts);

  if (packageJsonTestCommand !== null) {
    return packageJsonTestCommand;
  }

  const workflowTestCommand = detectWorkflowTestCommand(facts);

  if (workflowTestCommand !== null) {
    return workflowTestCommand;
  }

  if (hasPythonTestFramework(facts)) {
    return "pytest";
  }

  if (hasGoTestFiles(facts.tree.paths)) {
    return "go test";
  }

  if (findLoadedManifest(facts, "Cargo.toml") !== undefined) {
    return "cargo test";
  }

  const pomXml = findLoadedManifest(facts, "pom.xml");

  if (pomXml !== undefined) {
    return "mvn test";
  }

  if (
    findLoadedManifest(facts, "build.gradle") !== undefined ||
    findLoadedManifest(facts, "build.gradle.kts") !== undefined
  ) {
    return "./gradlew test";
  }

  return null;
}

export function getLicenseDisplayName(facts: RepositoryFacts): string | null {
  if (facts.license === null) {
    return null;
  }

  return facts.license.name.trim().length > 0 ? facts.license.name : null;
}

export function repositoryHasTests(facts: RepositoryFacts): boolean {
  if (facts.tree.skipped) {
    return false;
  }

  return hasTestPaths(facts.tree.paths);
}

export function repositoryHasCi(facts: RepositoryFacts): boolean {
  return facts.workflowFiles.some(
    (file) => file.name.endsWith(".yml") || file.name.endsWith(".yaml"),
  );
}

export function getPrimaryLanguage(facts: RepositoryFacts): string | null {
  if (facts.primaryLanguage === null) {
    return null;
  }

  return facts.primaryLanguage.trim().length > 0 ? facts.primaryLanguage : null;
}

export function getRepositoryDescription(facts: RepositoryFacts): string | null {
  if (facts.description === null) {
    return null;
  }

  return facts.description.trim().length > 0 ? facts.description : null;
}

function detectJavaScriptTestCommand(facts: RepositoryFacts): string | null {
  const packageJson = findLoadedManifest(facts, "package.json");

  if (packageJson?.content === null || packageJson?.content === undefined) {
    return null;
  }

  const parsed = parseJson(packageJson.content);

  if (parsed === null || typeof parsed !== "object") {
    return null;
  }

  const scripts = (parsed as { scripts?: Record<string, unknown> }).scripts;

  if (typeof scripts?.test !== "string" || scripts.test.trim().length === 0) {
    return null;
  }

  const packageManager = detectPackageManager(facts);

  switch (packageManager) {
    case "npm":
      return "npm test";
    case "yarn":
      return "yarn test";
    case "pnpm":
      return "pnpm test";
    default:
      return null;
  }
}

function detectWorkflowTestCommand(facts: RepositoryFacts): string | null {
  for (const workflow of facts.workflowFiles) {
    if (workflow.content === null) {
      continue;
    }

    if (contentIncludesTestCommand(workflow.content)) {
      return findFirstRecognizedTestCommand(workflow.content);
    }
  }

  return null;
}

function findFirstRecognizedTestCommand(content: string): string | null {
  const commands = [
    "npm run test",
    "npm test",
    "pnpm test",
    "yarn test",
    "pytest",
    "go test",
    "cargo test",
    "mvn test",
    "./gradlew test",
    "gradle test",
  ] as const;

  for (const command of commands) {
    if (content.includes(command)) {
      return command;
    }
  }

  return null;
}

function hasPackageJson(facts: RepositoryFacts): boolean {
  return (
    findLoadedManifest(facts, "package.json") !== undefined ||
    facts.rootEntries.some(
      (entry) => entry.type === "file" && entry.name === "package.json",
    ) ||
    facts.tree.paths.some((path) => path === "package.json")
  );
}

function hasLockfile(facts: RepositoryFacts, lockfileName: string): boolean {
  const normalizedName = lockfileName.toLowerCase();

  if (
    facts.rootEntries.some(
      (entry) =>
        entry.type === "file" && entry.name.toLowerCase() === normalizedName,
    )
  ) {
    return true;
  }

  if (
    facts.dependencyFiles.some((file) => file.name.toLowerCase() === normalizedName)
  ) {
    return true;
  }

  return facts.tree.paths.some(
    (path) => path.toLowerCase() === normalizedName,
  );
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
