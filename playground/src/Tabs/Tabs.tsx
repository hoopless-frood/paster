import { useRef, type KeyboardEvent } from "react";
import type { TabsProps } from "./Tabs.types";
import styles from "./Tabs.module.css";

export type { Tab, TabsProps } from "./Tabs.types";

export function Tabs<T extends string>({ tabs, activeTab, onTabChange, label }: TabsProps<T>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      onTabChange(tabs[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    }
  }

  return (
    <div role="tablist" aria-label={label} className={styles.tabList} onKeyDown={handleKeyDown}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          ref={(element) => {
            tabRefs.current[index] = element;
          }}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`panel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          className={styles.tab}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.hasError && (
            <>
              <span className={styles.tabBadge} aria-hidden="true">
                !
              </span>
              <span className="visually-hidden"> (has errors)</span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
