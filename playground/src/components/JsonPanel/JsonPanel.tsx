import { useEffect, useState } from "react";
import { Button } from "../Button/Button";
import { FileUploadButton } from "../FileUploadButton/FileUploadButton";
import { JsonEditor } from "../JsonEditor/JsonEditor";
import { MessageList } from "../MessageList/MessageList";
import { importComposition } from "./import-composition";
import { importZip } from "./import-zip";
// Bundled by Vite, so the example also works on the hosted playground.
import collageZipUrl from "../../../../examples/collage/collage.zip?url";
import type { JsonPanelProps } from "./JsonPanel.types";
import styles from "./JsonPanel.module.css";

export type { JsonPanelProps } from "./JsonPanel.types";

const VALIDATE_DEBOUNCE_MS = 400;

export function JsonPanel({ sampleComposition, onImport, onImportZip, onErrorsChange }: JsonPanelProps) {
  const [text, setText] = useState(() => JSON.stringify(sampleComposition, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
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
    setText(sampleText);
    runImport(sampleText);
  }

  function isZipFile(file: File): boolean {
    return file.name.toLowerCase().endsWith(".zip") || /zip/.test(file.type);
  }

  async function handleJsonFileSelected(file: File) {
    try {
      const content = await file.text();
      setText(content);
      runImport(content);
    } catch {
      setErrors(["Couldn't read that file — try again or paste the JSON directly."]);
    }
  }

  async function handleZipFileSelected(file: File) {
    try {
      const result = await importZip(file);
      if (result.ok) {
        setErrors([]);
        setWarnings(result.warnings);
        setText(JSON.stringify(result.composition, null, 2));
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
    setIsReadingFile(true);
    try {
      const response = await fetch(collageZipUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const file = new File([await response.blob()], "collage.zip", { type: "application/zip" });
      await handleZipFileSelected(file);
    } catch {
      setErrors(["Couldn't load the collage example — try again, or upload a ZIP instead."]);
    } finally {
      setIsReadingFile(false);
    }
  }

  async function handleFileSelected(file: File) {
    setIsReadingFile(true);
    try {
      if (isZipFile(file)) {
        await handleZipFileSelected(file);
      } else {
        await handleJsonFileSelected(file);
      }
    } finally {
      setIsReadingFile(false);
    }
  }

  return (
    <section className={styles.panel} aria-label="Composition JSON">
      <div className={styles.actions}>
        <FileUploadButton
          accept=".json,application/json,.zip,application/zip"
          disabled={isReadingFile}
          onFileSelected={handleFileSelected}
        >
          Upload .json or .zip
        </FileUploadButton>
        <Button variant="secondary" onClick={handleLoadCollageExample} disabled={isReadingFile}>
          Load collage example
        </Button>
        <Button variant="secondary" onClick={handleLoadGeometryExample} disabled={isReadingFile}>
          Load geometry example
        </Button>
      </div>

      {isReadingFile && (
        <p role="status" className={styles.status}>
          Reading file…
        </p>
      )}

      <MessageList messages={errors} tone="error" />
      <MessageList messages={warnings} tone="warning" />

      <div className={styles.jsonGroup}>
        {/* Named by JsonEditor's own aria-label, so no visible label. */}
        <JsonEditor value={text} onChange={setText} spellCheck={false} />
      </div>
    </section>
  );
}
