import Link from "next/link";
import { PRODUCTION_WEBSITE_URL } from "@dlbh/shared";
import { AuthCta } from "@/components/AuthCta";
import { SiteFooter, SiteNav } from "@/components/SiteChrome";
import styles from "../ui.module.css";

export const metadata = {
  title: "Install extension — Dhanlaxmi Business Hub",
};

export default function InstallPage() {
  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <SiteNav right={<AuthCta guest="both" />} />
      <div className={styles.main}>
        <h1 className={styles.title}>Install Chrome extension</h1>
        <p className={styles.lead}>
          Manual install for now (zip). Chrome Web Store later.
        </p>
        <div className={styles.prose}>
          <h2>Download &amp; install</h2>
          <p style={{ marginBottom: "1rem" }}>
            <a
              className={`${styles.btn} ${styles.btnPrimary}`}
              href="/api/extension/download"
              download="dhanlaxmi-business-hub-extension.zip"
            >
              Download extension zip
            </a>
          </p>
          <p className={styles.note}>
            Agar button kaam na kare:{" "}
            <a href="/extension/dhanlaxmi-business-hub-extension.zip">
              direct zip link
            </a>{" "}
            → right-click → Save link as…
          </p>
          <ol>
            <li>Zip download karke extract karo</li>
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
