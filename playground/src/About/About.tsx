import { Header } from "../components/Header/Header";
import styles from "./About.module.css";

const REPO_URL = "https://github.com/hoopless-frood/paster";
const DOCS_URL = `${REPO_URL}/blob/main/docs`;

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export function About() {
  return (
    <div className={styles.page}>
      <Header currentPage="about" />

      <main className={styles.content}>
        <h2>About Paster</h2>
        <p>
          Paster turns an art-directed collage designed in Figma into a responsive web layout. You design a
          separate arrangement for each breakpoint, and each one keeps its own composition, with its own
          positions, sizes, stacking and rotation, instead of reflowing into a generic grid.
        </p>

        <h3>How it works</h3>
        <ol>
          <li>
            <strong>Design in Figma.</strong> Make a frame for the composition, with one child frame per
            breakpoint (for example, mobile and desktop). Give the same image the same layer name in each.
          </li>
          <li>
            <strong>Export with the Paster plugin.</strong> Copy the composition as JSON (positions only), or
            export a ZIP with every image too.
          </li>
          <li>
            <strong>Check it here.</strong> Load the JSON or ZIP in this playground and drag the width slider
            to see each breakpoint take over.
          </li>
          <li>
            <strong>Put it on your site.</strong> Render it with the <code>@paster/react</code> component, with
            images and alt text coming from your CMS.
          </li>
        </ol>

        <h3>Using the playground</h3>
        <ul>
          <li>
            On the <strong>JSON</strong> tab, upload a <code>.json</code> or <code>.zip</code> export, or load
            one of the examples. You can also edit the JSON directly.
          </li>
          <li>
            On the <strong>Layout</strong> tab, drag the width slider to preview any screen size, up to desktop
            widths on a phone.
          </li>
          <li>
            Everything stays in your browser. Nothing you upload is sent anywhere.
          </li>
        </ul>

        <h3>Learn more</h3>
        <ul>
          <li>
            <ExternalLink href={`${DOCS_URL}/figma-guide.md`}>Figma guide</ExternalLink>: how to set up a file,
            and what the plugin supports.
          </li>
          <li>
            <ExternalLink href={`${DOCS_URL}/composition-format.md`}>Composition format</ExternalLink>: what the
            exported JSON means.
          </li>
          <li>
            <ExternalLink href={REPO_URL}>Paster on GitHub</ExternalLink>: source code, installing the Figma
            plugin, and example files.
          </li>
        </ul>
      </main>
    </div>
  );
}
