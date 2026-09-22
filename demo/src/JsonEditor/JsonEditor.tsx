import { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { JsonEditorProps } from "./JsonEditor.types";
import styles from "./JsonEditor.module.css";

export type { JsonEditorProps } from "./JsonEditor.types";

// References the app's own theme tokens (rather than a fixed palette) so the
// editor's highlighting adapts to light/dark automatically, same as every
// other themed element.
const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--paster-color-magenta-haze)" },
  { tag: tags.string, color: "var(--paster-text)" },
  { tag: tags.number, color: "var(--paster-color-wisteria)" },
  { tag: [tags.bool, tags.null], color: "var(--paster-color-magenta-haze)", fontWeight: 600 },
  { tag: [tags.punctuation, tags.separator, tags.squareBracket, tags.brace], color: "var(--paster-muted)" },
]);

const chromeTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--paster-bg)",
    color: "var(--paster-text)",
    border: "2px solid var(--paster-border)",
    transition: "border-color var(--paster-transition)",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--paster-accent-text)",
  },
  ".cm-content, .cm-gutters": {
    backgroundColor: "var(--paster-bg)",
  },
  ".cm-gutters": {
    color: "var(--paster-muted)",
    border: "none",
  },
  ".cm-scroller": {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "0.8rem",
  },
});

export function JsonEditor({ id, value, onChange, className, spellCheck = true }: JsonEditorProps) {
  const extensions = useMemo(
    () => [
      json(),
      syntaxHighlighting(highlightStyle),
      chromeTheme,
      // Sets the id/aria-label on the actual contenteditable region, so a
      // <label htmlFor={id}> focuses the editor the way it would a textarea.
      EditorView.contentAttributes.of({
        ...(id ? { id } : {}),
        "aria-label": "Composition JSON",
        spellcheck: String(spellCheck),
      }),
    ],
    [id, spellCheck],
  );

  return (
    <CodeMirror
      className={className ? `${styles.editor} ${className}` : styles.editor}
      value={value}
      height="100%"
      basicSetup={{ foldGutter: false }}
      extensions={extensions}
      onChange={onChange}
    />
  );
}
