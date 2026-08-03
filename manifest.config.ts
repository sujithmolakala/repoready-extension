import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "RepoReady",
  description: "Analyze GitHub repository health and generate missing documentation.",
  version: "0.1.0",
  permissions: ["sidePanel", "storage"],
  host_permissions: ["https://github.com/*", "https://api.github.com/*"],
  action: {
    default_title: "Open RepoReady",
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://github.com/*"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
  options_page: "src/options/index.html",
});
