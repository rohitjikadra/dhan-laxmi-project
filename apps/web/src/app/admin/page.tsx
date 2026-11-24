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

type AdminEntry = CaptureRecord & { email: string };

function formatNum(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [userData, entryData] = await Promise.all([
      apiFetch<{ users: AdminUser[] }>("/api/admin/users"),
      apiFetch<{ items: AdminEntry[] }>("/api/admin/captures"),
    ]);
    setUsers(userData.users);
    setEntries(entryData.items);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    load()
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
  }, [load, router]);

  async function removeUserData(user: AdminUser) {
    const ok = window.confirm(
      `Delete all captures for ${user.email}? The account stays.`
    );
    if (!ok) return;
    setBusyId(user.id);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}/captures`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete data");
    } finally {
      setBusyId(null);
    }
  }

  async function removeUser(user: AdminUser) {
    const ok = window.confirm(
      `Delete ${user.email} and all of their captures? This cannot be undone.`
    );
    if (!ok) return;
    setBusyId(user.id);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete user");
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(entry: AdminEntry) {
    const ok = window.confirm(
      `Delete this entry for ${entry.email} (${entry.dlAccountId})?`
    );
    if (!ok) return;
    setBusyId(entry.id);
    setError(null);
    try {
      await apiFetch(`/api/admin/captures/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete entry");
    } finally {
      setBusyId(null);
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
          Every website user and every saved capture. Deleting a user also
          deletes that user's captures.
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
                        disabled={busyId === user.id || user.captureCount === 0}
                        onClick={() => void removeUserData(user)}
                      >
                        Delete data
                      </button>{" "}
                      {user.isAdmin ? null : (
                        <button
                          type="button"
                          className={`${styles.btn} ${styles.btnGhost}`}
                          style={{ color: "var(--danger)" }}
                          disabled={busyId === user.id}
                          onClick={() => void removeUser(user)}
                        >
                          Delete user
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h2 className={styles.cardTitle} style={{ marginTop: "1.5rem" }}>
          All entries
        </h2>
        {entries.length === 0 ? (
          <p className={styles.empty}>No captures yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Account</th>
                  <th>Dates</th>
                  <th>Business</th>
                  <th>Turnover</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.email}</td>
                    <td>
                      {entry.dlAccountName || "—"} ({entry.dlAccountId})
                    </td>
                    <td>
                      {entry.startDate || "—"} → {entry.endDate || "—"}
                    </td>
                    <td>{formatNum(entry.totalBusiness)}</td>
                    <td>{formatNum(entry.turnover)}</td>
                    <td>
                      {new Date(entry.updatedAt || entry.createdAt).toLocaleString()}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnGhost}`}
                        style={{ color: "var(--danger)" }}
                        disabled={busyId === entry.id}
                        onClick={() => void removeEntry(entry)}
                      >
                        Delete
                      </button>
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
