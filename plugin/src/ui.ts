import JSZip from "jszip";
import { createJsonView } from "./json-view";
import type { ExportedImage, MainToUiMessage, UiToMainMessage } from "./protocol";

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const copyButton = document.getElementById("copy-json") as HTMLButtonElement;
const exportZipButton = document.getElementById("export-zip") as HTMLButtonElement;
const errorsEl = document.getElementById("errors") as HTMLUListElement;
const warningsEl = document.getElementById("warnings") as HTMLUListElement;

const jsonView = createJsonView(document.getElementById("output") as HTMLDivElement);

// What Copy JSON copies: always exactly what the view is showing.
let currentJson = "";

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

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "paster-export";
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

/** Switches a button between its two stacked labels (see ui.css). */
function setActive(button: HTMLButtonElement, active: boolean): void {
  button.classList.toggle("active", active);
}

function showOutput(json: string): void {
  currentJson = json;
  jsonView.setText(json);
  copyButton.disabled = json === "";
}

/**
 * Figma's plugin iframe blocks navigator.clipboard, so this copies through
 * a temporary textarea and execCommand("copy"). It runs directly in the
 * click handler, which is when browsers allow it.
 */
function copyToClipboard(text: string): boolean {
  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.opacity = "0";
  document.body.appendChild(scratch);
  scratch.select();
  const copied = document.execCommand("copy");
  scratch.remove();
  return copied;
}

window.onmessage = (event: MessageEvent<{ pluginMessage: MainToUiMessage }>) => {
  const message = event.data.pluginMessage;

  if (message.type === "generate-result") {
    exportZipButton.disabled = !message.ok;
    if (!message.ok) {
      statusEl.textContent = "Select one composition frame.";
      showOutput("");
      renderList(warningsEl, []);
      renderList(errorsEl, message.errors);
      return;
    }

    const { compositionName, layoutCount } = message;
    statusEl.textContent = `"${compositionName}" — ${layoutCount} layout${layoutCount === 1 ? "" : "s"} found.`;
    renderList(errorsEl, []);
    renderList(warningsEl, message.warnings);
    showOutput(message.json);
    return;
  }

  refreshButton.disabled = false;
  exportZipButton.disabled = false;
  setActive(exportZipButton, false);

  if (!message.ok) {
    renderList(errorsEl, message.errors);
    return;
  }

  renderList(errorsEl, []);
  showOutput(message.json);
  downloadZip(message.compositionName, message.json, message.images).catch((error) => {
    renderList(errorsEl, [
      `Built the composition but couldn't assemble the ZIP: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  });
};

refreshButton.addEventListener("click", () => {
  sendToMain({ type: "generate" });
});

copyButton.addEventListener("click", () => {
  if (copyToClipboard(currentJson)) {
    renderList(errorsEl, []);
    setActive(copyButton, true);
    setTimeout(() => setActive(copyButton, false), 1500);
  } else {
    renderList(errorsEl, ["Couldn't copy to the clipboard. Select the JSON and press ⌘C / Ctrl+C."]);
  }
});

exportZipButton.addEventListener("click", () => {
  refreshButton.disabled = true;
  exportZipButton.disabled = true;
  setActive(exportZipButton, true);
  sendToMain({ type: "export-zip" });
});
