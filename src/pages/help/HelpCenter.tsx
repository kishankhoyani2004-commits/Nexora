import { useState, useMemo } from "react";
import {
  Search,
  BookOpen,
  CreditCard,
  Briefcase,
  ShieldAlert,
  ScrollText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mail,
  ArrowRight,
  HelpCircle,
  Wallet,
  Star,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface CategoryCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: CategoryCard[] = [
  {
    icon: <BookOpen size={28} />,
    title: "Getting Started",
    description: "New to Nexora? Learn the basics and set up your account.",
    color: "from-violet-500/20 to-purple-600/10",
  },
  {
    icon: <CreditCard size={28} />,
    title: "Account & Billing",
    description: "Manage your profile, subscription, and billing details.",
    color: "from-sky-500/20 to-cyan-600/10",
  },
  {
    icon: <Briefcase size={28} />,
    title: "Jobs & Proposals",
    description: "Post jobs, submit proposals, and manage applications.",
    color: "from-amber-500/20 to-orange-600/10",
  },
  {
    icon: <Wallet size={28} />,
    title: "Payments & Escrow",
    description: "Understand how funds are held, released, and transferred.",
    color: "from-emerald-500/20 to-green-600/10",
  },
  {
    icon: <ShieldAlert size={28} />,
    title: "Dispute Resolution",
    description: "Learn how to resolve conflicts and escalate issues.",
    color: "from-rose-500/20 to-red-600/10",
  },
  {
    icon: <ScrollText size={28} />,
    title: "Platform Policies",
    description: "Review terms, acceptable use policies, and guidelines.",
    color: "from-indigo-500/20 to-blue-600/10",
  },
];

const ALL_FAQS: FaqItem[] = [
  {
    id: "post-job",
    question: "How do I post a job on Nexora?",
    answer:
      "To post a job, navigate to Post Job from your dashboard. Fill in the job title, description, required skills, budget type (fixed or hourly), and deadline. Once submitted, your job will be visible to qualified freelancers on the platform. You can edit or close the listing at any time from My Jobs.",
  },
  {
    id: "submit-proposal",
    question: "How do freelancers submit proposals?",
    answer:
      "Freelancers can browse available jobs via Browse Jobs and click Submit Proposal on any listing. They provide a cover letter, proposed rate, estimated timeline, and relevant portfolio links. As a client, you'll receive all proposals in your Proposals tab and can accept, shortlist, or decline them.",
  },
  {
    id: "escrow",
    question: "How does escrow work?",
    answer:
      "When you hire a freelancer, the agreed amount is locked in Nexora's secure escrow account — it is not sent to the freelancer yet. Once the freelancer delivers the work and you approve it, the funds are released automatically. If a dispute arises, Nexora's mediation team steps in to review the case and decide on a fair outcome.",
  },
  {
    id: "withdraw-earnings",
    question: "How can I withdraw my earnings?",
    answer:
      "Freelancers can withdraw earnings from the Earnings page. Nexora supports PayPal, bank transfer (ACH/SEPA), and cryptocurrency payouts. A minimum balance of $20 is required. Withdrawals are processed within 1–3 business days depending on your selected method. Funds must have cleared the 5-day security hold before they can be withdrawn.",
  },
  {
    id: "client-no-response",
    question: "What happens if a client doesn't respond?",
    answer:
      "If a client becomes unresponsive after work has been delivered, the freelancer can open a dispute from the project workspace. Nexora will attempt to mediate within 48 hours. If the client still does not respond within 7 days, the escrow funds may be released to the freelancer based on evidence of delivery.",
  },
  {
    id: "leave-review",
    question: "How do I leave a review?",
    answer:
      "After a contract is marked complete, both parties are prompted to leave a review within 14 days. Go to the completed project in your Projects section and click Leave Review. Reviews are public and permanently affect both parties' reputation scores on the platform.",
  },
  {
    id: "change-role",
    question: "Can I change my account role (client ↔ freelancer)?",
    answer:
      "Yes. Go to Settings → Account and look for the Role section. You can request a role switch which takes effect after verification. Note that switching roles does not delete your existing history — your reviews, contracts, and payment history are all preserved. You may need to complete a brief profile update for the new role.",
  },
  {
    id: "platform-fees",
    question: "What are Nexora's platform fees?",
    answer:
      "Nexora charges a service fee to freelancers based on lifetime earnings with each client: 20% for the first $500, 10% for $500–$10,000, and 5% above $10,000. Clients pay a 3% payment processing fee on top of the project amount. There are no hidden fees — all charges are shown transparently at checkout and in your Payments dashboard.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpCenter() {
  const { user } = useAuth();
  const isClient = user?.role === "client";

  const navItems = isClient ? CLIENT_NAV : FREELANCER_NAV;

  // Role-aware FAQ ordering: clients see "How to post a job" first,
  // freelancers see "How to submit a proposal" first.
  const faqs = useMemo<FaqItem[]>(() => {
    if (isClient) {
      // post-job first, then submit-proposal, then the rest
      const postJob = ALL_FAQS.find((f) => f.id === "post-job")!;
      const submitProposal = ALL_FAQS.find((f) => f.id === "submit-proposal")!;
      const rest = ALL_FAQS.filter(
        (f) => f.id !== "post-job" && f.id !== "submit-proposal"
      );
      return [postJob, submitProposal, ...rest];
    } else {
      // submit-proposal first, then post-job, then the rest
      const submitProposal = ALL_FAQS.find((f) => f.id === "submit-proposal")!;
      const postJob = ALL_FAQS.find((f) => f.id === "post-job")!;
      const rest = ALL_FAQS.filter(
        (f) => f.id !== "post-job" && f.id !== "submit-proposal"
      );
      return [submitProposal, postJob, ...rest];
    }
  }, [isClient]);

  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
    );
  }, [searchQuery, faqs]);

  const toggleFaq = (id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <DashboardLayout navItems={navItems}>
      <div className="hc-root">
        {/* ── Hero ── */}
        <section className="hc-hero">
          <div className="hc-hero-glow" />
          <div className="hc-hero-content">
            <span className="hc-badge">
              <HelpCircle size={14} />
              Support Center
            </span>
            <h1 className="hc-hero-title">How can we help you?</h1>
            <p className="hc-hero-subtitle">
              Search our knowledge base or browse by category below.
            </p>
            <div className="hc-search-wrapper">
              <Search className="hc-search-icon" size={20} />
              <input
                id="help-search"
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hc-search-input"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  className="hc-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="hc-section">
          <h2 className="hc-section-title">Browse by Category</h2>
          <p className="hc-section-sub">Find answers organized by topic.</p>
          <div className="hc-categories-grid">
            {CATEGORIES.map((cat) => (
              <button key={cat.title} className="hc-cat-card">
                <div className={`hc-cat-icon-wrap bg-gradient-to-br ${cat.color}`}>
                  {cat.icon}
                </div>
                <div className="hc-cat-body">
                  <span className="hc-cat-title">{cat.title}</span>
                  <span className="hc-cat-desc">{cat.description}</span>
                </div>
                <ArrowRight size={16} className="hc-cat-arrow" />
              </button>
            ))}
          </div>
        </section>

        {/* ── Popular Articles / FAQ ── */}
        <section className="hc-section">
          <h2 className="hc-section-title">Popular Articles</h2>
          <p className="hc-section-sub">
            {isClient
              ? "Answers to the most common questions for clients."
              : "Answers to the most common questions for freelancers."}
          </p>

          {filteredFaqs.length === 0 ? (
            <div className="hc-no-results">
              <Search size={40} className="hc-no-results-icon" />
              <p>No articles match &ldquo;{searchQuery}&rdquo;.</p>
              <button className="hc-link-btn" onClick={() => setSearchQuery("")}>
                Clear search
              </button>
            </div>
          ) : (
            <div className="hc-accordion">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={`hc-accordion-item${isOpen ? " hc-accordion-item--open" : ""}`}
                    style={{ animationDelay: `${idx * 40}ms` }}
                  >
                    <button
                      id={`faq-btn-${faq.id}`}
                      className="hc-accordion-trigger"
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${faq.id}`}
                    >
                      <span className="hc-accordion-q">{faq.question}</span>
                      <span className="hc-accordion-chevron">
                        {isOpen ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </span>
                    </button>
                    <div
                      id={`faq-panel-${faq.id}`}
                      role="region"
                      aria-labelledby={`faq-btn-${faq.id}`}
                      className="hc-accordion-panel"
                    >
                      <div className="hc-accordion-inner">
                        <p className="hc-accordion-answer">{faq.answer}</p>
                        <div className="hc-accordion-footer">
                          <span className="hc-accordion-helpful-label">
                            Was this helpful?
                          </span>
                          <button className="hc-helpful-btn">👍 Yes</button>
                          <button className="hc-helpful-btn">👎 No</button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Contact Support ── */}
        <section className="hc-section">
          <h2 className="hc-section-title">Still need help?</h2>
          <p className="hc-section-sub">
            Our support team is available to assist you.
          </p>
          <div className="hc-contact-grid">
            {/* Live Chat */}
            <div className="hc-contact-card hc-contact-card--chat">
              <div className="hc-contact-icon-wrap hc-contact-icon--chat">
                <MessageSquare size={28} />
              </div>
              <div className="hc-contact-body">
                <h3 className="hc-contact-title">Live Chat</h3>
                <p className="hc-contact-desc">
                  Chat with a support agent in real-time. Average response time
                  is under 2 minutes. Available 24/7.
                </p>
                <div className="hc-contact-meta">
                  <span className="hc-online-dot" />
                  <span className="hc-online-label">Online now</span>
                </div>
              </div>
              <button id="start-live-chat" className="hc-contact-btn hc-contact-btn--primary">
                Start Chat
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Email Support */}
            <div className="hc-contact-card hc-contact-card--email">
              <div className="hc-contact-icon-wrap hc-contact-icon--email">
                <Mail size={28} />
              </div>
              <div className="hc-contact-body">
                <h3 className="hc-contact-title">Email Support</h3>
                <p className="hc-contact-desc">
                  Send us a detailed message and we'll get back to you within
                  24 hours on business days.
                </p>
                <div className="hc-contact-meta">
                  <Star size={14} className="hc-star-icon" />
                  <span className="hc-online-label">4.9/5 satisfaction rate</span>
                </div>
              </div>
              <button id="send-email-support" className="hc-contact-btn hc-contact-btn--secondary">
                Send Email
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ── Scoped Styles ── */}
      <style>{`
        /* ── Root ── */
        .hc-root {
          display: flex;
          flex-direction: column;
          gap: 3rem;
          padding: 1.5rem 0 3rem;
          min-height: 100%;
        }

        /* ── Hero ── */
        .hc-hero {
          position: relative;
          border-radius: 1.5rem;
          overflow: hidden;
          background: linear-gradient(135deg,
            rgba(139, 92, 246, 0.15) 0%,
            rgba(59, 130, 246, 0.10) 50%,
            rgba(16, 185, 129, 0.08) 100%
          );
          border: 1px solid rgba(139, 92, 246, 0.2);
          padding: 3.5rem 2rem;
          text-align: center;
        }

        .hc-hero-glow {
          position: absolute;
          top: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 480px;
          height: 280px;
          background: radial-gradient(
            ellipse at center,
            rgba(139, 92, 246, 0.25) 0%,
            transparent 70%
          );
          pointer-events: none;
        }

        .hc-hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .hc-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.9rem;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.35);
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a78bfa;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .hc-hero-title {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 800;
          background: linear-gradient(135deg, #e2d9f3 0%, #a78bfa 50%, #60a5fa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          line-height: 1.2;
        }

        .hc-hero-subtitle {
          color: rgba(203, 213, 225, 0.8);
          font-size: 1rem;
          margin: 0;
          max-width: 480px;
        }

        /* ── Search ── */
        .hc-search-wrapper {
          position: relative;
          width: 100%;
          max-width: 580px;
          margin-top: 0.5rem;
        }

        .hc-search-icon {
          position: absolute;
          left: 1.1rem;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(148, 163, 184, 0.7);
          pointer-events: none;
        }

        .hc-search-input {
          width: 100%;
          padding: 0.95rem 3rem 0.95rem 3.2rem;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 0.9rem;
          color: #e2e8f0;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          box-sizing: border-box;
          backdrop-filter: blur(8px);
        }

        .hc-search-input::placeholder {
          color: rgba(148, 163, 184, 0.5);
        }

        .hc-search-input:focus {
          border-color: rgba(139, 92, 246, 0.6);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12), 0 4px 24px rgba(139, 92, 246, 0.1);
          background: rgba(15, 23, 42, 0.9);
        }

        .hc-search-clear {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(148, 163, 184, 0.15);
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          color: #94a3b8;
          font-size: 0.7rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, color 0.15s;
        }

        .hc-search-clear:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        /* ── Section ── */
        .hc-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .hc-section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0;
        }

        .hc-section-sub {
          color: rgba(148, 163, 184, 0.8);
          font-size: 0.92rem;
          margin: -0.75rem 0 0;
        }

        /* ── Category Cards ── */
        .hc-categories-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 900px) {
          .hc-categories-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 580px) {
          .hc-categories-grid { grid-template-columns: 1fr; }
        }

        .hc-cat-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.3rem 1.2rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1rem;
          cursor: pointer;
          text-align: left;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s, background 0.2s;
          position: relative;
          overflow: hidden;
        }

        .hc-cat-card::before {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0;
          background: linear-gradient(135deg, rgba(139,92,246,0.06), transparent);
          transition: opacity 0.2s;
          border-radius: inherit;
        }

        .hc-cat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          background: rgba(15, 23, 42, 0.8);
        }

        .hc-cat-card:hover::before { opacity: 1; }

        .hc-cat-icon-wrap {
          flex-shrink: 0;
          width: 52px;
          height: 52px;
          border-radius: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #c4b5fd;
          border: 1px solid rgba(255,255,255,0.07);
        }

        .hc-cat-body {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .hc-cat-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #e2e8f0;
        }

        .hc-cat-desc {
          font-size: 0.8rem;
          color: rgba(148, 163, 184, 0.75);
          line-height: 1.45;
        }

        .hc-cat-arrow {
          flex-shrink: 0;
          color: rgba(148, 163, 184, 0.4);
          margin-top: 2px;
          transition: color 0.2s, transform 0.2s;
        }

        .hc-cat-card:hover .hc-cat-arrow {
          color: #a78bfa;
          transform: translateX(3px);
        }

        /* ── Accordion ── */
        .hc-accordion {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .hc-accordion-item {
          background: rgba(15, 23, 42, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 0.9rem;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s;
          animation: hc-fade-in 0.35s ease both;
        }

        @keyframes hc-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .hc-accordion-item--open {
          border-color: rgba(139, 92, 246, 0.35);
          box-shadow: 0 4px 20px rgba(139, 92, 246, 0.08);
          background: rgba(15, 23, 42, 0.8);
        }

        .hc-accordion-trigger {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.1rem 1.4rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }

        .hc-accordion-trigger:hover {
          background: rgba(139, 92, 246, 0.05);
        }

        .hc-accordion-q {
          font-size: 0.97rem;
          font-weight: 600;
          color: #e2e8f0;
          flex: 1;
          line-height: 1.4;
        }

        .hc-accordion-chevron {
          flex-shrink: 0;
          color: #a78bfa;
          display: flex;
          align-items: center;
          transition: transform 0.2s;
        }

        /* Smooth open/close using grid-template-rows trick */
        .hc-accordion-panel {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s ease;
        }

        .hc-accordion-item--open .hc-accordion-panel {
          grid-template-rows: 1fr;
        }

        .hc-accordion-inner {
          overflow: hidden;
          min-height: 0;
        }

        .hc-accordion-answer {
          color: rgba(148, 163, 184, 0.9);
          font-size: 0.9rem;
          line-height: 1.75;
          padding: 0 1.4rem;
          margin: 0;
        }

        .hc-accordion-footer {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.9rem 1.4rem 1.1rem;
          border-top: 1px solid rgba(255,255,255,0.04);
          margin-top: 1rem;
        }

        .hc-accordion-helpful-label {
          font-size: 0.78rem;
          color: rgba(148, 163, 184, 0.5);
          margin-right: 0.25rem;
        }

        .hc-helpful-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 0.25rem 0.75rem;
          font-size: 0.78rem;
          color: rgba(148, 163, 184, 0.8);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, color 0.15s;
        }

        .hc-helpful-btn:hover {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
          color: #c4b5fd;
        }

        /* ── No Results ── */
        .hc-no-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 3rem;
          text-align: center;
          background: rgba(15, 23, 42, 0.4);
          border: 1px dashed rgba(255,255,255,0.08);
          border-radius: 1rem;
          color: rgba(148, 163, 184, 0.7);
          font-size: 0.95rem;
        }

        .hc-no-results p { margin: 0; }

        .hc-no-results-icon {
          color: rgba(148, 163, 184, 0.3);
        }

        .hc-link-btn {
          background: none;
          border: none;
          color: #a78bfa;
          cursor: pointer;
          font-size: 0.9rem;
          text-decoration: underline;
          padding: 0;
        }

        /* ── Contact Section ── */
        .hc-contact-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        @media (max-width: 640px) {
          .hc-contact-grid { grid-template-columns: 1fr; }
        }

        .hc-contact-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          padding: 1.75rem;
          border-radius: 1.25rem;
          border: 1px solid;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .hc-contact-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
        }

        .hc-contact-card--chat {
          background: linear-gradient(135deg,
            rgba(139, 92, 246, 0.12) 0%,
            rgba(59, 130, 246, 0.07) 100%
          );
          border-color: rgba(139, 92, 246, 0.25);
        }

        .hc-contact-card--email {
          background: linear-gradient(135deg,
            rgba(16, 185, 129, 0.10) 0%,
            rgba(5, 150, 105, 0.06) 100%
          );
          border-color: rgba(16, 185, 129, 0.25);
        }

        .hc-contact-icon-wrap {
          width: 54px;
          height: 54px;
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .hc-contact-icon--chat {
          background: linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2));
          color: #c4b5fd;
        }

        .hc-contact-icon--email {
          background: linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2));
          color: #6ee7b7;
        }

        .hc-contact-body {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .hc-contact-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #e2e8f0;
          margin: 0;
        }

        .hc-contact-desc {
          font-size: 0.875rem;
          color: rgba(148, 163, 184, 0.8);
          line-height: 1.6;
          margin: 0;
        }

        .hc-contact-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .hc-online-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 6px rgba(52, 211, 153, 0.6);
          animation: hc-pulse 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes hc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.85); }
        }

        .hc-online-label {
          font-size: 0.78rem;
          color: rgba(148, 163, 184, 0.65);
        }

        .hc-star-icon {
          color: #fbbf24;
        }

        .hc-contact-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.7rem 1.3rem;
          border-radius: 0.7rem;
          font-size: 0.9rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
          width: fit-content;
        }

        .hc-contact-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.1);
        }

        .hc-contact-btn:active { transform: translateY(0); }

        .hc-contact-btn--primary {
          background: linear-gradient(135deg, #7c3aed, #4f46e5);
          color: #fff;
          box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
        }

        .hc-contact-btn--secondary {
          background: linear-gradient(135deg, #059669, #0d9488);
          color: #fff;
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);
        }
      `}</style>
    </DashboardLayout>
  );
}
