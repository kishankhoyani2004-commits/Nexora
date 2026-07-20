import { Logo } from "@/components/layout/Logo";

const COLUMNS = [
  {
    title: "Solutions",
    links: ["Find Talent", "Find Work", "AI Matchmaking", "Job Descriptions"],
  },
  {
    title: "Company",
    links: ["About Us", "Careers", "Resources", "Contact"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
  },
  {
    title: "Community",
    links: ["Freelancer Tips", "Success Stories", "Global Network"],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-card">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-ink-500">
              Connecting the world's best talent with forward-thinking companies through AI-powered
              precision matching.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-ink-500 hover:text-ink-900">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-surface-border pt-6 text-xs text-ink-400 sm:flex-row">
          <p>© 2026 Nexora AI Marketplace. All rights reserved.</p>
          <p>Made for freelancers, by freelancers.</p>
        </div>
      </div>
    </footer>
  );
}
