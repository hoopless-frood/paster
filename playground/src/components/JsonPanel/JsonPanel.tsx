import { useEffect, useState } from "react";
import { Button } from "../Button/Button";
import { FileUploadButton } from "../FileUploadButton/FileUploadButton";
import { JsonEditor } from "../JsonEditor/JsonEditor";
import { MessageList } from "../MessageList/MessageList";
import { importComposition, jsonFileSizeError } from "./import-composition";
import { importZip } from "./import-zip";
// Bundled by Vite, so the example also works on the hosted playground.
import collageZipUrl from "../../../../examples/collage/collage.zip?url";
import type { JsonPanelProps } from "./JsonPanel.types";
import styles from "./JsonPanel.module.css";

export type { JsonPanelProps } from "./JsonPanel.types";

const VALIDATE_DEBOUNCE_MS = 400;

type Example = "collage" | "geometry";

export function JsonPanel({ sampleComposition, onImport, onImportZip, onErrorsChange }: JsonPanelProps) {
  const [text, setText] = useState(() => JSON.stringify(sampleComposition, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  // Which button's action is in progress; all are disabled meanwhile.
  const [loadingAction, setLoadingAction] = useState<"upload" | "collage" | null>(null);
  const isBusy = loadingAction !== null;
  // The example the editor currently shows, unchanged; its load button is
  // disabled. Starts as geometry, which is what the playground opens with.
  const [loadedExample, setLoadedExample] = useState<Example | null>("geometry");

  // Every change to the editor's text goes through here (or the editor's own
  // onChange, which only fires for the user's edits), so loadedExample stays
  // accurate; a failed import that leaves the text alone leaves it alone too.
  function showText(nextText: string, example: Example | null = null) {
    setText(nextText);
    setLoadedExample(example);
  }

  function runImport(candidateText: string) {
    const result = importComposition(candidateText);
    if (result.ok) {
      setErrors([]);
      setWarnings(result.warnings);
      onImport(result.composition);
    } else {
      setErrors(result.errors);
      setWarnings([]);
    }
    return result.ok;
  }

  // Debounced so free-form typing/pasting doesn't validate on every
  // keystroke — the example buttons and file upload validate immediately.
  useEffect(() => {
    const handle = setTimeout(() => runImport(text), VALIDATE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    onErrorsChange(errors.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  function handleLoadGeometryExample() {
    const sampleText = JSON.stringify(sampleComposition, null, 2);
    showText(sampleText, "geometry");
    runImport(sampleText);
  }

  function isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(".zip") || /zip/.test(file.type);
  }

  async function handleJsonFileSelected(file: File) {
    // Checked before reading, and leaves the editor's current text alone.
    const sizeError = jsonFileSizeError(file);
    if (sizeError) {
      setErrors([sizeError]);
      setWarnings([]);
      return;
    }
    try {
      const content = await file.text();
      showText(content);
      runImport(content);
    } catch {
      setErrors(["Couldn't read that file — try again or paste the JSON directly."]);
    }
  }

  async function handleZipFileSelected(file: File, example: Example | null = null) {
    try {
      const result = await importZip(file);
      if (result.ok) {
        setErrors([]);
        setWarnings(result.warnings);
        showText(JSON.stringify(result.composition, null, 2), example);
        onImportZip(result.composition, result.assetUrls);
      } else {
        setErrors(result.errors);
        setWarnings([]);
      }
    } catch {
      setErrors(["Couldn't read that ZIP — try again or use a different export."]);
    }
  }

  async function handleLoadCollageExample() {
    setLoadingAction("collage");
    try {
      const response = await fetch(collageZipUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const file = new File([await response.blob()], "collage.zip", { type: "application/zip" });
      await handleZipFileSelected(file, "collage");
    } catch {
      setErrors(["Couldn't load the collage example — try again, or upload a ZIP instead."]);
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleFileSelected(file: File) {
    setLoadingAction("upload");
    try {
      if (isZipFile(file)) {
        await handleZipFileSelected(file);
      } else {
        await handleJsonFileSelected(file);
      }
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <section className={styles.panel} aria-label="Composition JSON">
      <div className={styles.actions}>
        <FileUploadButton
          accept=".json,application/json,.zip,application/zip"
          disabled={isBusy}
          loading={loadingAction === "upload"}
          loadingLabel="Reading file…"
          onFileSelected={handleFileSelected}
        >
          Upload .json or .zip
        </FileUploadButton>
        <Button
          variant="secondary"
          onClick={handleLoadCollageExample}
          disabled={isBusy || loadedExample === "collage"}
          loading={loadingAction === "collage"}
          loadingLabel="Loading example…"
        >
          Load collage example
          {loadedExample === "collage" && <span className="visually-hidden"> (loaded)</span>}
        </Button>
        <Button
          variant="secondary"
          onClick={handleLoadGeometryExample}
          disabled={isBusy || loadedExample === "geometry"}
        >
          Load geometry example
          {loadedExample === "geometry" && <span className="visually-hidden"> (loaded)</span>}
        </Button>
      </div>

      {/* The busy button shows this visually; this announces it to screen readers. */}
      <p role="status" className="visually-hidden">
        {loadingAction === "upload" && "Reading file…"}
        {loadingAction === "collage" && "Loading collage example…"}
      </p>

      <MessageList messages={errors} tone="error" />
      <MessageList messages={warnings} tone="warning" />

      <div className={styles.jsonGroup}>
        {/* Named by JsonEditor's own aria-label, so no visible label. */}
        <JsonEditor value={text} onChange={(edited) => showText(edited)} />
      </div>
    </section>
  );
}
