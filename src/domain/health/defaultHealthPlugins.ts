import type { HealthPlugin } from "../models/healthReport";
import { ciCdHealthPlugin } from "./plugins/ciCdPlugin";
import { communityStandardsHealthPlugin } from "./plugins/communityStandardsPlugin";
import { documentationHealthPlugin } from "./plugins/documentationPlugin";
import { projectStructureHealthPlugin } from "./plugins/projectStructurePlugin";
import { securityHealthPlugin } from "./plugins/securityPlugin";
import { testingHealthPlugin } from "./plugins/testingPlugin";

export const defaultHealthPlugins: HealthPlugin[] = [
  documentationHealthPlugin,
  communityStandardsHealthPlugin,
  projectStructureHealthPlugin,
  testingHealthPlugin,
  ciCdHealthPlugin,
  securityHealthPlugin,
];

export const DEFAULT_PLUGIN_IDS = defaultHealthPlugins.map((plugin) => plugin.id);
