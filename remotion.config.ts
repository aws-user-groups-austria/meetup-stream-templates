import { Config } from "@remotion/cli/config";

// Every scene is 1920x1080 at 30 fps; the sizes live in src/design/tokens.ts.
// Stills are PNG so text edges stay sharp when dropped into slides.
Config.setVideoImageFormat("png");
Config.setOverwriteOutput(true);
Config.setEntryPoint("src/index.ts");
