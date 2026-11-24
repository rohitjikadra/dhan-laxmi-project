import { AuthCta } from "@/components/AuthCta";
import { SiteFooter, SiteNav } from "@/components/SiteChrome";
import styles from "../ui.module.css";

export const metadata = {
  title: "About — Dhanlaxmi Business Hub",
};

export default function AboutPage() {
  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <SiteNav right={<AuthCta guest="register" />} />
      <div className={styles.main}>
        <h1 className={styles.title}>About</h1>
        <p className={styles.lead}>
          This is not an official Dhanlaxmi product.
        </p>
        <div className={styles.prose}>
          <h2>What it does</h2>
          <ul>
            <li>Reads the Product Wise Business table and calculates totals. Read-only.</li>
            <li>
              Applies rules for <code>total_business</code>, and uses the site
              Total row for <code>turnover</code>
            </li>
            <li>Shows several Dhanlaxmi accounts on your website</li>
          </ul>
          <h2>What it does not do</h2>
          <ul>
            <li>Auto-login on Dhanlaxmi, or saving that password</li>
            <li>Changing the site UI, bypassing Cloudflare, or desktop automation</li>
            <li>Ads inside the extension</li>
          </ul>
          <h2>Upsert policy</h2>
          <p>
            Same website user, same DL account, and the same date range: a new
            Calculate <strong>updates</strong> the existing row. It does not
            create a duplicate.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
