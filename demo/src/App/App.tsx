import { sampleComposition, type Composition } from "@paster/core";
import { useEffect, useState } from "react";
import { Header } from "../Header/Header";
import { JsonPanel } from "../JsonPanel/JsonPanel";
import { PreviewPanel } from "../PreviewPanel/PreviewPanel";
import { Tabs } from "../Tabs/Tabs";
import styles from "./App.module.css";

type TabId = "json" | "preview";

const TABS: { id: TabId; label: string }[] = [
  { id: "json", label: "JSON" },
  { id: "preview", label: "Preview" },
];

function readTabFromUrl(): TabId {
  const view = new URLSearchParams(window.location.search).get("view");
  return TABS.some((tab) => tab.id === view) ? (view as TabId) : "json";
}

export function App() {
  const [composition, setComposition] = useState<Composition>(sampleComposition);
  const [activeTab, setActiveTab] = useState<TabId>(readTabFromUrl);
  const [jsonHasErrors, setJsonHasErrors] = useState(false);

  // Reflects the active tab as ?view= so it's shareable. replaceState, not
  // push: a tab switch isn't a new "page" for back/forward to step through.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", activeTab);
    window.history.replaceState(null, "", url);
  }, [activeTab]);

  return (
    <main className={styles.app}>
      <Header />

      <Tabs
        label="Paster demo views"
        tabs={TABS.map((tab) => ({ ...tab, hasError: tab.id === "json" && jsonHasErrors }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div
        id="panel-json"
        role="tabpanel"
        aria-labelledby="tab-json"
        hidden={activeTab !== "json"}
        className={styles.tabPanel}
      >
        <JsonPanel
          sampleComposition={sampleComposition}
          onImport={setComposition}
          onErrorsChange={setJsonHasErrors}
        />
      </div>

      <div
        id="panel-preview"
        role="tabpanel"
        aria-labelledby="tab-preview"
        hidden={activeTab !== "preview"}
        className={styles.tabPanel}
      >
        <PreviewPanel composition={composition} />
      </div>
    </main>
  );
}
