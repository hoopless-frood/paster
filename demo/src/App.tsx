import { sampleComposition } from "@paster/core";
import { PasterComposition, type ItemContentResolver } from "@paster/react";
import styles from "./App.module.css";

// Placeholder boxes stand in for real images — Figma image export isn't
// implemented yet (see PLAN.md M6), so there's nothing to render as an
// <img> here. These are decorative labels, not images, so no alt text
// decision applies; @paster/react never invents alt text on your behalf.
const resolveContent: ItemContentResolver = (item) => (
  <div className={styles.itemPlaceholder}>{item.name ?? item.id}</div>
);

export function App() {
  return (
    <main className={styles.app}>
      <h1>Paster</h1>
      <p>
        Composition preview playground — a full interactive playground (JSON
        import, viewport controls) is coming in a later milestone. This
        renders <code>@paster/core</code>&rsquo;s sample composition with{" "}
        <code>@paster/react</code>; resize your browser window to see the
        layout switch breakpoints.
      </p>
      <PasterComposition
        composition={sampleComposition}
        resolveContent={resolveContent}
        className={styles.composition}
      />
    </main>
  );
}
