"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/SiteChrome";
import { apiFetch, getToken, setToken } from "@/lib/client-auth";
import styles from "../ui.module.css";

type LoginResponse = {
  token?: string;
  needsTotp?: boolean;
  challengeToken?: string;
  needsTotpSetup?: boolean;
  setupToken?: string;
  email?: string;
};

type Step =
  | { name: "password" }
  | { name: "code"; challengeToken: string; email: string }
  | {
      name: "setup";
      setupToken: string;
      email: string;
      qrDataUrl: string;
      secret: string;
    };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>({ name: "password" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace("/dashboard");
      return;
    }
    setReady(true);
  }, [router]);

  async function onPassword(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (data.token) {
        setToken(data.token);
        router.push("/dashboard");
        return;
      }
      if (data.needsTotpSetup && data.setupToken) {
        const setup = await apiFetch<{ qrDataUrl: string; secret: string }>(
          "/api/auth/totp/setup",
          {
            method: "POST",
            body: JSON.stringify({ setupToken: data.setupToken }),
          }
        );
        setStep({
          name: "setup",
          setupToken: data.setupToken,
          email: data.email || email,
          qrDataUrl: setup.qrDataUrl,
          secret: setup.secret,
        });
        setCode("");
        return;
      }
      if (data.needsTotp && data.challengeToken) {
        setStep({
          name: "code",
          challengeToken: data.challengeToken,
          email: data.email || email,
        });
        setCode("");
        return;
      }
      throw new Error("Login failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCode(e: FormEvent) {
    e.preventDefault();
    if (step.name !== "code") return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/totp", {
        method: "POST",
        body: JSON.stringify({
          challengeToken: step.challengeToken,
          code,
        }),
      });
      setToken(data.token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code rejected");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirm(e: FormEvent) {
    e.preventDefault();
    if (step.name !== "setup") return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ token: string }>("/api/auth/totp/confirm", {
        method: "POST",
        body: JSON.stringify({ setupToken: step.setupToken, code }),
      });
      setToken(data.token);
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Code rejected");
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
          <Link href="/register" className={`${styles.btn} ${styles.btnGhost}`}>
            Register
          </Link>
        </div>
      </nav>
      <div className={styles.center}>
        {step.name === "password" ? (
          <>
            <h1 className={styles.title}>Login</h1>
            <p className={styles.lead}>
              Website account. Do not use your Dhanlaxmi password.
            </p>
            <form className={styles.form} onSubmit={onPassword}>
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
          </>
        ) : null}

        {step.name === "setup" ? (
          <>
            <h1 className={styles.title}>Set up authenticator</h1>
            <p className={styles.lead}>
              Scan this QR in Google Authenticator for {step.email}. After this,
              the password alone cannot open the admin panel.
            </p>
            <img
              src={step.qrDataUrl}
              alt="Google Authenticator QR code"
              width={220}
              height={220}
            />
            <p className={styles.note}>
              Manual key: <code>{step.secret}</code>
            </p>
            <form className={styles.form} onSubmit={onConfirm}>
              <label className={styles.label}>
                6-digit code
                <input
                  className={styles.input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={busy}
              >
                {busy ? "Checking…" : "Enable authenticator"}
              </button>
            </form>
          </>
        ) : null}

        {step.name === "code" ? (
          <>
            <h1 className={styles.title}>Authenticator code</h1>
            <p className={styles.lead}>
              Enter the 6-digit code from Google Authenticator for {step.email}.
            </p>
            <form className={styles.form} onSubmit={onCode}>
              <label className={styles.label}>
                6-digit code
                <input
                  className={styles.input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  minLength={6}
                  maxLength={7}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              {error ? <p className={styles.error}>{error}</p> : null}
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                type="submit"
                disabled={busy}
              >
                {busy ? "Checking…" : "Continue"}
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                type="button"
                onClick={() => {
                  setStep({ name: "password" });
                  setCode("");
                  setError(null);
                }}
              >
                Back
              </button>
            </form>
          </>
        ) : null}
      </div>
      <SiteFooter />
    </div>
  );
}
