import { useState } from "react";
import { MessageSquare, Star, TrendingUp, Award } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { FREELANCER_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  id: string;
  clientName: string;
  clientAvatar?: string;
  rating: number; // 1-5
  projectName: string;
  date: string;
  text: string;
  reply?: string;
  categories?: {
    communication: number;
    quality: number;
    expertise: number;
    deadlines: number;
  };
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_REVIEWS: Review[] = [
  {
    id: "1",
    clientName: "Sarah Mitchell",
    rating: 5,
    projectName: "E-Commerce Platform Redesign",
    date: "2026-06-28",
    text: "Exceptional work! Delivered ahead of schedule with pixel-perfect results. Highly recommend!",
    reply: "Thank you so much, Sarah! It was a pleasure working on your project.",
    categories: { communication: 5, quality: 5, expertise: 5, deadlines: 5 },
  },
  {
    id: "2",
    clientName: "James Chen",
    rating: 5,
    projectName: "SaaS Dashboard Development",
    date: "2026-06-14",
    text: "Outstanding developer. Communicated clearly throughout and the code quality was top-notch.",
    categories: { communication: 5, quality: 5, expertise: 5, deadlines: 4 },
  },
  {
    id: "3",
    clientName: "Emma Roberts",
    rating: 4,
    projectName: "Mobile App UI/UX",
    date: "2026-05-30",
    text: "Great work overall. Minor revisions needed but very professional and responsive.",
    categories: { communication: 4, quality: 4, expertise: 5, deadlines: 4 },
  },
  {
    id: "4",
    clientName: "Michael Torres",
    rating: 5,
    projectName: "API Integration & Backend",
    date: "2026-05-12",
    text: "Best freelancer I have hired. Went above and beyond every expectation.",
    reply: "Really appreciate the kind words, Michael! Looking forward to future projects.",
    categories: { communication: 5, quality: 5, expertise: 5, deadlines: 5 },
  },
  {
    id: "5",
    clientName: "Lisa Park",
    rating: 4,
    projectName: "Landing Page Optimization",
    date: "2026-04-25",
    text: "Delivered exactly what was needed. Would definitely work with again.",
    categories: { communication: 4, quality: 5, expertise: 4, deadlines: 5 },
  },
];

// ─── Helper components ────────────────────────────────────────────────────────

function StarRow({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const starSizes = size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={`flex items-center gap-0.5 ${starSizes}`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          style={{ color: s <= Math.round(rating) ? "#FBBF24" : "#374151" }}
        >
          {s <= Math.round(rating) ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function RatingBar({
  label,
  count,
  total,
  starValue,
}: {
  label: string;
  count: number;
  total: number;
  starValue: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="fr-rating-bar-row">
      <span className="fr-rating-bar-label">
        <span style={{ color: "#FBBF24" }}>★</span> {label}
      </span>
      <div className="fr-rating-bar-track">
        <div
          className="fr-rating-bar-fill"
          style={{
            width: `${pct}%`,
            background:
              starValue >= 4
                ? "linear-gradient(90deg,#FBBF24,#F59E0B)"
                : starValue === 3
                ? "linear-gradient(90deg,#60A5FA,#3B82F6)"
                : "linear-gradient(90deg,#F87171,#EF4444)",
          }}
        />
      </div>
      <span className="fr-rating-bar-count">{count}</span>
    </div>
  );
}

function CategoryBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="fr-cat-row">
      <span className="fr-cat-label">{label}</span>
      <div className="fr-cat-track">
        <div className="fr-cat-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="fr-cat-score">{score.toFixed(1)}</span>
    </div>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────

type Tab = "all" | "5star" | "4star" | "replies";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Reviews" },
  { id: "5star", label: "5 Star" },
  { id: "4star", label: "4 Star" },
  { id: "replies", label: "With Replies" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function FreelancerReviews() {
  useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [replyOpen, setReplyOpen] = useState<string | null>(null);

  // Fetch reviews; fall back to demo data on error / 404 / empty
  const { data: apiReviews } = useQuery<Review[]>({
    queryKey: ["reviews", "mine"],
    queryFn: async () => {
      const res = await apiClient.get<Review[]>("/reviews/mine");
      return res.data;
    },
    retry: false,
  });

  const reviews: Review[] =
    !apiReviews || apiReviews.length === 0 ? DEMO_REVIEWS : apiReviews;

  // ── Computed stats ──────────────────────────────────────────────────────────
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews
      : 0;

  const countByStar = (star: number) =>
    reviews.filter((r) => r.rating === star).length;

  const avgCategory = (key: keyof NonNullable<Review["categories"]>) => {
    const withCat = reviews.filter((r) => r.categories);
    if (!withCat.length) return 0;
    return withCat.reduce((a, r) => a + (r.categories![key] ?? 0), 0) / withCat.length;
  };

  // ── Tab filter ──────────────────────────────────────────────────────────────
  const filteredReviews = reviews.filter((r) => {
    if (activeTab === "5star") return r.rating === 5;
    if (activeTab === "4star") return r.rating === 4;
    if (activeTab === "replies") return !!r.reply;
    return true;
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <DashboardLayout navItems={FREELANCER_NAV}>
      {/* Scoped styles */}
      <style>{`
        /* ── Page shell ── */
        .fr-page { padding: 2rem 1.5rem; max-width: 1100px; margin: 0 auto; }
        .fr-page-header { margin-bottom: 2rem; }
        .fr-page-title {
          font-size: 1.75rem; font-weight: 800; letter-spacing: -0.5px;
          background: linear-gradient(135deg, #a78bfa, #60a5fa, #f472b6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .fr-page-sub { color: #9ca3af; margin-top: 0.25rem; font-size: 0.9rem; }

        /* ── Overview grid ── */
        .fr-overview { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.25rem; margin-bottom: 2rem; }
        @media (max-width: 768px) { .fr-overview { grid-template-columns: 1fr; } }

        /* ── Glass card ── */
        .fr-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 1rem;
          backdrop-filter: blur(12px);
          padding: 1.5rem;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .fr-card:hover { box-shadow: 0 8px 32px rgba(167,139,250,0.12); transform: translateY(-2px); }

        /* ── Big rating card ── */
        .fr-big-rating { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; text-align: center; }
        .fr-big-num { font-size: 4rem; font-weight: 900; color: #FBBF24; line-height: 1; }
        .fr-big-outof { font-size: 1rem; color: #6b7280; }
        .fr-big-count { font-size: 0.875rem; color: #9ca3af; margin-top: 0.25rem; }

        /* ── Rating breakdown bars ── */
        .fr-breakdown-title { font-weight: 700; font-size: 0.875rem; color: #d1d5db; margin-bottom: 1rem; letter-spacing: 0.05em; text-transform: uppercase; }
        .fr-rating-bar-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.6rem; }
        .fr-rating-bar-label { font-size: 0.8rem; color: #9ca3af; width: 40px; flex-shrink: 0; }
        .fr-rating-bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
        .fr-rating-bar-fill { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .fr-rating-bar-count { font-size: 0.75rem; color: #6b7280; width: 20px; text-align: right; flex-shrink: 0; }

        /* ── Category breakdown ── */
        .fr-cat-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.85rem; }
        .fr-cat-label { font-size: 0.82rem; color: #9ca3af; width: 110px; flex-shrink: 0; }
        .fr-cat-track { flex: 1; height: 8px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
        .fr-cat-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #a78bfa, #60a5fa); transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
        .fr-cat-score { font-size: 0.82rem; font-weight: 700; color: #c4b5fd; width: 28px; text-align: right; flex-shrink: 0; }

        /* ── Tabs ── */
        .fr-tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .fr-tab {
          padding: 0.45rem 1.1rem; border-radius: 9999px; font-size: 0.84rem; font-weight: 600; cursor: pointer;
          border: 1px solid rgba(255,255,255,0.1); background: transparent; color: #9ca3af;
          transition: all 0.18s ease;
        }
        .fr-tab:hover { border-color: rgba(167,139,250,0.4); color: #c4b5fd; }
        .fr-tab.active {
          background: linear-gradient(135deg, rgba(167,139,250,0.25), rgba(96,165,250,0.2));
          border-color: rgba(167,139,250,0.5); color: #e9d5ff;
        }
        .fr-tab-count {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(167,139,250,0.2); color: #c4b5fd;
          border-radius: 99px; font-size: 0.7rem; font-weight: 700;
          padding: 0.05rem 0.45rem; margin-left: 0.35rem;
        }

        /* ── Review cards ── */
        .fr-reviews { display: flex; flex-direction: column; gap: 1rem; }
        .fr-review-card {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 1rem;
          padding: 1.5rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .fr-review-card:hover { border-color: rgba(167,139,250,0.25); box-shadow: 0 4px 24px rgba(167,139,250,0.08); }

        .fr-review-header { display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 0.85rem; }
        .fr-review-meta { flex: 1; min-width: 0; }
        .fr-review-client { font-weight: 700; font-size: 0.95rem; color: #f3f4f6; }
        .fr-review-project { font-size: 0.78rem; color: #6b7280; margin-top: 0.15rem; }
        .fr-review-date { font-size: 0.75rem; color: #4b5563; margin-top: 0.05rem; }

        .fr-review-text { color: #d1d5db; font-size: 0.9rem; line-height: 1.65; margin-bottom: 1rem; }

        .fr-reply-block {
          background: rgba(167,139,250,0.06);
          border-left: 3px solid rgba(167,139,250,0.4);
          border-radius: 0 0.5rem 0.5rem 0;
          padding: 0.75rem 1rem;
          margin-bottom: 0.75rem;
        }
        .fr-reply-label { font-size: 0.72rem; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.3rem; }
        .fr-reply-text { font-size: 0.85rem; color: #c4b5fd; line-height: 1.55; }

        .fr-review-footer { display: flex; align-items: center; justify-content: space-between; }
        .fr-reply-btn {
          font-size: 0.78rem; font-weight: 600; color: #7c3aed; padding: 0.3rem 0.85rem;
          border: 1px solid rgba(124,58,237,0.3); border-radius: 9999px;
          background: transparent; cursor: pointer; transition: all 0.18s ease;
          display: inline-flex; align-items: center; gap: 0.35rem;
        }
        .fr-reply-btn:hover { background: rgba(124,58,237,0.1); border-color: rgba(124,58,237,0.6); color: #a78bfa; }

        /* ── Empty state ── */
        .fr-empty { text-align: center; padding: 3rem 1.5rem; color: #6b7280; }
        .fr-empty-icon { font-size: 3rem; margin-bottom: 0.75rem; opacity: 0.4; }

        /* ── Section title ── */
        .fr-section-title { font-size: 1rem; font-weight: 700; color: #e5e7eb; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
        .fr-section-title svg { width: 1rem; height: 1rem; opacity: 0.7; }

        /* ── Rating badge ── */
        .fr-rating-badge {
          display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; font-weight: 700;
          background: rgba(251,191,36,0.12); color: #FBBF24; border: 1px solid rgba(251,191,36,0.25);
          padding: 0.25rem 0.65rem; border-radius: 9999px;
        }
      `}</style>

      <div className="fr-page">
        {/* ── Page header ── */}
        <div className="fr-page-header">
          <h1 className="fr-page-title">My Reviews</h1>
          <p className="fr-page-sub">
            See what clients say about your work quality and professionalism.
          </p>
        </div>

        {/* ── Overview grid ── */}
        <div className="fr-overview">
          {/* Big rating */}
          <div className="fr-card fr-big-rating">
            <div className="fr-big-num">{avgRating.toFixed(1)}</div>
            <StarRow rating={avgRating} size="lg" />
            <div className="fr-big-outof">out of 5.0</div>
            <div className="fr-big-count">{totalReviews} total reviews</div>
            <div style={{ marginTop: "0.75rem" }}>
              <span className="fr-rating-badge">
                <Award size={12} />
                Top Rated
              </span>
            </div>
          </div>

          {/* Rating breakdown by star */}
          <div className="fr-card">
            <p className="fr-breakdown-title">Rating Distribution</p>
            {[5, 4, 3, 2, 1].map((star) => (
              <RatingBar
                key={star}
                label={`${star}`}
                count={countByStar(star)}
                total={totalReviews}
                starValue={star}
              />
            ))}
          </div>

          {/* Category breakdown */}
          <div className="fr-card">
            <p className="fr-breakdown-title flex" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <TrendingUp size={13} style={{ opacity: 0.7 }} />
              Category Scores
            </p>
            <CategoryBar label="Communication" score={avgCategory("communication")} />
            <CategoryBar label="Quality" score={avgCategory("quality")} />
            <CategoryBar label="Expertise" score={avgCategory("expertise")} />
            <CategoryBar label="Deadlines" score={avgCategory("deadlines")} />
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="fr-tabs">
          {TABS.map((t) => {
            const tabCount =
              t.id === "all"
                ? reviews.length
                : t.id === "5star"
                ? countByStar(5)
                : t.id === "4star"
                ? countByStar(4)
                : reviews.filter((r) => !!r.reply).length;
            return (
              <button
                key={t.id}
                className={`fr-tab${activeTab === t.id ? " active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                <span className="fr-tab-count">{tabCount}</span>
              </button>
            );
          })}
        </div>

        {/* ── Review cards ── */}
        <div className="fr-section-title">
          <Star size={16} />
          {filteredReviews.length} Review{filteredReviews.length !== 1 ? "s" : ""}
        </div>

        {filteredReviews.length === 0 ? (
          <div className="fr-empty">
            <div className="fr-empty-icon">⭐</div>
            <p>No reviews match this filter yet.</p>
          </div>
        ) : (
          <div className="fr-reviews">
            {filteredReviews.map((review) => (
              <div key={review.id} className="fr-review-card">
                <div className="fr-review-header">
                  <Avatar name={review.clientName} size="md" src={review.clientAvatar} />
                  <div className="fr-review-meta">
                    <div className="fr-review-client">{review.clientName}</div>
                    <div className="fr-review-project">📁 {review.projectName}</div>
                    <div className="fr-review-date">{formatDate(review.date)}</div>
                  </div>
                  <StarRow rating={review.rating} />
                </div>

                <p className="fr-review-text">"{review.text}"</p>

                {review.reply && (
                  <div className="fr-reply-block">
                    <div className="fr-reply-label">Your Reply</div>
                    <div className="fr-reply-text">{review.reply}</div>
                  </div>
                )}

                <div className="fr-review-footer">
                  <span />
                  {!review.reply && (
                    <button
                      className="fr-reply-btn"
                      onClick={() => setReplyOpen(replyOpen === review.id ? null : review.id)}
                    >
                      <MessageSquare size={12} />
                      Reply
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
