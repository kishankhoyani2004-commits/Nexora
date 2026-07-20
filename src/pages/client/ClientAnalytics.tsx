import {
  DollarSign,
  Briefcase,
  Users,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { CLIENT_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { formatCurrency } from "@/utils/formatters";

// ─── Demo / Fallback Data ───────────────────────────────────────────────────

const MONTHLY_SPEND = [
  { month: "Jan", amount: 8200 * 80 },
  { month: "Feb", amount: 12500 * 80 },
  { month: "Mar", amount: 9800 * 80 },
  { month: "Apr", amount: 15200 * 80 },
  { month: "May", amount: 11000 * 80 },
  { month: "Jun", amount: 18500 * 80 },
];

const CATEGORIES = [
  { name: "Web Development", amount: 28400 * 80, color: "#6366f1" },
  { name: "Mobile Apps",     amount: 19800 * 80, color: "#10b981" },
  { name: "UI/UX Design",    amount: 12600 * 80, color: "#f59e0b" },
  { name: "AI / ML",         amount: 9500 * 80,  color: "#8b5cf6" },
  { name: "DevOps",          amount: 4900 * 80,  color: "#06b6d4" },
];

const HIRE_ACTIVITY = [
  { month: "Jan", jobsPosted: 3, hiresMade: 2, avgBudget: "₹2,18,400" },
  { month: "Feb", jobsPosted: 5, hiresMade: 4, avgBudget: "₹2,50,000" },
  { month: "Mar", jobsPosted: 4, hiresMade: 3, avgBudget: "₹2,61,360" },
  { month: "Apr", jobsPosted: 6, hiresMade: 5, avgBudget: "₹2,43,200" },
  { month: "May", jobsPosted: 4, hiresMade: 3, avgBudget: "₹2,93,360" },
  { month: "Jun", jobsPosted: 7, hiresMade: 6, avgBudget: "₹2,46,640" },
];

const SUCCESS_RATE = 87;
const CATEGORY_MAX = CATEGORIES[0].amount;
const RING_R = 58;
const RING_CIRC = 2 * Math.PI * RING_R;

// ─── Component ───────────────────────────────────────────────────────────────

export default function ClientAnalytics() {
  const { user } = useAuth();

  // Fetch payment history; fall back to demo aggregates when empty / error
  const { data: paymentsData } = useQuery({
    queryKey: ["paymentsHistory"],
    queryFn: async () => {
      const res = await apiClient.get("/payments/history");
      return res.data;
    },
    enabled: !!user,
  });

  const hasApiData =
    paymentsData && Array.isArray(paymentsData) && paymentsData.length > 0;

  const totalSpent = hasApiData
    ? paymentsData.reduce(
        (acc: number, p: { amount?: number }) => acc + (p.amount ?? 0),
        0
      )
    : MONTHLY_SPEND.reduce((a, m) => a + m.amount, 0);

  const maxSpend = Math.max(...MONTHLY_SPEND.map((m) => m.amount));

  // ── Shared style helpers ───────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "var(--color-surface-card, #fff)",
    border: "1px solid var(--color-surface-border, #e5e7eb)",
    borderRadius: 20,
    padding: "1.5rem",
    boxShadow: "var(--shadow-card, 0 1px 4px rgba(0,0,0,.06))",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: "1rem",
    fontWeight: 700,
    color: "var(--color-ink-900, #111827)",
    margin: 0,
  };

  const sectionSub: React.CSSProperties = {
    fontSize: "0.8rem",
    color: "var(--color-ink-500, #6b7280)",
    marginTop: 2,
    marginBottom: 0,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout navItems={CLIENT_NAV}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              boxShadow: "0 4px 14px rgba(99,102,241,.35)",
              flexShrink: 0,
            }}
          >
            <BarChart3 size={20} color="#fff" />
          </span>
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "var(--color-ink-900, #111827)",
                margin: 0,
              }}
            >
              Client Analytics
            </h1>
            <p style={{ ...sectionSub, marginTop: 2 }}>
              Spending insights &amp; hiring performance overview
            </p>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent)}
          delta="+22% vs last period"
          icon={DollarSign}
          tone="brand"
        />
        <StatCard
          label="Active Jobs"
          value="6"
          delta="+2 this month"
          icon={Briefcase}
          tone="success"
        />
        <StatCard
          label="Total Hires"
          value="23"
          delta="+6 this quarter"
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Avg Project Value"
          value={formatCurrency(3287 * 80)}
          delta="+8% vs last period"
          icon={TrendingUp}
          tone="warning"
        />
      </div>

      {/* ── Row 2: Bar Chart + Donut ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 300px",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        {/* ─ Spending Trend Bar Chart ─ */}
        <div style={card}>
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={sectionTitle}>Monthly Spending Trend</p>
            <p style={sectionSub}>Jan – Jun 2025</p>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "0.6rem",
              height: 180,
            }}
          >
            {MONTHLY_SPEND.map((m) => {
              const pct = (m.amount / maxSpend) * 100;
              const isLatest = m.month === "Jun";
              return (
                <div
                  key={m.month}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      color: "var(--color-ink-500, #6b7280)",
                    }}
                  >
                    ${(m.amount / 1000).toFixed(1)}k
                  </span>
                  <div
                    style={{
                      width: "100%",
                      height: `${pct}%`,
                      minHeight: 8,
                      borderRadius: "8px 8px 4px 4px",
                      background: isLatest
                        ? "linear-gradient(180deg,#818cf8,#6366f1)"
                        : "linear-gradient(180deg,#c7d2fe,#a5b4fc)",
                      boxShadow: isLatest
                        ? "0 4px 16px rgba(99,102,241,.30)"
                        : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: isLatest
                        ? "#4f46e5"
                        : "var(--color-ink-500, #6b7280)",
                    }}
                  >
                    {m.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─ Success Rate Donut ─ */}
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", marginBottom: "1.25rem" }}>
            <p style={sectionTitle}>Project Success Rate</p>
            <p style={sectionSub}>Jobs completed successfully</p>
          </div>

          {/* SVG Ring */}
          <div style={{ position: "relative", width: 148, height: 148 }}>
            <svg
              viewBox="0 0 148 148"
              style={{
                transform: "rotate(-90deg)",
                width: "100%",
                height: "100%",
              }}
            >
              <defs>
                <linearGradient id="sgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle
                cx="74"
                cy="74"
                r={RING_R}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="14"
              />
              {/* Arc */}
              <circle
                cx="74"
                cy="74"
                r={RING_R}
                fill="none"
                stroke="url(#sgGrad)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={RING_CIRC * (1 - SUCCESS_RATE / 100)}
              />
            </svg>

            {/* Centre label */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: "2rem",
                  fontWeight: 800,
                  lineHeight: 1,
                  background: "linear-gradient(135deg,#6366f1,#10b981)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {SUCCESS_RATE}%
              </span>
            </div>
          </div>

          {/* Legend */}
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              width: "100%",
            }}
          >
            {[
              { label: "Completed", color: "#6366f1", pct: `${SUCCESS_RATE}%` },
              {
                label: "Pending / Open",
                color: "#e5e7eb",
                pct: `${100 - SUCCESS_RATE}%`,
              },
            ].map((leg) => (
              <div
                key={leg.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "0.8rem",
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: leg.color,
                    border:
                      leg.color === "#e5e7eb"
                        ? "1.5px solid #d1d5db"
                        : "none",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "var(--color-ink-500, #6b7280)",
                    flex: 1,
                  }}
                >
                  {leg.label}
                </span>
                <span
                  style={{
                    fontWeight: 700,
                    color: "var(--color-ink-900, #111827)",
                  }}
                >
                  {leg.pct}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 3: Categories + Hire Table ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.25rem",
        }}
      >
        {/* ─ Top Spending Categories ─ */}
        <div style={card}>
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={sectionTitle}>Top Spending Categories</p>
            <p style={sectionSub}>All-time breakdown by category</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {CATEGORIES.map((cat, i) => {
              const pct = Math.round((cat.amount / CATEGORY_MAX) * 100);
              return (
                <div key={cat.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: cat.color + "22",
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: cat.color,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: "var(--color-ink-900, #111827)",
                        }}
                      >
                        {cat.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "var(--color-ink-900, #111827)",
                      }}
                    >
                      ${cat.amount.toLocaleString()}
                    </span>
                  </div>

                  {/* Progress track */}
                  <div
                    style={{
                      height: 7,
                      borderRadius: 99,
                      background: "var(--color-surface-border, #e5e7eb)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 99,
                        background: cat.color,
                        boxShadow: `0 0 6px ${cat.color}66`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─ Hire Activity Table ─ */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={sectionTitle}>Hire Activity</p>
            <p style={sectionSub}>Monthly hiring performance</p>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr>
                  {["Month", "Jobs Posted", "Hires Made", "Avg Budget"].map(
                    (col) => (
                      <th
                        key={col}
                        style={{
                          textAlign: col === "Month" ? "left" : "center",
                          padding: "0 0.75rem 0.75rem",
                          fontWeight: 600,
                          fontSize: "0.72rem",
                          color: "var(--color-ink-500, #6b7280)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom:
                            "1px solid var(--color-surface-border, #e5e7eb)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {HIRE_ACTIVITY.map((row, idx) => (
                  <tr
                    key={row.month}
                    style={{
                      background:
                        idx % 2 !== 0
                          ? "rgba(99,102,241,.03)"
                          : "transparent",
                    }}
                  >
                    {/* Month */}
                    <td
                      style={{
                        padding: "0.7rem 0.75rem",
                        fontWeight: 700,
                        color: "var(--color-ink-900, #111827)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Calendar size={13} color="#6366f1" />
                        {row.month}
                      </div>
                    </td>

                    {/* Jobs Posted */}
                    <td
                      style={{
                        padding: "0.7rem 0.75rem",
                        textAlign: "center",
                        color: "var(--color-ink-700, #374151)",
                      }}
                    >
                      {row.jobsPosted}
                    </td>

                    {/* Hires Made */}
                    <td
                      style={{ padding: "0.7rem 0.75rem", textAlign: "center" }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 600,
                          color: "#10b981",
                        }}
                      >
                        <CheckCircle2 size={13} />
                        {row.hiresMade}
                      </span>
                    </td>

                    {/* Avg Budget */}
                    <td
                      style={{
                        padding: "0.7rem 0.75rem",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#6366f1",
                      }}
                    >
                      {row.avgBudget}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
