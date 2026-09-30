import { json } from "@codemirror/lang-json";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers } from "@codemirror/view";
import { tags } from "@lezer/highlight";

// Same colors as the playground's JsonEditor, via the shared theme tokens,
// so JSON reads identically in both and follows light/dark.
const highlightStyle = HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--paster-color-magenta-haze)" },
  { tag: tags.string, color: "var(--paster-text)" },
  { tag: tags.number, color: "var(--paster-color-wisteria)" },
  { tag: [tags.bool, tags.null], color: "var(--paster-color-magenta-haze)", fontWeight: 600 },
  { tag: [tags.punctuation, tags.separator, tags.squareBracket, tags.brace], color: "var(--paster-muted)" },
]);

const theme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "var(--paster-bg)",
    color: "var(--paster-text)",
    // Only a top border: the view runs to the window's other three edges.
    borderTop: "1px solid var(--paster-border)",
  },
  "&.cm-focused": {
    outline: "none",
    borderTopColor: "var(--paster-accent-text)",
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
    fontSize: "11px",
  },
});

/** A read-only, syntax-highlighted JSON view that fills its parent. */
export function createJsonView(parent: HTMLElement): { setText(text: string): void } {
  const view = new EditorView({
    parent,
    state: EditorState.create({
      extensions: [
        json(),
        syntaxHighlighting(highlightStyle),
        lineNumbers(),
        theme,
        EditorState.readOnly.of(true),
        EditorView.contentAttributes.of({ "aria-label": "Generated composition JSON" }),
      ],
    }),
  });

  return {
    setText(text) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
  };
}
