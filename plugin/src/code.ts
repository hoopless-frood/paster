import type { Composition } from "@paster/core";
import { assembleComposition, attachImages } from "./assemble";
import { scanSelection, type ScanSuccess } from "./figma-export";
import type { MainToUiMessage, UiToMainMessage } from "./protocol";

figma.showUI(__html__, { width: 360, height: 480 });

function postToUi(message: MainToUiMessage): void {
  figma.ui.postMessage(message);
}

type Assembled = { ok: true; scan: ScanSuccess; composition: Composition } | { ok: false; errors: string[] };

// Always re-scans the live selection, so layer edits since the last
// generation are reflected.
function scanAndAssemble(): Assembled {
  const scan = scanSelection();
  if (!scan.ok) {
    return scan;
  }
  const validation = assembleComposition(scan);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }
  return { ok: true, scan, composition: validation.composition };
}

function postGenerated(assembled: Extract<Assembled, { ok: true }>): void {
  postToUi({
    type: "generate-result",
    ok: true,
    compositionName: assembled.scan.compositionName,
    layoutCount: assembled.scan.layouts.length,
    warnings: assembled.scan.warnings,
    json: JSON.stringify(assembled.composition, null, 2),
  });
}

function handleGenerate(): void {
  const assembled = scanAndAssemble();
  if (!assembled.ok) {
    postToUi({ type: "generate-result", ok: false, errors: assembled.errors });
    return;
  }
  postGenerated(assembled);
}

async function handleExportZip(): Promise<void> {
  const assembled = scanAndAssemble();
  if (!assembled.ok) {
    postToUi({ type: "zip-result", ok: false, errors: assembled.errors });
    return;
  }
  // The selection may have changed since the last refresh; show what's
  // actually being exported.
  postGenerated(assembled);

  const withImages = await attachImages(assembled.composition, assembled.scan);
  if (!withImages.ok) {
    postToUi({ type: "zip-result", ok: false, errors: withImages.errors });
    return;
  }

  postToUi({
    type: "zip-result",
    ok: true,
    compositionName: assembled.scan.compositionName,
    json: JSON.stringify(withImages.composition, null, 2),
    images: withImages.images,
  });
}

figma.ui.onmessage = (message: UiToMainMessage) => {
  if (message.type === "generate") {
    handleGenerate();
  } else {
    void handleExportZip();
  }
};

handleGenerate();
