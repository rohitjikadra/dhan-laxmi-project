"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/client-auth";
import styles from "../app/ui.module.css";

/** Nav CTAs: logged-in → Dashboard only; logged-out → Login / Register. */
export function AuthCta({
  guest = "both",
}: {
  guest?: "login" | "register" | "both";
}) {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, []);

  if (authed === null) return null;

  if (authed) {
    return (
      <Link href="/dashboard" className={`${styles.btn} ${styles.btnPrimary}`}>
        Dashboard
      </Link>
    );
  }

  return (
    <>
      {(guest === "login" || guest === "both") && (
        <Link href="/login" className={`${styles.btn} ${styles.btnGhost}`}>
          Login
        </Link>
      )}
      {(guest === "register" || guest === "both") && (
        <Link href="/register" className={`${styles.btn} ${styles.btnPrimary}`}>
          Register
        </Link>
      )}
    </>
  );
}
