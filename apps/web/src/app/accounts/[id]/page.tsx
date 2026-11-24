"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { CaptureRecord, CapturesListResponse } from "@dlbh/shared";
import { apiFetch, clearToken, getToken } from "@/lib/client-auth";
import { SiteFooter } from "@/components/SiteChrome";
import styles from "../../ui.module.css";

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function AccountPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id || "");
  const router = useRouter();
  const [items, setItems] = useState<CaptureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const list = await apiFetch<CapturesListResponse>(
      `/api/captures?dlAccountId=${encodeURIComponent(id)}`
    );
    setItems(list.items);
  }, [id]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load()
      .catch((err) => {
        clearToken();
        setError(err instanceof Error ? err.message : "Load failed");
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [load, router]);

  const name = items[0]?.dlAccountName;

  return (
    <div
      className={styles.shell}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <nav className={styles.nav}>
        <Link href="/" className={styles.brand}>
          Dhanlaxmi Business Hub
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard" className={`${styles.btn} ${styles.btnGhost}`}>
            Dashboard
          </Link>
        </div>
      </nav>
      <div className={styles.main}>
        <h1 className={styles.title}>{name || id}</h1>
        <p className={styles.lead}>Account id: {id}</p>
        {error ? <p className={styles.error}>{error}</p> : null}
        {loading ? (
          <p className={styles.muted}>Loading…</p>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            No captures for this account. Save from the extension.
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dates</th>
                  <th>Business</th>
                  <th>Turnover</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.startDate || "—"} → {c.endDate || "—"}
                    </td>
                    <td>{formatNum(c.totalBusiness)}</td>
                    <td>{formatNum(c.turnover)}</td>
                    <td>
                      {new Date(c.updatedAt || c.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
