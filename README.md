# RepoReady

RepoReady is a Chrome Manifest V3 extension that analyzes GitHub repository health, generates missing or improved documentation, and can open pull requests for approved drafts.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [npm](https://www.npmjs.com/) 10 or newer
- Google Chrome

## Setup

```bash
git clone https://github.com/sujithmolakala/repoready-extension.git
cd repoready-extension
npm install
```

## Development

Run the Vite dev server with hot reload for extension pages:

```bash
npm run dev
```

Load the extension from the generated `dist` folder (CRXJS writes build output there during dev as well). For day-to-day UI work on the side panel or options page, `npm run dev` is the fastest loop.

## Production build

```bash
npm run build
```

After a successful build, load the unpacked extension from the **`dist`** directory (see below).

## Load the extension in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked**.
5. Select the **`dist`** directory inside this repository.
6. Pin the RepoReady toolbar action if you want quick access to the side panel.

## Usage

RepoReady runs as a Chrome side panel on GitHub repository pages.

1. Build and load RepoReady as an unpacked extension from `dist/`.
2. Navigate to a GitHub repository (for example `https://github.com/owner/repo`).
3. Click the RepoReady toolbar icon to open the side panel.
4. Open **RepoReady Settings** (extension options) and connect GitHub with a personal access token (PAT). RepoReady uses PAT authentication; OAuth and GitHub App sign-in are not supported.
5. Return to the repository page and allow RepoReady to collect repository facts.
6. Review the **Repository Health Score** (0–100), category breakdown, checks, and recommendations.
7. Open the **Documents** section for supported missing-document recommendations.
8. Generate a draft:
   - **Generate static draft** — deterministic template from repository facts (works without OpenAI).
   - **Generate with AI** — optional; requires an OpenAI API key configured in Settings.
9. Preview and edit the Markdown draft in the side panel.
10. Copy or download the draft locally.
11. When ready, use **Create Pull Request** to review the write plan (destination path, branch, commit message, PR title/body) and confirm. RepoReady creates a new branch, commit, and pull request. It does not merge PRs or write to the default branch automatically.

Optional AI generation sends selected repository facts to OpenAI only when you click **Generate with AI**. Static generation does not require OpenAI.

### Example workflow

Visit a repository → open RepoReady → review the health report → select a recommended document → generate and review the draft → edit if needed → create a pull request after confirming the approval drawer.

## Testing

Contributors can validate the extension with the npm scripts defined in `package.json`:

```bash
npm run build
npm run lint
npm test
```

- **`npm run build`** — runs TypeScript checking and produces the production extension build in `dist/`.
- **`npm run lint`** — runs ESLint across the source tree.
- **`npm test`** — runs the Vitest automated test suite.

The primary test command is:

```bash
npm test
```

## Documentation

- [Architecture](./docs/architecture.md) — contributor overview of RepoReady's current extension architecture, analysis pipeline, and write flow.

## Manual testing checklist

- [ ] Extension loads without errors on `chrome://extensions`.
- [ ] Click the RepoReady toolbar icon and confirm the side panel opens.
- [ ] Open extension options and connect a GitHub PAT.
- [ ] Visit a `https://github.com/owner/repo` page and confirm repository detection in the side panel.
- [ ] Confirm a health score and recommendations appear for the repository.
- [ ] Generate a static document draft and preview it.
- [ ] (Optional) Configure OpenAI in Settings and generate an AI-assisted draft.
- [ ] Confirm copy/download work for a draft.
- [ ] (Optional) Confirm the GitHub write approval drawer and PR creation flow on a test repository.

## Linting

```bash
npm run lint
```

## Project structure

```
src/
├── background/       # MV3 service worker, message handlers, GitHub/OpenAI integration
├── content/          # GitHub page content script and SPA navigation detection
├── sidepanel/        # Side panel React UI (health report, documents, drafts)
├── options/          # Settings page (GitHub PAT, OpenAI key)
├── domain/           # Health plugins, document templates, models, AI prompt/validation
├── application/      # Use cases (facts collection, health evaluation, document generation, writes)
├── infrastructure/   # GitHub client/writer, storage, OpenAI provider
└── shared/           # Extension messages, hooks, styles
```

## Key files

| File | Purpose |
| --- | --- |
| `manifest.config.ts` | Chrome MV3 manifest (permissions, entry points, host permissions) |
| `vite.config.ts` | Vite + CRXJS bundler configuration |
| `src/background/index.ts` | Service worker startup and message routing |
| `src/content/index.ts` | GitHub repository detection |
| `src/sidepanel/` | Health report and document draft UI |
| `src/options/` | GitHub and OpenAI settings |
| `docs/architecture.md` | Architecture overview for contributors |

## License

See [LICENSE](./LICENSE).
