import type { RepositoryFile, RepositoryFacts } from "../models/repositoryFacts";
import { RECOGNIZED_MANIFEST_FILE_NAMES } from "./dependency-manifests";

const TEST_DIRECTORY_PATTERNS = [
  /^test\//i,
  /^tests\//i,
  /^__tests__\//i,
  /^spec\//i,
] as const;

const TEST_FILE_PATTERN =
  /(?:^|\/)[^/]*(?:_test\.[^./]+|\.test\.[^./]+|\.spec\.[^./]+)$/i;

const GO_TEST_FILE_PATTERN = /(?:^|\/)[^/]*_test\.go$/i;

const JS_TEST_FRAMEWORKS = [
  "jest",
  "vitest",
  "mocha",
  "ava",
  "jasmine",
  "playwright",
  "cypress",
] as const;

export function hasTestPaths(treePaths: readonly string[]): boolean {
  return treePaths.some(
    (path) =>
      TEST_DIRECTORY_PATTERNS.some((pattern) => pattern.test(path)) ||
      TEST_FILE_PATTERN.test(path),
  );
}

export function hasGoTestFiles(treePaths: readonly string[]): boolean {
  return treePaths.some((path) => GO_TEST_FILE_PATTERN.test(path));
}

export function findLoadedManifest(
  facts: RepositoryFacts,
  manifestName: string,
): RepositoryFile | undefined {
  return facts.dependencyFiles.find(
    (file) =>
      file.name === manifestName &&
      file.contentStatus === "loaded" &&
      file.content !== null,
  );
}

export function hasDependencyManifest(facts: RepositoryFacts): boolean {
  for (const entry of facts.rootEntries) {
    if (entry.type === "file" && RECOGNIZED_MANIFEST_FILE_NAMES.has(entry.name)) {
      return true;
    }
  }

  for (const file of facts.dependencyFiles) {
    if (RECOGNIZED_MANIFEST_FILE_NAMES.has(file.name)) {
      return true;
    }
  }

  return facts.tree.paths.some((path) => {
    const fileName = path.split("/").at(-1);

    return fileName !== undefined && RECOGNIZED_MANIFEST_FILE_NAMES.has(fileName);
  });
}

export function hasJavaScriptTestFramework(facts: RepositoryFacts): boolean {
  const packageJson = findLoadedManifest(facts, "package.json");

  if (packageJson?.content === null || packageJson?.content === undefined) {
    return false;
  }

  const parsed = parseJson(packageJson.content);

  if (parsed === null || typeof parsed !== "object") {
    return false;
  }

  const record = parsed as {
    scripts?: Record<string, unknown>;
    dependencies?: Record<string, unknown>;
    devDependencies?: Record<string, unknown>;
  };

  if (
    typeof record.scripts?.test === "string" &&
    record.scripts.test.trim().length > 0
  ) {
    return true;
  }

  return JS_TEST_FRAMEWORKS.some((framework) =>
    hasDependencyName(record.dependencies, framework) ||
    hasDependencyName(record.devDependencies, framework),
  );
}

export function hasPythonTestFramework(facts: RepositoryFacts): boolean {
  if (facts.tree.paths.some((path) => /^(?:pytest\.ini|tox\.ini)$/i.test(path))) {
    return true;
  }

  const pyproject = findLoadedManifest(facts, "pyproject.toml");

  if (pyproject?.content?.includes("[tool.pytest") === true) {
    return true;
  }

  const requirements = findLoadedManifest(facts, "requirements.txt");

  if (requirements?.content !== null && requirements?.content !== undefined) {
    if (/\bpytest\b/i.test(requirements.content)) {
      return true;
    }
  }

  return false;
}

export function hasRubyTestFramework(facts: RepositoryFacts): boolean {
  if (
    facts.tree.paths.some((path) => path.toLowerCase() === ".rspec") ||
    facts.rootEntries.some(
      (entry) => entry.type === "file" && entry.name.toLowerCase() === ".rspec",
    )
  ) {
    return true;
  }

  const gemfile = findLoadedManifest(facts, "Gemfile");

  return gemfile?.content?.toLowerCase().includes("rspec") === true;
}

export function hasJavaTestFramework(facts: RepositoryFacts): boolean {
  const pomXml = findLoadedManifest(facts, "pom.xml");

  if (
    pomXml?.content !== null &&
    pomXml?.content !== undefined &&
    /\b(junit|testng)\b/i.test(pomXml.content)
  ) {
    return true;
  }

  for (const fileName of ["build.gradle", "build.gradle.kts"]) {
    const gradleFile = findLoadedManifest(facts, fileName);

    if (
      gradleFile?.content !== null &&
      gradleFile?.content !== undefined &&
      /\b(junit|testng)\b/i.test(gradleFile.content)
    ) {
      return true;
    }
  }

  return false;
}

export function hasRustTestEvidence(facts: RepositoryFacts): boolean {
  const hasCargoManifest = findLoadedManifest(facts, "Cargo.toml") !== undefined;
  const hasRustSource = facts.tree.paths.some((path) => path.endsWith(".rs"));

  if (!hasCargoManifest || !hasRustSource) {
    return false;
  }

  const hasTestAttributeInLoadedSource = facts.dependencyFiles.some(
    (file) =>
      file.path.endsWith(".rs") &&
      file.contentStatus === "loaded" &&
      file.content?.includes("#[test]") === true,
  );

  return hasTestAttributeInLoadedSource;
}

export function hasRecognizedTestFramework(facts: RepositoryFacts): boolean {
  if (hasJavaScriptTestFramework(facts)) {
    return true;
  }

  if (hasPythonTestFramework(facts)) {
    return true;
  }

  if (hasRubyTestFramework(facts)) {
    return true;
  }

  if (hasJavaTestFramework(facts)) {
    return true;
  }

  if (hasGoTestFiles(facts.tree.paths)) {
    return true;
  }

  if (hasRustTestEvidence(facts)) {
    return true;
  }

  return false;
}

export function canEvaluateRustTestFramework(facts: RepositoryFacts): boolean {
  const hasCargoManifest =
    findLoadedManifest(facts, "Cargo.toml") !== undefined ||
    facts.rootEntries.some(
      (entry) => entry.type === "file" && entry.name === "Cargo.toml",
    );

  if (!hasCargoManifest) {
    return true;
  }

  const loadedRustSources = facts.dependencyFiles.filter(
    (file) => file.path.endsWith(".rs") && file.contentStatus === "loaded",
  );

  return loadedRustSources.length > 0;
}

function hasDependencyName(
  dependencies: Record<string, unknown> | undefined,
  name: string,
): boolean {
  if (dependencies === undefined) {
    return false;
  }

  return Object.keys(dependencies).some(
    (dependencyName) => dependencyName.toLowerCase() === name,
  );
}

function parseJson(content: string): unknown {
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}
