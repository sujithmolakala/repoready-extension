# RepoReady

RepoReady is a Chrome Manifest V3 extension that will analyze GitHub repository health and generate missing documentation. This repository contains the initial project foundation and extension skeleton.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [npm](https://www.npmjs.com/) 10 or newer
- Google Chrome

## Setup

```bash
git clone <your-repo-url>
cd repoready
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
5. Select this folder:

   **`/Users/sm/Projects/repoready/dist`**

6. Pin the RepoReady toolbar action if you want quick access to the side panel.

## Manual testing checklist

- [ ] Extension loads without errors on `chrome://extensions`.
- [ ] Click the RepoReady toolbar icon and confirm the side panel opens with **RepoReady** centered on a dark background.
- [ ] Open `chrome://extensions` → RepoReady → **Extension options** and confirm the options page renders.
- [ ] Visit any `https://github.com/...` page, open DevTools → **Console**, and confirm: `[RepoReady] Content script loaded on GitHub: ...`
- [ ] On `chrome://extensions`, click **Service worker** under RepoReady and confirm: `[RepoReady] Background service worker started`

## Linting

```bash
npm run lint
```

## Project structure

```
src/
├── background/       # MV3 service worker (extension lifecycle, side panel behavior)
├── content/          # Content scripts injected on GitHub pages
├── sidepanel/        # Chrome side panel React UI
├── options/          # Extension options page React UI
├── domain/           # Domain models and business rules (future)
├── application/      # Use cases and orchestration (future)
├── infrastructure/   # External adapters such as GitHub API (future)
└── shared/           # Shared styles, types, and utilities
```

## Key files

| File | Purpose |
| --- | --- |
| `manifest.config.ts` | Chrome MV3 manifest (permissions, entry points, GitHub match patterns) |
| `vite.config.ts` | Vite + CRXJS bundler configuration for all extension surfaces |
| `src/background/index.ts` | Service worker startup log and side-panel-on-click behavior |
| `src/content/index.ts` | GitHub-only content script startup log |
| `src/sidepanel/` | Side panel HTML shell and React app showing **RepoReady** |
| `src/options/` | Options page placeholder for future settings |
| `tailwind.config.js` | Tailwind content paths for extension UI surfaces |

## Out of scope (for now)

- GitHub authentication
- GitHub API calls
- Repository scoring
- AI documentation generation
- GitHub writes
- Backend services

## License

Private — add a license when you are ready to publish.
