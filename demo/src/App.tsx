import { COMPOSITION_SCHEMA_VERSION } from "@paster/core";
import { PasterPlaceholder } from "@paster/react";
import styles from "./App.module.css";

export function App() {
  return (
    <main className={styles.app}>
      <h1>Paster</h1>
      <p>Composition preview playground — coming in a later milestone.</p>
      <PasterPlaceholder />
      <p className={styles.meta}>Composition schema version: {COMPOSITION_SCHEMA_VERSION}</p>
    </main>
  );
}
