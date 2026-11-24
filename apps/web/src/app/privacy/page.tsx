import Link from "next/link";
import { SiteFooter, SiteNav } from "@/components/SiteChrome";
import styles from "../ui.module.css";

export const metadata = {
  title: "Privacy — Dhanlaxmi Business Hub",
};

export default function PrivacyPage() {
  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <SiteNav
        right={
          <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
            Login
          </Link>
        }
      />
      <div className={styles.main}>
        <h1 className={styles.title}>Privacy</h1>
        <p className={styles.lead}>Short policy for this tool (v1).</p>
        <div className={styles.prose}>
          <h2>What we store</h2>
          <ul>
            <li>Website account: email + password hash (bcrypt).</li>
            <li>
              Captures: Dhanlaxmi account id and name from the page, date range,{" "}
              <code>total_business</code>, <code>turnover</code>, ignored/half
              product lists.
            </li>
            <li>Extension: website JWT in <code>chrome.storage.local</code>.</li>
          </ul>
          <h2>What we never store</h2>
          <ul>
            <li>Dhanlaxmi password, cookies, or full page HTML.</li>
            <li>Anything that lets us log into Dhanlaxmi on your behalf.</li>
          </ul>
          <h2>How calculation works</h2>
          <p>
            The extension only reads the table you already see in the browser
            after Search. Rules run locally. The result is saved to your
            website account.
          </p>
          <h2>Contact / delete</h2>
          <p>
            To delete your website account data, send a manual request for now.
            A delete-account API will come later.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
