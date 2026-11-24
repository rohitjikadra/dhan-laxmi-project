"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/SiteChrome";
import { getToken } from "@/lib/client-auth";
import styles from "./page.module.css";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <div className={styles.page}>
        <main className={styles.main}>
          <p className={styles.brand}>Dhanlaxmi Business Hub</p>
          <p className={styles.lead}>Loading…</p>
        </main>
      </div>
    );
  }

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
