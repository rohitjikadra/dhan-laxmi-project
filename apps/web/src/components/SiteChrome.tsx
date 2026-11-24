import Link from "next/link";
import styles from "../app/ui.module.css";

export function SiteNav({
  right,
  brandHref = "/",
}: {
  right?: React.ReactNode;
  brandHref?: string;
}) {
  return (
    <nav className={styles.nav}>
      <Link href={brandHref} className={styles.brand}>
        Dhanlaxmi Business Hub
      </Link>
      <div className={styles.navLinks}>
        <Link href="/install" className={styles.muted}>
          Install
        </Link>
        <Link href="/about" className={styles.muted}>
          About
        </Link>
        {right}
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.siteFooter}>
      <p>
        Not affiliated with Dhanlaxmi. Read-only calculate from the table you
        already see after login. We do not store your Dhanlaxmi password.
      </p>
      <p className={styles.footerLinks}>
        <Link href="/privacy">Privacy</Link>
        <Link href="/about">About</Link>
        <Link href="/install">Install extension</Link>
      </p>
    </footer>
  );
}
