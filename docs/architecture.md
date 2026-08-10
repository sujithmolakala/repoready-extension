# RepoReady Architecture

## Overview

RepoReady is a Chrome Manifest V3 extension that analyzes GitHub repositories and produces a deterministic repository-health report scored from 0 to 100. It can generate missing or improved documentation as local drafts and, after explicit user approval, create a branch, commit, and pull request on GitHub.

Scoring is deterministic and does not use AI. AI-assisted document generation is optional and separate from health scoring.

## Extension Components

RepoReady is organized into layered TypeScript modules under `src/`:

| Layer / surface | Purpose |
| --- | --- |
| `src/content/` | Content script injected on GitHub pages; detects repository navigation |
| `src/background/` | MV3 service worker; message routing, GitHub/OpenAI calls, fact collection |
| `src/sidepanel/` | Side panel React UI for health reports, documents, and draft review |
| `src/options/` | Settings page for GitHub PAT and optional OpenAI configuration |
| `src/domain/` | Models, health plugins, document templates, prompt/validation logic |
| `src/application/` | Use cases orchestrating domain and infrastructure |
| `src/infrastructure/` | GitHub client, storage, AI provider, GitHub writer |
| `src/shared/` | Extension messages, hooks, shared styles |

Build tooling uses Vite with the CRXJS plugin (`vite.config.ts`, `manifest.config.ts`).

## Repository Detection

The content script runs on `https://github.com/*` and watches for repository page URLs. GitHub is a single-page application, so navigation changes are handled without requiring a full page reload. Detected repository metadata is sent to the background service worker, which broadcasts updates to the side panel.

## GitHub Authentication

RepoReady uses a user-provided GitHub personal access token (PAT) stored locally in `chrome.storage.local`. The token is never sent to a RepoReady backend. Authentication is validated through the GitHub API from the background service worker. OAuth and GitHub App authentication are not implemented.

## Repository Analysis

`RepositoryFacts` is the normalized snapshot of repository metadata RepoReady collects before scoring: README content, dependency manifests, workflow files, tree paths, license, languages, and related signals. Facts are cached per tab/repository and refreshed when the user navigates or reconnects GitHub.

## Health Scoring

Health scoring is implemented as deterministic plugins in `src/domain/health/plugins/`:

- Documentation (25 points)
- Community Standards (20 points)
- Project Structure (20 points)
- Testing (15 points)
- CI/CD (10 points)
- Security (10 points)

Each plugin evaluates explicit checks against `RepositoryFacts` and emits recommendations. The total score is the sum of earned points across categories (maximum 100). AI generation does not influence scoring.

## Document Generation

RepoReady supports two draft generation paths:

1. **Static templates** — deterministic Markdown from repository facts and conservative templates in `src/domain/documents/templates/`.
2. **AI-assisted generation** — optional; uses the user's OpenAI API key (configured in Settings) to improve prose around verified facts. Prompts treat repository content as untrusted data.

Generated output becomes a `DraftDocument` that can be previewed, edited, copied, downloaded, reset, or regenerated (AI only) in the side panel. Drafts persist locally.

## GitHub Write Flow

When the user approves a draft, RepoReady prepares an explicit write plan (destination path, branch name, commit message, PR title/body) and shows an approval drawer. Nothing is written until the user confirms.

The write pipeline:

```
draft → user review → approval → new branch → commit → pull request
```

RepoReady never commits directly to the default branch and never writes without user confirmation.

## Security

Important boundaries in the current implementation:

- GitHub PAT and OpenAI API keys are user-provided and stored only in local extension storage accessible to the background worker.
- Sanitized configuration state is sent to UI surfaces; raw secrets are not included in messages to the side panel or content scripts.
- Repository writes require explicit user action through the approval drawer.
- Health scoring remains deterministic and independent from AI generation.
