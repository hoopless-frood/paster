import type { LayoutSummary, MainToUiMessage, UiToMainMessage } from "./protocol";

const statusEl = document.getElementById("status") as HTMLParagraphElement;
const formEl = document.getElementById("layouts") as HTMLDivElement;
const exportButton = document.getElementById("export") as HTMLButtonElement;
const refreshButton = document.getElementById("refresh") as HTMLButtonElement;
const outputEl = document.getElementById("output") as HTMLTextAreaElement;
const errorsEl = document.getElementById("errors") as HTMLUListElement;

function sendToMain(message: UiToMainMessage): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

function renderErrors(errors: string[]): void {
  errorsEl.innerHTML = "";
  errors.forEach((error) => {
    const item = document.createElement("li");
    item.textContent = error;
    errorsEl.appendChild(item);
  });
}

function renderLayoutForm(compositionName: string, layouts: LayoutSummary[]): void {
  statusEl.textContent = `"${compositionName}" — ${layouts.length} layout${layouts.length === 1 ? "" : "s"} found.`;
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
    input.dataset.layout = layout.name;

    row.appendChild(input);
    formEl.appendChild(row);
  });

  exportButton.disabled = layouts.length === 0;
}

window.onmessage = (event: MessageEvent<{ pluginMessage: MainToUiMessage }>) => {
  const message = event.data.pluginMessage;

  if (message.type === "scan-result") {
    if (message.ok) {
      renderErrors([]);
      renderLayoutForm(message.compositionName, message.layouts);
    } else {
      formEl.innerHTML = "";
      exportButton.disabled = true;
      statusEl.textContent = "Selection isn't ready to export yet.";
      renderErrors(message.errors);
    }
    return;
  }

  if (message.type === "export-result") {
    if (message.ok) {
      renderErrors([]);
      outputEl.value = message.json;
      outputEl.focus();
      outputEl.select();
    } else {
      outputEl.value = "";
      renderErrors(message.errors);
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
    renderErrors(emptyLayouts.map((name) => `Enter a min-width for layout "${name}" before exporting.`));
    return;
  }

  const minWidths: Record<string, number> = {};
  inputs.forEach((input) => {
    const layoutName = input.dataset.layout;
    if (layoutName) {
      minWidths[layoutName] = Number(input.value);
    }
  });

  sendToMain({ type: "export", minWidths });
});
