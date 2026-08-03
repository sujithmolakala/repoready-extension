import type { HealthPlugin } from "../models/healthReport";
import { communityStandardsHealthPlugin } from "./plugins/communityStandardsPlugin";
import { documentationHealthPlugin } from "./plugins/documentationPlugin";

export const defaultHealthPlugins: HealthPlugin[] = [
  documentationHealthPlugin,
  communityStandardsHealthPlugin,
];
