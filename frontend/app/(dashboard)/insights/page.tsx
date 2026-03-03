"use client";

import { useState, useEffect } from 'react';
import { Github, CheckCircle, XCircle, Clock, Search, Network, GitBranch, ChevronRight, Layers } from "lucide-react";
import Link from "next/link";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";

interface ScanResult {
  _id: string;
  repo_owner: string;
  repo_name: string;
  branch: string;
  status: string;
  progress: number;
  message: string;
  created_at: string;
  completed_at?: string;
  error_details?: string;
}

export default function ArchitectureGallery() {
  const [scans, setScans]           = useState<ScanResult[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<ScanResult | null>(null);

  useEffect(() => { loadScans(); }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      const r = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/scan/history`,
        { credentials: 'include' }
      );
      if (!r.ok) throw new Error(r.statusText);
      const d = await r.json();
      const completed = (d.scans || [])
        .filter((s: ScanResult) => s.status === 'completed')
        .sort((a: ScanResult, b: ScanResult) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      // Deduplicate: keep only the latest scan per repo+branch
      const seen = new Set<string>();
      const deduped = completed.filter((s: ScanResult) => {
        const key = `${s.repo_owner}/${s.repo_name}@${s.branch}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setScans(deduped);
      if (deduped.length > 0) setSelected(deduped[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const filtered = scans.filter(s =>
    `${s.repo_owner}/${s.repo_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (d: string) => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) +
      '  ' + dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  /* ── full-screen split layout ── */
  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#04060f', color: '#e2e8f0',
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ══════════════════════════════════════════════════════
          LEFT SIDEBAR — repo list
      ══════════════════════════════════════════════════════ */}
      <aside style={{
        width: 280, flexShrink: 0,
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(6,8,18,0.98)',
      }}>

        {/* header */}
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg,#6C63FF22,#22d3ee22)',
              border: '1px solid rgba(108,99,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Layers size={16} color="#6C63FF" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>Architecture</div>
              <div style={{ fontSize: 10, color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>Gallery</div>
            </div>
          </div>

          {/* search */}
          <div style={{ position: 'relative' }}>
            <Search size={12} color="#475569" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search repos…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '7px 10px 7px 28px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, color: '#e2e8f0',
                fontSize: 12, fontFamily: 'JetBrains Mono, monospace',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* count */}
        <div style={{
          padding: '8px 16px', fontSize: 10,
          color: '#334155', fontFamily: 'JetBrains Mono, monospace',
          borderBottom: '1px solid rgba(255,255,255,0.03)',
        }}>
          {loading ? 'Loading…' : `${filtered.length} completed scan${filtered.length !== 1 ? 's' : ''}`}
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid #22d3ee', borderTopColor: 'transparent',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#334155', fontSize: 12 }}>
              No completed scans yet.<br />
              <Link href="/scan" style={{ color: '#6C63FF', textDecoration: 'none', fontSize: 11 }}>
                Start a scan →
              </Link>
            </div>
          )}

          {!loading && filtered.map(scan => {
            const isActive = selected?._id === scan._id;
            return (
              <button
                key={scan._id}
                onClick={() => setSelected(scan)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 16px',
                  background: isActive
                    ? 'linear-gradient(90deg,rgba(108,99,255,0.12),rgba(34,211,238,0.04))'
                    : 'transparent',
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderLeft: isActive ? '2px solid #6C63FF' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                {/* icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: isActive ? 'rgba(108,99,255,0.18)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? 'rgba(108,99,255,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Github size={13} color={isActive ? '#6C63FF' : '#475569'} />
                </div>

                {/* text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: isActive ? '#f1f5f9' : '#94a3b8',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {scan.repo_owner}/{scan.repo_name}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5, marginTop: 2,
                  }}>
                    <GitBranch size={9} color="#334155" />
                    <span style={{ fontSize: 10, color: '#334155', fontFamily: 'JetBrains Mono, monospace' }}>
                      {scan.branch}
                    </span>
                    <span style={{ fontSize: 10, color: '#1e293b', marginLeft: 2 }}>
                      {fmt(scan.created_at)}
                    </span>
                  </div>
                </div>

                {isActive && <ChevronRight size={12} color="#6C63FF" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════
          RIGHT PANEL — full architecture diagram
      ══════════════════════════════════════════════════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* top bar */}
        <div style={{
          padding: '0 24px',
          height: 56, flexShrink: 0,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(4,6,15,0.98)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Network size={16} color="#22d3ee" />
            <div>
              {selected ? (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                    {selected.repo_owner}/{selected.repo_name}
                  </span>
                  <span style={{
                    marginLeft: 10, fontSize: 10, color: '#22d3ee',
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'rgba(34,211,238,0.08)',
                    border: '1px solid rgba(34,211,238,0.2)',
                    borderRadius: 20, padding: '2px 8px',
                  }}>
                    {selected.branch}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 13, color: '#334155' }}>Select a repository</span>
              )}
            </div>
          </div>

          {selected && (
            <Link
              href={`/scan/${selected._id}`}
              style={{
                fontSize: 11, color: '#6C63FF',
                fontFamily: 'JetBrains Mono, monospace',
                textDecoration: 'none',
                padding: '5px 12px',
                border: '1px solid rgba(108,99,255,0.3)',
                borderRadius: 20,
                background: 'rgba(108,99,255,0.06)',
                transition: 'all 0.15s',
              }}
            >
              Full Analysis →
            </Link>
          )}
        </div>

        {/* diagram area — takes ALL remaining space */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {error && (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f87171', fontFamily: 'JetBrains Mono, monospace', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {!error && !selected && !loading && (
            <div style={{
              height: '100%', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 16,
            }}>
              <Network size={48} color="#1e293b" />
              <div style={{ color: '#334155', fontFamily: 'JetBrains Mono, monospace', fontSize: 13 }}>
                Select a repository to visualize its architecture
              </div>
            </div>
          )}

          {!error && selected && (
            <div style={{ height: '100%' }}>
              <ArchitectureDiagram scanId={selected._id} fullscreen />
            </div>
          )}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
      `}</style>
    </div>
  );
}
