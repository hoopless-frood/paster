import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import type { HeaderProps } from "./Header.types";
import { Wordmark } from "./Wordmark";
import styles from "./Header.module.css";

export type { HeaderProps } from "./Header.types";

// BASE_URL keeps these working if the playground is ever served from a subpath.
const PLAYGROUND_URL = import.meta.env.BASE_URL;
const ABOUT_URL = `${import.meta.env.BASE_URL}about/`;

export function Header({ currentPage }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.heading}>
        <a
          href={PLAYGROUND_URL}
          className={styles.home}
          aria-current={currentPage === "playground" ? "page" : undefined}
        >
          <Wordmark className={styles.wordmark} />
          <span className="visually-hidden">Paster</span>
        </a>
      </h1>
      <div className={styles.right}>
        <div className={styles.nav}>
          <a
            href={ABOUT_URL}
            className={styles.about}
            aria-current={currentPage === "about" ? "page" : undefined}
          >
            <span aria-hidden="true">?</span>
            <span className="visually-hidden">About Paster</span>
          </a>
          <a href="https://www.annapearson.dev/" target="_blank" rel="noreferrer">
            ATP
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
          <a href="https://github.com/hoopless-frood/paster" target="_blank" rel="noreferrer">
            GitHub
            <span className="visually-hidden">(opens in a new tab)</span>
          </a>
        </div>
        <div className={styles.utils}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
