import type { RepositoryFacts } from "../models/repositoryFacts";
import { findLoadedManifest } from "../health/test-detection";
import type { InsightItem } from "./types";
import { detectPrimaryLanguage } from "./languageDetection";

interface FrameworkRule {
  id: string;
  label: string;
  detect: (facts: RepositoryFacts) => boolean;
  checks: (facts: RepositoryFacts) => InsightItem[];
}

const FRAMEWORK_RULES: FrameworkRule[] = [
  {
    id: "react",
    label: "React",
    detect: (facts) => dependencyIncludes(facts, "react"),
    checks: (facts) => [
      testFrameworkInsight("react-tests", facts),
      lintInsight("react-lint", facts),
    ],
  },
  {
    id: "nextjs",
    label: "Next.js",
    detect: (facts) =>
      dependencyIncludes(facts, "next") ||
      hasConfig(facts, "next.config.js") ||
      hasConfig(facts, "next.config.mjs") ||
      hasConfig(facts, "next.config.ts"),
    checks: (facts) => [
      {
        id: "next-config",
        categoryId: "framework",
        label: "Next.js configuration",
        status:
          hasConfig(facts, "next.config.js") ||
          hasConfig(facts, "next.config.mjs") ||
          hasConfig(facts, "next.config.ts")
            ? "passed"
            : dependencyIncludes(facts, "next")
              ? "undetermined"
              : "failed",
        explanation: "Next.js dependency or config evidence.",
      },
      testFrameworkInsight("next-tests", facts),
    ],
  },
  {
    id: "express",
    label: "Express",
    detect: (facts) => dependencyIncludes(facts, "express"),
    checks: (facts) => [testFrameworkInsight("express-tests", facts)],
  },
  {
    id: "vite",
    label: "Vite",
    detect: (facts) =>
      dependencyIncludes(facts, "vite") || hasConfig(facts, "vite.config.ts"),
    checks: (facts) => [
      {
        id: "vite-config",
        categoryId: "framework",
        label: "Vite configuration",
        status:
          hasConfig(facts, "vite.config.ts") ||
          hasConfig(facts, "vite.config.js") ||
          hasConfig(facts, "vite.config.mjs")
            ? "passed"
            : "undetermined",
        explanation: "Vite config file when Vite is a dependency.",
      },
      testFrameworkInsight("vite-tests", facts),
    ],
  },
  {
    id: "django",
    label: "Django",
    detect: (facts) => dependencyIncludes(facts, "django"),
    checks: (facts) => [pythonWebTestInsight("django-tests", facts)],
  },
  {
    id: "flask",
    label: "Flask",
    detect: (facts) => dependencyIncludes(facts, "flask"),
    checks: (facts) => [pythonWebTestInsight("flask-tests", facts)],
  },
  {
    id: "fastapi",
    label: "FastAPI",
    detect: (facts) => dependencyIncludes(facts, "fastapi"),
    checks: (facts) => [pythonWebTestInsight("fastapi-tests", facts)],
  },
  {
    id: "spring",
    label: "Spring Boot",
    detect: (facts) =>
      manifestIncludes(facts, "spring-boot") ||
      manifestIncludes(facts, "org.springframework.boot"),
    checks: (facts) => [
      {
        id: "spring-tests",
        categoryId: "framework",
        label: "Spring test evidence",
        status: facts.tree.paths.some((path) => path.includes("/src/test/"))
          ? "passed"
          : "undetermined",
        explanation: "JUnit/TestNG evidence under src/test when detectable.",
      },
    ],
  },
];

export function analyzeFrameworkInsights(facts: RepositoryFacts): InsightItem[] {
  const language = detectPrimaryLanguage(facts);
  const detected = FRAMEWORK_RULES.filter((rule) => rule.detect(facts));

  if (detected.length === 0) {
    return [
      {
        id: "framework-none-detected",
        categoryId: "framework",
        label: "Framework detection",
        status: "undetermined",
        explanation:
          language === "unknown"
            ? "No supported framework could be inferred from dependency manifests."
            : `No common ${language} framework was detected from loaded manifests.`,
      },
    ];
  }

  return detected.flatMap((framework) => [
    {
      id: `framework-${framework.id}`,
      categoryId: "framework",
      label: `${framework.label} detected`,
      status: "passed" as const,
      explanation: `Detected ${framework.label} from dependency or config evidence.`,
    },
    ...framework.checks(facts),
  ]);
}

function dependencyIncludes(facts: RepositoryFacts, name: string): boolean {
  const packageJson = findLoadedManifest(facts, "package.json");

  if (packageJson?.content !== null && packageJson?.content !== undefined) {
    const lower = packageJson.content.toLowerCase();

    return (
      lower.includes(`"${name}"`) ||
      lower.includes(`'${name}'`) ||
      lower.includes(`"${name}@"`) ||
      lower.includes(`'${name}@'`)
    );
  }

  const requirements = findLoadedManifest(facts, "requirements.txt");

  if (requirements?.content !== null && requirements?.content !== undefined) {
    return requirements.content.toLowerCase().includes(name.toLowerCase());
  }

  const pyproject = findLoadedManifest(facts, "pyproject.toml");

  if (pyproject?.content !== null && pyproject?.content !== undefined) {
    return pyproject.content.toLowerCase().includes(name.toLowerCase());
  }

  return false;
}

function manifestIncludes(facts: RepositoryFacts, needle: string): boolean {
  for (const file of facts.dependencyFiles) {
    if (file.contentStatus !== "loaded" || file.content === null) {
      continue;
    }

    if (file.content.toLowerCase().includes(needle.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function hasConfig(facts: RepositoryFacts, configName: string): boolean {
  return (
    facts.rootEntries.some((entry) => entry.name === configName) ||
    facts.tree.paths.some((path) => path.split("/").at(-1) === configName)
  );
}

function testFrameworkInsight(id: string, facts: RepositoryFacts): InsightItem {
  const packageJson = findLoadedManifest(facts, "package.json");
  const hasTestScript =
    packageJson?.content !== null &&
    packageJson?.content !== undefined &&
    /"test"\s*:/.test(packageJson.content);

  return {
    id,
    categoryId: "framework",
    label: "Testing configured",
    status: hasTestScript ? "passed" : "undetermined",
    explanation: hasTestScript
      ? "package.json defines a test script."
      : "Could not verify test script configuration from manifests.",
  };
}

function lintInsight(id: string, facts: RepositoryFacts): InsightItem {
  const hasLint =
    hasConfig(facts, "eslint.config.js") ||
    hasConfig(facts, ".eslintrc.json") ||
    findLoadedManifest(facts, "package.json")?.content?.includes("eslint") ===
      true;

  return {
    id,
    categoryId: "framework",
    label: "Linting configured",
    status: hasLint ? "passed" : "undetermined",
    explanation: hasLint
      ? "ESLint configuration or dependency detected."
      : "Lint configuration could not be verified.",
  };
}

function pythonWebTestInsight(id: string, facts: RepositoryFacts): InsightItem {
  const hasPytest =
    hasConfig(facts, "pytest.ini") ||
    findLoadedManifest(facts, "pyproject.toml")?.content?.includes("pytest") ===
      true;

  return {
    id,
    categoryId: "framework",
    label: "Python web testing setup",
    status: hasPytest ? "passed" : "undetermined",
    explanation: hasPytest
      ? "pytest configuration detected."
      : "Python web framework testing setup could not be verified.",
  };
}
