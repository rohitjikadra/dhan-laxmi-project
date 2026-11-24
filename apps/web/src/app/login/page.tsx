"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/SiteChrome";
import { apiFetch, setToken } from "@/lib/client-auth";
import styles from "../ui.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          Dhanlaxmi Business Hub
        </Link>
        <div className={styles.navLinks}>
          <Link href="/register" className={`${styles.btn} ${styles.btnGhost}`}>
            Register
          </Link>
        </div>
      </nav>
      <div className={styles.center}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.lead}>
          Website account. Do not use your Dhanlaxmi password.
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
            Password
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            type="submit"
            disabled={busy}
          >
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}
