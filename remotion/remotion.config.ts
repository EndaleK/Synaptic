import { Config } from "@remotion/cli/config";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

// Use absolute path to ensure public dir is found regardless of working directory
// This resolves issues where running from project root vs remotion/ subdir caused 404s
const remotionRoot = path.resolve(__dirname);
Config.setPublicDir(path.join(remotionRoot, "public"));

Config.setStudioPort(3005);  // Use port 3005 for studio
Config.setRendererPort(3005);  // Use port 3005 for render server (avoids default 3001)
