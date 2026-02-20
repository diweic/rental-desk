"use client";

// Admin page at /admin
// Shows a login form if not authenticated.
// Shows the URL management dashboard when logged in.

import { useState, useEffect } from "react";
import { LogOut, Plus, Copy, ToggleLeft, ToggleRight, Trash2, Check } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientUrl {
  id: number;
  client_id: string;
  label: string;
  locale: string;
  created_at: string;
  is_active: number; // 1 = active, 0 = revoked
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null); // null = checking
  const [urls, setUrls] = useState<ClientUrl[]>([]);
  const [loadingUrls, setLoadingUrls] = useState(false);

  // Check if already logged in by hitting a protected endpoint
  useEffect(() => {
    fetch("/api/admin/urls")
      .then((r) => {
        if (r.ok) {
          r.json().then((data) => { setUrls(data as ClientUrl[]); setLoggedIn(true); });
        } else {
          setLoggedIn(false);
        }
      })
      .catch(() => setLoggedIn(false));
  }, []);

  const refreshUrls = () => {
    setLoadingUrls(true);
    fetch("/api/admin/urls")
      .then((r) => r.json())
      .then((data) => { setUrls(data as ClientUrl[]); setLoadingUrls(false); })
      .catch(() => setLoadingUrls(false));
  };

  const handleLogout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setLoggedIn(false);
    setUrls([]);
  };

  if (loggedIn === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!loggedIn) {
    return <LoginForm onSuccess={() => { setLoggedIn(true); refreshUrls(); }} />;
  }

  return (
    <Dashboard
      urls={urls}
      loading={loadingUrls}
      onRefresh={refreshUrls}
      onLogout={handleLogout}
    />
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Login</h1>
        <p className="text-sm text-gray-400 mb-6">Rental Manager · URL Management</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({
  urls,
  loading,
  onRefresh,
  onLogout,
}: {
  urls: ClientUrl[];
  loading: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [label, setLabel] = useState("");
  const [locale, setLocale] = useState("en-us");
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://yoursite.com";

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIssueError(""); setIssuing(true);
    try {
      const res = await fetch("/api/admin/urls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, locale }),
      });
      if (res.ok) {
        setLabel(""); setShowIssueForm(false);
        onRefresh();
      } else {
        const data = await res.json() as { error?: string };
        setIssueError(data.error ?? "Failed to issue URL");
      }
    } catch {
      setIssueError("Network error");
    } finally {
      setIssuing(false);
    }
  };

  const toggleActive = async (url: ClientUrl) => {
    await fetch(`/api/admin/urls/${url.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: url.is_active ? 0 : 1 }),
    });
    onRefresh();
  };

  const handleDelete = async (url: ClientUrl) => {
    if (!confirm(`Permanently delete URL for "${url.label}"? This cannot be undone.`)) return;
    await fetch(`/api/admin/urls/${url.id}`, { method: "DELETE" });
    onRefresh();
  };

  const copyUrl = (clientId: string) => {
    const fullUrl = `${origin}/en-us/${clientId}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedId(clientId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const activeCount = urls.filter((u) => u.is_active).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-gray-900 text-base">Admin Dashboard</h1>
          <p className="text-xs text-gray-400">
            {activeCount} active URL{activeCount !== 1 ? "s" : ""} · {urls.length} total
          </p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Issue new URL button */}
        <button
          onClick={() => setShowIssueForm(!showIssueForm)}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors shadow-sm"
        >
          <Plus size={16} />
          Issue New Client URL
        </button>

        {/* Issue form */}
        {showIssueForm && (
          <form
            onSubmit={handleIssue}
            className="bg-white rounded-xl shadow-sm p-4 space-y-3 border border-blue-100"
          >
            <h3 className="text-sm font-semibold text-gray-800">New Client URL</h3>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Client Label</label>
              <input
                type="text"
                placeholder="e.g. Mr. Chen - Shanghai"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={200}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Locale</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="en-us">English (en-us)</option>
                {/* zh-cn will be added in Phase 2 */}
              </select>
            </div>
            {issueError && <p className="text-xs text-red-500">{issueError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowIssueForm(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={issuing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {issuing ? "Issuing…" : "Generate URL"}
              </button>
            </div>
          </form>
        )}

        {/* URL list */}
        {loading ? (
          <p className="text-center text-sm text-gray-400 animate-pulse py-8">Loading…</p>
        ) : urls.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">
            No URLs issued yet. Click "Issue New Client URL" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {urls.map((url) => {
              const fullUrl = `${origin}/${url.locale}/${url.client_id}`;
              const copied = copiedId === url.client_id;
              return (
                <div
                  key={url.id}
                  className={`bg-white rounded-xl shadow-sm p-4 flex items-start gap-3 ${
                    !url.is_active ? "opacity-50" : ""
                  }`}
                >
                  {/* Status indicator */}
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      url.is_active ? "bg-green-400" : "bg-gray-300"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{url.label}</p>
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      {fullUrl}
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Issued {url.created_at} · {url.locale}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Copy URL */}
                    <button
                      onClick={() => copyUrl(url.client_id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                      title="Copy URL"
                    >
                      {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                    </button>
                    {/* Toggle active/revoked */}
                    <button
                      onClick={() => toggleActive(url)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                      title={url.is_active ? "Revoke access" : "Restore access"}
                    >
                      {url.is_active
                        ? <ToggleRight size={16} className="text-green-500" />
                        : <ToggleLeft size={16} />
                      }
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(url)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete permanently"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
