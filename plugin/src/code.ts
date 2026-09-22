import { CORE_SCHEMA_VERSION } from "@paster/core";

figma.showUI(__html__, { width: 320, height: 240 });

figma.ui.onmessage = () => {
  figma.closePlugin();
};

figma.ui.postMessage({ type: "core-schema-version", version: CORE_SCHEMA_VERSION });
