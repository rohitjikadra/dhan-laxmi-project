"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CaptureRecord,
  CapturesListResponse,
  CapturesSummaryResponse,
} from "@dlbh/shared";
import { apiFetch, clearToken, getToken } from "@/lib/client-auth";
import { downloadCapturesExcel } from "@/lib/download-excel";
import { SiteFooter } from "@/components/SiteChrome";
import styles from "../ui.module.css";

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [summary, setSummary] = useState<CapturesSummaryResponse["items"]>([]);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [filterId, setFilterId] = useState<string | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const me = await apiFetch<{ user: { email: string } }>("/api/me");
    setEmail(me.user.email);
    const [sum, list] = await Promise.all([
      apiFetch<CapturesSummaryResponse>("/api/captures/summary"),
      apiFetch<CapturesListResponse>("/api/captures"),
    ]);
    setSummary(sum.items);
    setCaptures(list.items);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load()
      .catch((err) => {
        clearToken();
        setError(
          err instanceof Error
            ? err.message
            : "Session invalid. Log in again."
        );
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [load, router]);

  const filtered = useMemo(() => {
    if (filterId === "all") return captures;
    return captures.filter((c) => c.dlAccountId === filterId);
  }, [captures, filterId]);

  function logout() {
    clearToken();
    router.push("/login");
  }

  async function onExport() {
    setExporting(true);
    setError(null);
    try {
      await downloadCapturesExcel(filterId === "all" ? undefined : filterId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Excel export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.main}>
          <p className={styles.muted}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.brand}>
          Dhanlaxmi Business Hub
        </Link>
        <div className={styles.navLinks}>
          <Link href="/install" className={styles.muted}>
            Install
          </Link>
          <span className={styles.muted}>{email}</span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </nav>

      <div className={styles.main}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.lead}>
          Each Dhanlaxmi account is separate. Calculate on the same account and
          the same dates updates that row. A later day shows the latest entry
          on the card, not a sum.
        </p>

        <p className={styles.note}>
          Live data comes from the extension.{" "}
          <Link href="/install">Install steps</Link>
        </p>

        <div className={styles.row}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() =>
              load().catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Refresh failed — network?"
                )
              )
            }
          >
            Refresh
          </button>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <h2 className={styles.cardTitle}>Per account</h2>
        {summary.length === 0 ? (
          <div className={styles.empty}>
            <strong>No captures yet.</strong>
            <br />
            Use the extension to Calculate &amp; Save. Steps:{" "}
            <Link href="/install">/install</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {summary.map((item) => (
              <Link
                key={item.dlAccountId}
                href={`/accounts/${encodeURIComponent(item.dlAccountId)}`}
                className={styles.card}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <h2 className={styles.cardTitle}>
                  {item.dlAccountName || item.dlAccountId}
                </h2>
                <p>
                  ID:{" "}
                  <strong style={{ fontSize: "0.95rem" }}>
                    {item.dlAccountId}
                  </strong>
                </p>
                <p>
                  {item.startDate || "—"} → {item.endDate || "—"}
                </p>
                <p>
                  Business: <strong>{formatNum(item.totalBusiness)}</strong>
                </p>
                <p>Turnover: {formatNum(item.turnover)}</p>
                <p>
                  Latest
                  {item.captureCount > 1
                    ? ` · ${item.captureCount} captures`
                    : ""}
                </p>
              </Link>
            ))}
          </div>
        )}

        <div className={styles.sectionHead}>
          <h2 className={styles.cardTitle}>Captures</h2>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            disabled={exporting || filtered.length === 0}
            onClick={() => void onExport()}
          >
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
        </div>
        {summary.length > 0 ? (
          <div className={styles.filterRow}>
            <button
              type="button"
              className={`${styles.chip} ${filterId === "all" ? styles.chipActive : ""}`}
              onClick={() => setFilterId("all")}
            >
              All
            </button>
            {summary.map((item) => (
              <button
                key={item.dlAccountId}
                type="button"
                className={`${styles.chip} ${filterId === item.dlAccountId ? styles.chipActive : ""}`}
                onClick={() => setFilterId(item.dlAccountId)}
              >
                {item.dlAccountName || item.dlAccountId}
              </button>
            ))}
          </div>
        ) : null}

        <div className={styles.tableWrap}>
          {filtered.length === 0 ? (
            <p className={styles.empty}>
              No rows for this filter. Save from the extension, or change the
              filter.
            </p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Dates</th>
                  <th>Business</th>
                  <th>Turnover</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link
                        href={`/accounts/${encodeURIComponent(c.dlAccountId)}`}
                      >
                        {c.dlAccountName || "—"} ({c.dlAccountId})
                      </Link>
                    </td>
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
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
