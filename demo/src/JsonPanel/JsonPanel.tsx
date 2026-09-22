import { useEffect, useId, useState } from "react";
import { Button } from "../Button/Button";
import { FileUploadButton } from "../FileUploadButton/FileUploadButton";
import { MessageList } from "../MessageList/MessageList";
import { TextArea } from "../TextArea/TextArea";
import { importComposition } from "./import-composition";
import type { JsonPanelProps } from "./JsonPanel.types";
import styles from "./JsonPanel.module.css";

export type { JsonPanelProps } from "./JsonPanel.types";

const VALIDATE_DEBOUNCE_MS = 400;

export function JsonPanel({ sampleComposition, onImport, onErrorsChange }: JsonPanelProps) {
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
        <TextArea
          id={textareaId}
          className={styles.jsonInput}
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
        />
      </div>
    </section>
  );
}
