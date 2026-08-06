// Job.category is a free-text field, so real data has near-duplicate values
// from inconsistent seeding/posting (e.g. "AI & ML" vs "AI & Machine
// Learning"). This taxonomy merges those into a fixed set of canonical
// categories so /api/public/categories can report clean, de-duplicated
// counts instead of a messy list of raw strings.
//
// `matchers` are case-insensitive substrings matched against a job's
// `category` (and a freelancer's `title`/`skills` for freelancer counts) —
// a match on ANY matcher assigns that document to the category.
export const CATEGORY_TAXONOMY = [
  {
    slug: "web-development",
    label: "Web Development",
    icon: "Code2",
    matchers: ["web development", "frontend", "backend", "full stack"],
  },
  {
    slug: "mobile-development",
    label: "Mobile Development",
    icon: "Smartphone",
    matchers: ["mobile"],
  },
  {
    slug: "ai-machine-learning",
    label: "AI & Machine Learning",
    icon: "Sparkles",
    matchers: ["ai &", "ai and", "machine learning", "artificial intelligence"],
  },
  {
    slug: "data-science",
    label: "Data Science & Analytics",
    icon: "BarChart3",
    matchers: ["data science", "analytics", "data analysis"],
  },
  {
    slug: "ui-ux-design",
    label: "UI/UX Design",
    icon: "Palette",
    matchers: ["ui/ux", "ui ux", "product design"],
  },
  {
    slug: "graphic-design-video",
    label: "Graphic Design & Video",
    icon: "Layers",
    matchers: ["graphic design", "video editing", "video &", "animation", "motion"],
  },
  {
    slug: "content-writing-seo",
    label: "Content Writing & SEO",
    icon: "PenTool",
    matchers: ["content writing", "content &", "seo", "copywriting"],
  },
  {
    slug: "devops-cloud",
    label: "DevOps & Cloud Engineering",
    icon: "Cloud",
    matchers: ["devops", "cloud engineering", "cloud &", "infrastructure"],
  },
  {
    slug: "cyber-security",
    label: "Cyber Security",
    icon: "ShieldCheck",
    matchers: ["cyber security", "cybersecurity", "security"],
  },
  {
    slug: "blockchain-web3",
    label: "Blockchain & Web3",
    icon: "Link2",
    matchers: ["blockchain", "web3", "smart contract"],
  },
  {
    slug: "finance-accounting",
    label: "Finance & Accounting",
    icon: "DollarSign",
    matchers: ["finance", "accounting", "bookkeeping"],
  },
  {
    slug: "virtual-assistant",
    label: "Virtual Assistant",
    icon: "Headset",
    matchers: ["virtual assistant", "admin support"],
  },
];

/** Case-insensitive regex alternation of every matcher across the whole taxonomy. */
export function categoryRegex(matchers) {
  const escaped = matchers.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(escaped.join("|"), "i");
}

/** Maps a raw free-text category/skill/title string to a canonical slug, or null if no match. */
export function resolveCategorySlug(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const cat of CATEGORY_TAXONOMY) {
    if (cat.matchers.some((m) => lower.includes(m))) return cat.slug;
  }
  return null;
}
