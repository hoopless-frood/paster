import JSZip from "jszip";
import type { ExportedImage, ImageFormat, LayoutSummary, MainToUiMessage, UiToMainMessage } from "./protocol";

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const formEl = document.getElementById("layouts") as HTMLDivElement;
const exportButton = document.getElementById("export") as HTMLButtonElement;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const outputEl = document.getElementById("output") as HTMLTextAreaElement;
const errorsEl = document.getElementById("errors") as HTMLUListElement;
const warningsEl = document.getElementById("warnings") as HTMLUListElement;
const modeInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="mode"]'));
const formatRowEl = document.getElementById("format-row") as HTMLLabelElement;
const formatSelectEl = document.getElementById("format") as HTMLSelectElement;

function sendToMain(message: UiToMainMessage): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

function renderList(el: HTMLUListElement, items: string[]): void {
  el.innerHTML = "";
  items.forEach((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    el.appendChild(item);
  });
}

function currentMode(): "json" | "zip" {
  return (modeInputs.find((input) => input.checked)?.value as "json" | "zip" | undefined) ?? "json";
}

function updateExportButtonLabel(): void {
  exportButton.textContent = currentMode() === "zip" ? "Export ZIP" : "Export JSON";
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "paster-export";
}

modeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    formatRowEl.hidden = currentMode() !== "zip";
    updateExportButtonLabel();
  });
});

function renderLayoutForm(compositionName: string, layouts: LayoutSummary[]): void {
  statusEl.textContent = `"${compositionName}" — ${layouts.length} layout${layouts.length === 1 ? "" : "s"} found. Min-width is suggested from each layout's frame width — review and edit before exporting.`;
  formEl.innerHTML = "";
  outputEl.value = "";

  layouts.forEach((layout) => {
    const row = document.createElement("label");
    row.className = "row";
    row.textContent = `${layout.name} — min width (px)`;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = String(layout.suggestedMinWidth);
    input.dataset.layout = layout.name;

    row.appendChild(input);
    formEl.appendChild(row);
  });

  // A successful scan always has at least one layout (scanSelection fails
  // rather than returning an empty list), so export is safe to enable here.
  exportButton.disabled = false;
  updateExportButtonLabel();
}

/** Assembles composition.json + every exported image into a downloadable ZIP, entirely in the UI iframe — the main thread can export images but has no DOM/Blob to build or download a ZIP with. */
async function downloadZip(compositionName: string, json: string, images: ExportedImage[]): Promise<void> {
  const zip = new JSZip();
  zip.file("composition.json", json);
  images.forEach((image) => {
    zip.file(image.path, image.bytes);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(compositionName)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

window.onmessage = (event: MessageEvent<{ pluginMessage: MainToUiMessage }>) => {
  const message = event.data.pluginMessage;

  if (message.type === "scan-result") {
    if (message.ok) {
      renderList(errorsEl, []);
      renderList(warningsEl, message.warnings);
      renderLayoutForm(message.compositionName, message.layouts);
    } else {
      formEl.innerHTML = "";
      exportButton.disabled = true;
      statusEl.textContent = "Selection isn't ready to export yet.";
      renderList(warningsEl, []);
      renderList(errorsEl, message.errors);
    }
    return;
  }

  if (message.type === "export-result") {
    refreshButton.disabled = false;
    exportButton.disabled = false;
    updateExportButtonLabel();

    if (message.ok) {
      renderList(errorsEl, []);
      renderList(warningsEl, message.warnings);
      outputEl.value = message.json;
      outputEl.focus();
      outputEl.select();

      if (message.mode === "zip") {
        downloadZip(message.compositionName, message.json, message.images).catch((error) => {
          renderList(errorsEl, [
            `Built the composition but couldn't assemble the ZIP: ${error instanceof Error ? error.message : String(error)}`,
          ]);
        });
      }
    } else {
      outputEl.value = "";
      renderList(errorsEl, message.errors);
    }
  }
};

refreshButton.addEventListener("click", () => {
  sendToMain({ type: "scan" });
});

exportButton.addEventListener("click", () => {
  const inputs = Array.from(formEl.querySelectorAll<HTMLInputElement>("input[data-layout]"));
  const emptyLayouts = inputs
    .filter((input) => input.value.trim() === "")
    .map((input) => input.dataset.layout);

  if (emptyLayouts.length > 0) {
    renderList(
      errorsEl,
      emptyLayouts.map((name) => `Enter a min-width for layout "${name}" before exporting.`),
    );
    return;
  }

  const minWidths: Record<string, number> = {};
  inputs.forEach((input) => {
    const layoutName = input.dataset.layout;
    if (layoutName) {
      minWidths[layoutName] = Number(input.value);
    }
  });

  refreshButton.disabled = true;
  exportButton.disabled = true;

  if (currentMode() === "zip") {
    const format = formatSelectEl.value as ImageFormat;
    exportButton.textContent = "Exporting images…";
    sendToMain({ type: "export", minWidths, mode: "zip", format });
  } else {
    sendToMain({ type: "export", minWidths, mode: "json" });
  }
});
