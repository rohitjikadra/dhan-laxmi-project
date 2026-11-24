import Link from "next/link";
import { SiteFooter } from "@/components/SiteChrome";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <p className={styles.brand}>Dhanlaxmi Business Hub</p>
        <h1>All your accounts&apos; business, on one dashboard.</h1>
        <p className={styles.lead}>
          Log in here, search on Dhanlaxmi, then Calculate &amp; Save with the
          Chrome extension. Read-only. We do not store your Dhanlaxmi password.
        </p>
        <div className={styles.actions}>
          <Link href="/register" className={styles.primary}>
            Register
          </Link>
          <Link href="/login" className={styles.secondary}>
            Login
          </Link>
          <Link href="/install" className={styles.secondary}>
            Install extension
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
