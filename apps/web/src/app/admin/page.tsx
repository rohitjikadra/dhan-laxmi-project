"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CaptureRecord } from "@dlbh/shared";
import { apiFetch, clearToken, getToken } from "@/lib/client-auth";
import { SiteFooter } from "@/components/SiteChrome";
import styles from "../ui.module.css";

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  captureCount: number;
  isAdmin: boolean;
};

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [captures, setCaptures] = useState<CaptureRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    const data = await apiFetch<{ users: AdminUser[] }>("/api/admin/users");
    setUsers(data.users);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    loadUsers()
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Admin load failed";
        if (/unauthorized|expired|authenticator|admin must/i.test(message)) {
          clearToken();
          router.replace("/login");
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [loadUsers, router]);

  async function openUser(user: AdminUser) {
    setSelected(user.id);
    setSelectedEmail(user.email);
    setError(null);
    try {
      const data = await apiFetch<{ items: CaptureRecord[] }>(
        `/api/admin/users/${encodeURIComponent(user.id)}/captures`
      );
      setCaptures(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load captures");
    }
  }

  if (loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.main}>
          <p className={styles.muted}>Loading admin…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.shell} style={{ display: "flex", flexDirection: "column" }}>
      <nav className={styles.nav}>
        <Link href="/admin" className={styles.brand}>
          Dhanlaxmi Business Hub
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard" className={styles.muted}>
            Dashboard
          </Link>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => {
              clearToken();
              router.push("/login");
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <div className={styles.main}>
        <h1 className={styles.title}>Admin</h1>
        <p className={styles.lead}>
          One admin account. Google Authenticator is required at login. This
          list is every website user and their saved captures.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}

        <h2 className={styles.cardTitle}>Users</h2>
        {users.length === 0 ? (
          <p className={styles.empty}>No users yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Captures</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.email}
                      {user.isAdmin ? " · admin" : ""}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleString()}</td>
                    <td>{user.captureCount}</td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnGhost}`}
                        onClick={() => void openUser(user)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected ? (
          <>
            <h2 className={styles.cardTitle} style={{ marginTop: "1.5rem" }}>
              Captures · {selectedEmail}
            </h2>
            {captures.length === 0 ? (
              <p className={styles.empty}>No captures for this user.</p>
            ) : (
              <div className={styles.tableWrap}>
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
                    {captures.map((capture) => (
                      <tr key={capture.id}>
                        <td>
                          {capture.dlAccountName || "—"} ({capture.dlAccountId})
                        </td>
                        <td>
                          {capture.startDate || "—"} → {capture.endDate || "—"}
                        </td>
                        <td>{formatNum(capture.totalBusiness)}</td>
                        <td>{formatNum(capture.turnover)}</td>
                        <td>
                          {new Date(
                            capture.updatedAt || capture.createdAt
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </div>
      <SiteFooter />
    </div>
  );
}
