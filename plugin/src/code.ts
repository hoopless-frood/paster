import { assembleComposition } from "./assemble";
import { scanSelection } from "./figma-export";
import type { MainToUiMessage, UiToMainMessage } from "./protocol";

figma.showUI(__html__, { width: 360, height: 480 });

function postToUi(message: MainToUiMessage): void {
  figma.ui.postMessage(message);
}

function handleScan(): void {
  const result = scanSelection();

  if (!result.ok) {
    postToUi({ type: "scan-result", ok: false, errors: result.errors });
    return;
  }

  postToUi({
    type: "scan-result",
    ok: true,
    compositionName: result.compositionName,
    layouts: result.layouts.map((layout) => ({ name: layout.name })),
  });
}

function handleExport(minWidths: Record<string, number>): void {
  // Re-scan rather than reuse the last scan result, so edits made after the
  // last "Refresh" (moving/resizing/reordering layers) are reflected.
  const result = scanSelection();

  if (!result.ok) {
    postToUi({ type: "export-result", ok: false, errors: result.errors });
    return;
  }

  const validation = assembleComposition(result, minWidths);

  if (!validation.valid) {
    postToUi({ type: "export-result", ok: false, errors: validation.errors });
    return;
  }

  postToUi({
    type: "export-result",
    ok: true,
    json: JSON.stringify(validation.composition, null, 2),
  });
}

figma.ui.onmessage = (message: UiToMainMessage) => {
  if (message.type === "scan") {
    handleScan();
  } else if (message.type === "export") {
    handleExport(message.minWidths);
  }
};

handleScan();
