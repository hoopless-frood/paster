import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import { Wordmark } from "./Wordmark";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.heading}>
        <Wordmark className={styles.wordmark} />
        <span className="visually-hidden">Paster</span>
      </h1>
      <div className={styles.right}>
        <div className={styles.nav}>
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
