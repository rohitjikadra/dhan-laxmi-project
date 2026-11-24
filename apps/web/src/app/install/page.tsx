import Link from "next/link";
import { PRODUCTION_WEBSITE_URL } from "@dlbh/shared";
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
          Manual install for now (zip). Chrome Web Store later.
        </p>
        <div className={styles.prose}>
          <h2>Download &amp; install</h2>
          <ol>
            <li>
              <a href="/extension/dhanlaxmi-business-hub-extension.zip" download>
                Download extension zip
              </a>
            </li>
            <li>Extract the zip to a folder on your computer</li>
            <li>
              Chrome → <code>chrome://extensions</code> → Developer mode ON
            </li>
            <li>
              <strong>Load unpacked</strong> → select the extracted folder
            </li>
          </ol>
          <h2>Use</h2>
          <ol>
            <li>
              <Link href="/register">Register or log in</Link> on this website
            </li>
            <li>
              Extension popup me same website account se login (API base default:{" "}
              <code>{PRODUCTION_WEBSITE_URL}</code>)
            </li>
            <li>
              Dhanlaxmi → Product Wise Business → From/To → <strong>Search</strong>
            </li>
            <li>
              Popup → <strong>Calculate &amp; Save</strong>
            </li>
          </ol>
          <h2>Dev (optional)</h2>
          <ol>
            <li>
              Repo me <code>npm run build:extension</code>
            </li>
            <li>
              Load unpacked → <code>apps/extension/dist</code>
            </li>
            <li>
              Local API ke liye popup me API base{" "}
              <code>http://localhost:3000</code> set karo
            </li>
          </ol>
          <p className={styles.note} style={{ marginTop: "1rem" }}>
            If the account id is not filled in, type it in the popup. If the
            table is missing, run Search first. Purani extension reload/update
            karo after reinstall so production API permissions apply.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
