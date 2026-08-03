export const MANIFEST_FILE_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "requirements-dev.txt",
  "pyproject.toml",
  "Pipfile",
  "setup.py",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "mix.exs",
]);

export const LOCKFILE_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "npm-shrinkwrap.json",
  "Pipfile.lock",
  "poetry.lock",
  "Gemfile.lock",
  "go.sum",
  "Cargo.lock",
  "composer.lock",
]);

export const DEPENDENCY_FILE_NAMES = new Set([
  ...MANIFEST_FILE_NAMES,
  ...LOCKFILE_FILE_NAMES,
]);

export const LICENSE_FILE_NAMES = new Set([
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
]);

export const MAX_TREE_PATHS = 2000;

export function isLockfileName(fileName: string): boolean {
  return LOCKFILE_FILE_NAMES.has(fileName);
}

export function isManifestName(fileName: string): boolean {
  return MANIFEST_FILE_NAMES.has(fileName);
}
