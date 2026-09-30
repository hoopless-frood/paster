/**
 * Keeps the JSON tab's state across page loads in the same browser tab, so
 * visiting the About page (a separate page) and coming back, or reloading,
 * doesn't lose the composition. Text goes in sessionStorage, which ends with
 * the tab; an uploaded ZIP's bytes go in IndexedDB, since its images only
 * exist as in-memory blob URLs that die with the page.
 *
 * Storage can be unavailable (private browsing, blocked site data, quota),
 * so every read and write fails quietly: the playground then starts fresh.
 */

export type Example = "collage" | "geometry";

/** Where the current images came from, so they can be restored: the bundled collage, or the user's own upload. */
export type ZipSource = "collage" | "upload";

export interface SavedSession {
  text: string;
  loadedExample: Example | null;
  zipSource: ZipSource | null;
}

const SESSION_KEY = "paster:playground";

/** Parses what was saved, or null if it's missing or not in the expected shape. */
export function parseSavedSession(raw: string | null): SavedSession | null {
  if (raw === null) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) {
      return null;
    }
    const { text, loadedExample, zipSource } = value as Record<string, unknown>;
    if (typeof text !== "string") {
      return null;
    }
    return {
      text,
      loadedExample: loadedExample === "collage" || loadedExample === "geometry" ? loadedExample : null,
      zipSource: zipSource === "collage" || zipSource === "upload" ? zipSource : null,
    };
  } catch {
    return null;
  }
}

export function loadSession(): SavedSession | null {
  try {
    return parseSavedSession(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session: SavedSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Unavailable or over quota: the tab just won't be restored.
  }
}

const DB_NAME = "paster-playground";
const STORE = "files";
const UPLOADED_ZIP_KEY = "uploaded-zip";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = run(transaction.objectStore(STORE));
    transaction.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

/** Keeps only the latest upload; each new one replaces it. */
export async function saveUploadedZip(file: File): Promise<void> {
  try {
    await withStore("readwrite", (store) => store.put(file, UPLOADED_ZIP_KEY));
  } catch {
    // The images just won't come back after a page load.
  }
}

export async function loadUploadedZip(): Promise<File | null> {
  try {
    const stored = await withStore<unknown>("readonly", (store) => store.get(UPLOADED_ZIP_KEY));
    if (stored instanceof File) {
      return stored;
    }
    return stored instanceof Blob ? new File([stored], "upload.zip", { type: "application/zip" }) : null;
  } catch {
    return null;
  }
}
