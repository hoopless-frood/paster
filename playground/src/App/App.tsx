import { sampleComposition, type Composition } from "@paster/core";
import { useEffect, useRef, useState } from "react";
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
  // Path -> blob: URL, populated by importing a ZIP export. Plain JSON edits
  // (typing, pasting, a .json upload) leave this untouched, so images from a
  // previously imported ZIP survive ordinary tweaks to the same composition.
  const [assetUrls, setAssetUrls] = useState<Map<string, string>>(new Map());
  // Mirrors assetUrls so the unmount-only cleanup below can revoke whatever
  // is *currently* held rather than whatever existed when that effect was
  // first set up (an effect with an empty dependency array only ever sees
  // the state from its first render).
  const assetUrlsRef = useRef(assetUrls);
  assetUrlsRef.current = assetUrls;
  const [activeTab, setActiveTab] = useState<TabId>(readTabFromUrl);
  const [jsonHasErrors, setJsonHasErrors] = useState(false);

  // Reflects the active tab as ?view= so it's shareable. replaceState, not
  // push: a tab switch isn't a new "page" for back/forward to step through.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", activeTab);
    window.history.replaceState(null, "", url);
  }, [activeTab]);

  // Revokes every object URL currently held, on unmount only — a fresh ZIP
  // import revokes its own predecessor directly (see handleImportZip),
  // rather than through this effect re-running.
  useEffect(() => {
    return () => {
      assetUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function handleImportZip(nextComposition: Composition, nextAssetUrls: Map<string, string>) {
    assetUrls.forEach((url) => URL.revokeObjectURL(url));
    setComposition(nextComposition);
    setAssetUrls(nextAssetUrls);
  }

  return (
    <main className={styles.app}>
      <Header />

      <Tabs
        label="Paster playground views"
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
          onImportZip={handleImportZip}
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
        <PreviewPanel composition={composition} assetUrls={assetUrls} />
      </div>
    </main>
  );
}
