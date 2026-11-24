"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/SiteChrome";
import { apiFetch, getToken, setToken } from "@/lib/client-auth";
import styles from "../ui.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ token?: string; needsTotpSetup?: boolean }>(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        }
      );
      if (data.needsTotpSetup) {
        setNotice(
          "Account created. Log in and scan Google Authenticator before the admin panel opens."
        );
        return;
      }
      if (!data.token) throw new Error("Register failed");
      setToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
        <div className={styles.center}>
          <p className={styles.muted}>Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          Dhanlaxmi Business Hub
        </Link>
        <div className={styles.navLinks}>
          <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
            Login
          </Link>
        </div>
      </nav>
      <div className={styles.center}>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.lead}>
          This is only a website login. The extension saves with this
          account. Do not enter your Dhanlaxmi password.
        </p>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label}>
            Email
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className={styles.label}>
            Password (min 8)
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {notice ? <p className={styles.note}>{notice}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            type="submit"
            disabled={busy}
          >
            {busy ? "Creating…" : "Register"}
          </button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}
