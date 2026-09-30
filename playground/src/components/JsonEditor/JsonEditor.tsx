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
  { tag: tags.propertyName, color: "var(--paster-syntax-key)" },
  { tag: tags.string, color: "var(--paster-text)" },
  { tag: tags.number, color: "var(--paster-syntax-number)" },
  { tag: [tags.bool, tags.null], color: "var(--paster-syntax-key)", fontWeight: 600 },
  { tag: [tags.punctuation, tags.separator, tags.squareBracket, tags.brace], color: "var(--paster-muted)" },
]);

const chromeTheme = EditorView.theme({
  // The frame (border, background, focus color) is on the wrapper in
  // JsonEditor.module.css: CodeMirror attaches these styles after its element
  // appears, so a border set here briefly showed, then faded from, its
  // default color on load.
  "&": {
    height: "100%",
    color: "var(--paster-text)",
  },
  "&.cm-focused": {
    outline: "none",
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
  // CodeMirror's own defaults for these assume a light background.
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--paster-text) 6%, transparent)",
  },
  ".cm-activeLineGutter": {
    color: "var(--paster-text)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "color-mix(in srgb, var(--paster-accent-text) 25%, transparent)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--paster-text)",
  },
});

// Module-level, so CodeMirror never sees a new extensions array on re-render.
const extensions = [
  json(),
  syntaxHighlighting(highlightStyle),
  chromeTheme,
  // On the editable region itself, so assistive tech names the editor
  // (there's no visible label); JSON is never spellchecked.
  EditorView.contentAttributes.of({ "aria-label": "Composition JSON", spellcheck: "false" }),
];

export function JsonEditor({ value, onChange }: JsonEditorProps) {
  return (
    <CodeMirror
      className={styles.editor}
      value={value}
      height="100%"
      // No built-in theme: its white background showed (and, with the shared
      // transition, faded) before our own colors applied.
      theme="none"
      basicSetup={{ foldGutter: false }}
      extensions={extensions}
      onChange={onChange}
    />
  );
}
