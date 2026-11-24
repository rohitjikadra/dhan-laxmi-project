import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/SiteChrome";
import styles from "../ui.module.css";

export const metadata = {
  title: "Install extension — Dhanlaxmi Business Hub",
};

export default function InstallPage() {
  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <SiteNav
        right={
          <Link href="/dashboard" className={`${styles.btn} ${styles.btnGhost}`}>
            Dashboard
          </Link>
        }
      />
      <div className={styles.main}>
        <h1 className={styles.title}>Install Chrome extension</h1>
        <p className={styles.lead}>
          Manual install for now (unpacked or zip). Chrome Web Store later.
        </p>
        <div className={styles.prose}>
          <h2>Dev (Load unpacked)</h2>
          <ol>
            <li>
              In the repo, run <code>npm run build:extension</code>
            </li>
            <li>
              Chrome → <code>chrome://extensions</code> → Developer mode ON
            </li>
            <li>
              <strong>Load unpacked</strong> → <code>apps/extension/dist</code>
            </li>
          </ol>
          <h2>Zip install</h2>
          <ol>
            <li>
              <code>npm run zip:extension</code> →{" "}
              <code>apps/extension/dhanlaxmi-business-hub-extension.zip</code>
            </li>
            <li>
              Extract the zip, then choose that folder with Load unpacked
            </li>
          </ol>
          <h2>Use</h2>
          <ol>
            <li>
              <Link href="/register">Register or log in</Link> on this website
            </li>
            <li>In the extension popup, log in with the same website account</li>
            <li>
              Dhanlaxmi → Product Wise Business → From/To → <strong>Search</strong>
            </li>
            <li>
              Popup → <strong>Calculate &amp; Save</strong>
            </li>
          </ol>
          <p className={styles.note} style={{ marginTop: "1rem" }}>
            If the account id is not filled in, type it in the popup. If the
            table is missing, run Search first.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
