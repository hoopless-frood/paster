import { useEffect, useId, useState } from "react";
import { Button } from "../Button/Button";
import { FileUploadButton } from "../FileUploadButton/FileUploadButton";
import { JsonEditor } from "../JsonEditor/JsonEditor";
import { MessageList } from "../MessageList/MessageList";
import { importComposition } from "./import-composition";
import { importZip } from "./import-zip";
import type { JsonPanelProps } from "./JsonPanel.types";
import styles from "./JsonPanel.module.css";

export type { JsonPanelProps } from "./JsonPanel.types";

const VALIDATE_DEBOUNCE_MS = 400;

export function JsonPanel({ sampleComposition, onImport, onImportZip, onErrorsChange }: JsonPanelProps) {
  const [text, setText] = useState(() => JSON.stringify(sampleComposition, null, 2));
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const textareaId = useId();

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
  // keystroke — Load sample and file upload still validate immediately.
  useEffect(() => {
    const handle = setTimeout(() => runImport(text), VALIDATE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  useEffect(() => {
    onErrorsChange(errors.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  function handleLoadSample() {
    const sampleText = JSON.stringify(sampleComposition, null, 2);
    setText(sampleText);
    runImport(sampleText);
  }

  async function handleFileSelected(file: File) {
    setIsReadingFile(true);
    try {
      const content = await file.text();
      setText(content);
      runImport(content);
    } catch {
      setErrors(["Couldn't read that file — try again or paste the JSON directly."]);
    } finally {
      setIsReadingFile(false);
    }
  }

  async function handleZipSelected(file: File) {
    setIsReadingFile(true);
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
    } finally {
      setIsReadingFile(false);
    }
  }

  return (
    <section className={styles.panel} aria-label="Composition JSON">
      <div className={styles.actions}>
        <Button onClick={handleLoadSample} disabled={isReadingFile}>
          Load sample JSON
        </Button>
        <FileUploadButton
          accept=".json,application/json"
          disabled={isReadingFile}
          onFileSelected={handleFileSelected}
        >
          Upload .json file
        </FileUploadButton>
        <FileUploadButton accept=".zip,application/zip" disabled={isReadingFile} onFileSelected={handleZipSelected}>
          Upload .zip export
        </FileUploadButton>
      </div>

      {isReadingFile && (
        <p role="status" className={styles.status}>
          Reading file…
        </p>
      )}

      <MessageList messages={errors} tone="error" />
      <MessageList messages={warnings} tone="warning" />

      <div className={styles.jsonGroup}>
        <label htmlFor={textareaId}>Current JSON:</label>
        <JsonEditor id={textareaId} value={text} onChange={setText} spellCheck={false} />
      </div>
    </section>
  );
}
