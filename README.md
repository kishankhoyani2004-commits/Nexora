# Nexora — AI-Powered Freelance Marketplace

Production-quality frontend for **Nexora**, built as a Final Year Major Project.
React 19 + TypeScript + Vite + Tailwind CSS + React Router + TanStack Query +
React Hook Form + Zod + Framer Motion + Lucide Icons + Recharts.

The UI is built from the provided design screens (Landing, Auth, Client &
Freelancer Dashboards, Job Posting, Browse Jobs, Proposals, Messaging,
Workspace, Freelancer Profile, Admin Panel, AI Assistant) and is fully wired
for a Node.js + Express + MongoDB backend to be plugged in later.

---

## 1. Requirements

- **Node.js 18+** (Node 20 LTS recommended) — https://nodejs.org
- **npm** (comes with Node.js)

Check your versions:

```bash
node -v
npm -v
```

## 2. Getting the project running

1. Unzip the folder anywhere on your computer.
2. Open a terminal in that folder (the one containing `package.json`).
3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open the URL shown in the terminal — usually:

   ```
   http://localhost:5173
   ```

That's it — the whole app runs locally, no backend required, using realistic
mock data so every screen is fully explorable.

### Demo logins

On the Login page, any password works with these emails:

| Role       | Email                  |
|------------|-------------------------|
| Client     | client@nexora.com       |
| Freelancer | freelancer@nexora.com   |
| Admin      | admin@nexora.com        |

You can also just sign up as a new Client or Freelancer from the Sign Up page.

## 3. Building for production

```bash
npm run build
```

Output is generated in `dist/`. Preview the production build locally with:

```bash
npm run preview
```

## 4. Connecting the real backend later

All data currently comes from `src/constants/mockData.ts` and the
`AuthContext`. To connect a real Node.js + Express + MongoDB API:

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to your API's URL.
2. Implement the matching REST routes described in each file under
   `src/services/*.service.ts` (e.g. `POST /api/auth/login`).
3. Swap the mock calls in `AuthContext.tsx` and page components for the real
   `*.service.ts` calls (they're already written, typed, and imported —
   just call them instead of the mock helpers).

No architectural changes are required — services, types, and API client
(`src/lib/axios.ts`) are already backend-ready.

## 5. Project structure

```
src/
├── assets/            Static assets
├── components/
│   ├── common/         Shared small components (ToastContainer, etc.)
│   ├── ui/              Design-system primitives (Button, Input, Modal, ...)
│   ├── forms/           Form-specific building blocks
│   ├── cards/            StatCard, JobCard, FreelancerCard, ActivityFeed...
│   ├── dashboard/       Dashboard-only widgets
│   ├── layout/            Navbar, Sidebar, DashboardLayout, Footer...
│   └── charts/            Recharts wrappers for each dashboard chart
├── pages/                One folder per feature area (auth, client, admin...)
├── layouts/              AuthLayout, AdminLayout
├── routes/                AppRoutes.tsx, ProtectedRoute.tsx
├── services/              Axios placeholder methods, one file per resource
├── hooks/                 useDebounce, useDisclosure
├── context/               AuthContext, ThemeContext, NotificationContext
├── types/                  Shared TypeScript interfaces
├── constants/              routes.ts, nav.ts, mockData.ts
├── utils/                   cn.ts, formatters.ts
├── lib/                     axios.ts (central API client)
├── App.tsx
└── main.tsx
```

## 6. Notes for the report / demo

- **Roles**: Client, Freelancer, and Admin each get a dedicated dashboard and
  protected routes (`ProtectedRoute` + `AuthContext`).
- **AI Assistant**: fully independent placeholder UI — see
  `src/services/ai.service.ts` for the exact functions the backend needs to
  implement (`generateProposal`, `generateJobDescription`, `resumeAnalysis`,
  `careerAdvice`, `skillRecommendation`).
- **Accessibility**: semantic landmarks, labelled inputs, keyboard-visible
  focus rings, and alt text throughout.
- **Responsiveness**: every page is responsive down to mobile widths.
