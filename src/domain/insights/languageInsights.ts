import type { RepositoryFacts } from "../models/repositoryFacts";
import { hasJavaScriptTestFramework } from "../health/test-detection";
import type { InsightItem } from "./types";
import {
  detectPrimaryLanguage,
  hasConfigFile,
  hasLockfile,
} from "./languageDetection";

export function analyzeLanguageInsights(facts: RepositoryFacts): InsightItem[] {
  const language = detectPrimaryLanguage(facts);
  const items: InsightItem[] = [];

  switch (language) {
    case "javascript":
    case "typescript":
      items.push(
        manifestInsight(
          "js-package-manifest",
          "Package manifest present",
          hasPathEvidence(facts, "package.json"),
          "package.json",
        ),
        lockfileInsight(facts),
        configInsight(
          "js-typescript-config",
          "TypeScript configuration",
          language === "typescript",
          hasConfigFile(facts, "tsconfig.json"),
          "tsconfig.json when TypeScript is primary",
        ),
        configInsight(
          "js-lint-config",
          "Lint configuration",
          true,
          hasAnyConfig(facts, [
            "eslint.config.js",
            "eslint.config.mjs",
            "eslint.config.cjs",
            ".eslintrc",
            ".eslintrc.json",
            ".eslintrc.js",
            ".eslintrc.cjs",
          ]),
          "ESLint or equivalent lint config",
        ),
        testConfigInsight(
          "js-test-config",
          hasJavaScriptTestFramework(facts) ||
            hasAnyConfig(facts, ["vitest.config.ts", "jest.config.js", "jest.config.ts"]),
        ),
      );
      break;
    case "python":
      items.push(
        manifestInsight(
          "py-manifest",
          "Python dependency manifest",
          hasAnyPath(facts, ["requirements.txt", "pyproject.toml", "Pipfile"]),
          "requirements.txt, pyproject.toml, or Pipfile",
        ),
        configInsight(
          "py-test-config",
          "Test configuration",
          true,
          hasAnyConfig(facts, ["pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini"]),
          "pytest or packaging test configuration",
        ),
        configInsight(
          "py-lint-config",
          "Lint/format configuration",
          false,
          hasAnyConfig(facts, [".flake8", "pyproject.toml", ".pylintrc", "ruff.toml"]),
          "optional lint/format tooling",
        ),
      );
      break;
    case "go":
      items.push(
        manifestInsight(
          "go-mod",
          "Go module manifest",
          hasPathEvidence(facts, "go.mod"),
          "go.mod",
        ),
        configInsight(
          "go-sum",
          "Go sum lockfile",
          false,
          hasLockfile(facts, "go.sum"),
          "go.sum for reproducible builds",
        ),
        configInsight(
          "go-tests",
          "Go test files",
          true,
          facts.tree.paths.some((path) => path.endsWith("_test.go")),
          "*_test.go files in the tree",
        ),
      );
      break;
    case "rust":
      items.push(
        manifestInsight(
          "rust-cargo",
          "Cargo manifest",
          hasPathEvidence(facts, "Cargo.toml"),
          "Cargo.toml",
        ),
        configInsight(
          "rust-lock",
          "Cargo lockfile",
          false,
          hasLockfile(facts, "Cargo.lock"),
          "Cargo.lock for application/binary projects",
        ),
        configInsight(
          "rust-tests",
          "Rust test evidence",
          true,
          facts.tree.paths.some(
            (path) => path.includes("/tests/") || path.endsWith("_test.rs"),
          ),
          "tests/ directory or *_test.rs files",
        ),
      );
      break;
    case "java":
      items.push(
        manifestInsight(
          "java-build-manifest",
          "Java build manifest",
          hasAnyPath(facts, ["pom.xml", "build.gradle", "build.gradle.kts"]),
          "Maven or Gradle manifest",
        ),
        configInsight(
          "java-tests",
          "Java test evidence",
          true,
          facts.tree.paths.some(
            (path) =>
              path.includes("/src/test/") ||
              path.includes("/test/") ||
              path.endsWith("Test.java"),
          ),
          "src/test or conventional Java test paths",
        ),
      );
      break;
    default:
      items.push({
        id: "language-unknown",
        categoryId: "language",
        label: "Primary language detection",
        status: "undetermined",
        explanation:
          "Could not determine a supported primary language from repository metadata.",
      });
      break;
  }

  return items;
}

function manifestInsight(
  id: string,
  label: string,
  present: boolean,
  evidence: string,
): InsightItem {
  return {
    id,
    categoryId: "language",
    label,
    status: present ? "passed" : "failed",
    explanation: present
      ? `Detected ${evidence}.`
      : `No ${evidence} was found.`,
  };
}

function lockfileInsight(facts: RepositoryFacts): InsightItem {
  const hasAnyJsLockfile =
    hasLockfile(facts, "package-lock.json") ||
    hasLockfile(facts, "yarn.lock") ||
    hasLockfile(facts, "pnpm-lock.yaml");

  if (!hasPathEvidence(facts, "package.json")) {
    return {
      id: "js-lockfile",
      categoryId: "language",
      label: "Lockfile present",
      status: "undetermined",
      explanation: "No package.json found, so lockfile expectations are unclear.",
    };
  }

  return {
    id: "js-lockfile",
    categoryId: "language",
    label: "Lockfile present",
    status: hasAnyJsLockfile ? "passed" : "failed",
    explanation: hasAnyJsLockfile
      ? "Detected a JavaScript package lockfile."
      : "No npm/yarn/pnpm lockfile was detected for this Node project.",
  };
}

function configInsight(
  id: string,
  label: string,
  required: boolean,
  present: boolean,
  evidence: string,
): InsightItem {
  if (!required && !present) {
    return {
      id,
      categoryId: "language",
      label,
      status: "undetermined",
      explanation: `${evidence} is optional and was not detected.`,
    };
  }

  return {
    id,
    categoryId: "language",
    label,
    status: present ? "passed" : required ? "failed" : "undetermined",
    explanation: present
      ? `Detected ${evidence}.`
      : required
        ? `Expected ${evidence} but none was found.`
        : `${evidence} was not detected.`,
  };
}

function testConfigInsight(id: string, configured: boolean): InsightItem {
  return {
    id,
    categoryId: "language",
    label: "Test configuration",
    status: configured ? "passed" : "undetermined",
    explanation: configured
      ? "Detected test framework configuration or dependencies."
      : "Test framework configuration could not be verified from manifests.",
  };
}

function hasPathEvidence(facts: RepositoryFacts, target: string): boolean {
  return (
    facts.rootEntries.some((entry) => entry.name === target) ||
    facts.dependencyFiles.some((file) => file.name === target) ||
    facts.tree.paths.some((path) => path.split("/").at(-1) === target)
  );
}

function hasAnyPath(facts: RepositoryFacts, targets: string[]): boolean {
  return targets.some((target) => hasPathEvidence(facts, target));
}

function hasAnyConfig(facts: RepositoryFacts, configs: string[]): boolean {
  return configs.some((config) => hasConfigFile(facts, config));
}
