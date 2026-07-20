import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
let aiInstance = null;

if (apiKey) {
  aiInstance = new GoogleGenerativeAI(apiKey);
} else {
  console.log("⚠️ [GEMINI] GEMINI_API_KEY missing. Falling back to local generative simulation model.");
}

export const generateText = async (prompt, systemInstruction = "", history = []) => {
  try {
    if (aiInstance) {
      const cleanInstruction = (systemInstruction || "You are Nexora AI, a professional freelance assistant.") + 
        " IMPORTANT: Do not output raw markdown headers like ### or nested formatting markers like ***. Use clean CAPITALIZED text headers instead.";

      const model = aiInstance.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: cleanInstruction,
      });

      // Filter and format history to ensure correct Gemini format: { role: 'user'|'model', parts: [{ text: string }] }
      const formattedHistory = history.map(h => ({
        role: h.role === "assistant" || h.role === "model" ? "model" : "user",
        parts: [{ text: h.content || h.parts?.[0]?.text || "" }]
      }));

      const chat = model.startChat({
        history: formattedHistory,
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      // Post-process response to ensure no leaked raw tags
      return rawText
        .replace(/###/g, "")
        .replace(/\*\*\*/g, "")
        .replace(/##/g, "");
    } else {
      // High-quality fallback simulation based on keywords
      const promptLower = prompt.toLowerCase();
      if (promptLower.includes("proposal")) {
        let matchedTitle = "your project";
        const titleMatch = prompt.match(/applying for the job:\s*"([^"]+)"/i);
        if (titleMatch && titleMatch[1]) {
          matchedTitle = titleMatch[1];
        }

        const descMatch = prompt.match(/Job Description:\s*"([^"]+)"/i);
        const descText = descMatch ? descMatch[1] : "";
        const descLower = descText.toLowerCase() + " " + matchedTitle.toLowerCase();

        let coreSkills = ["Full-stack Node.js development", "React & responsive UI design", "Database query optimization"];
        let roadmap = [
          {
            name: "PROTOTYPE & ARCHITECTURE BLUEPRINT",
            desc: "Setup repository, database models, initial layouts routing, and verify core communication adapters."
          },
          {
            name: "CORE FEATURES & API INTEGRATIONS",
            desc: "Develop full business logic, security controllers, client-facing screens, and third-party integrations."
          },
          {
            name: "DEPLOYMENT & QA TESTING",
            desc: "Conduct detailed unit/integration testing, optimize page load latency, and release production bundle."
          }
        ];

        if (descLower.includes("ai") || descLower.includes("ml") || descLower.includes("llama") || descLower.includes("rag") || descLower.includes("openai") || descLower.includes("gemini")) {
          coreSkills = [
            "Generative AI API integration & custom LLM prompt setups",
            "Fine-tuning open source models (e.g. Llama 3) & weights consolidation",
            "Retrieval-Augmented Generation (RAG) using Pinecone, Chroma, and embeddings"
          ];
          roadmap = [
            { name: "MODEL TUNING & VECTOR INDEX SETUP", desc: "Instantiate vector index schemas, fine-tune target models, and build dataset tokenization pipelines." },
            { name: "CORE INFERENCE API & RAG MIDDLEWARE", desc: "Construct context injection middleware, query routing handlers, and secure inference endpoints." },
            { name: "LATENCY OPTIMIZATION & PRODUCTION RELEASE", desc: "Optimize token streaming responses, evaluate retrieval accuracy, and launch model endpoints." }
          ];
        } else if (descLower.includes("frontend") || descLower.includes("react") || descLower.includes("tailwind")) {
          coreSkills = [
            "Pixel-perfect Figma to React interactive component translations",
            "Tailwind CSS responsive design layout grids & layout containers",
            "Client-side state managers (React Query, Redux) & micro-animations"
          ];
          roadmap = [
            { name: "THEME CONFIGURATION & WIREFRAMES", desc: "Configure global CSS tokens, component libraries setup, and wireframe pages router layout." },
            { name: "INTERACTIVE UI MODULES & API BINDINGS", desc: "Build out interactive dashboard tables, visual charts, and bind endpoints to queries." },
            { name: "CROSS-DEVICE QA & PERFORMANCE TUNING", desc: "Review performance scores, check mobile viewports rendering, and deploy minified assets bundle." }
          ];
        }

        return `TAILORED AI PROPOSAL FOR: ${matchedTitle.toUpperCase()}

Dear Client,

I am writing to submit my proposal for the "${matchedTitle}" position. Having reviewed your project requirements and description in detail, I am confident that I can deliver a world-class solution matching your exact technical specifications.

Why I am the Perfect Fit for this Project:
${coreSkills.map(skill => `- ${skill}: Aligned directly with your project deliverables.`).join("\n")}
- Clean Architecture & Scalability: I focus on writing high-performance, modular, and well-documented code that is easy to maintain.
- Fast Execution & Communication: I provide daily status reports, run weekly demos, and stay fully available inside the Project Workspace.

Proposed Project Milestones & Roadmap:
${roadmap.map((m, idx) => `${idx + 1}. Milestone ${idx + 1}: ${m.name}\n   - ${m.desc}`).join("\n")}

I would love to set up a short 10-minute technical call to align on the scope and finalize our action items.

Best regards,
Your Nexora AI Proposal Writer`;
      }

      if (promptLower.includes("job description") || promptLower.includes("hiring")) {
        let title = "Senior Software Engineer";
        if (promptLower.includes("react") || promptLower.includes("frontend")) title = "Senior Frontend Developer (React)";
        else if (promptLower.includes("node") || promptLower.includes("backend")) title = "Senior Backend Architect (Node.js)";

        return `JOB DESCRIPTION SPECIFICATION: ${title.toUpperCase()}

Role Overview:
We are looking for a top-tier ${title} to scale our flagship software platform. You will be responsible for defining technical layouts, optimizing latency profiles, and collaborating with cross-functional product leads.

Key Technical Requirements:
- 5+ years of verified software development experience in complex environments.
- Deep expertise in system scaling models, database queries, and security protocols.
- Proactive communication, team mentoring capability, and sprint-based project delivery focus.

Key Responsibilities & Deliverables:
- Code reusable, modular, and well-tested services.
- Design database indexes, optimize API query latency, and manage cloud assets.
- Lead system refactoring, resolve blocker tickets, and submit weekly progress audits.`;
      }

      if (promptLower.includes("career") || promptLower.includes("advice") || promptLower.includes("coaching") || promptLower.includes("pivot")) {
        return `NEXORA AI CAREER DEVELOPMENT BLUEPRINT

To succeed as a high-earning freelancer in the modern market, you need a combination of niche technical authority and strategic business pricing:

1. Market Position Strategy:
- Move away from generic titles like "Full Stack Developer". Position yourself as a specialist, e.g., "AI Integrations Engineer" or "High-Performance Next.js Architect".
- Curate your portfolio to showcase exactly 3 complex case studies rather than 10 simple demo apps. Focus on detailing the business impact (e.g., "optimized database query speed by 40%").

2. Premium Pricing Model:
- Value-Based Pricing: Stop charging simple hourly rates. Offer fixed-scope milestone packages. It aligns your incentives with client deliverables.
- Retainer Packages: Introduce post-launch support agreements (e.g., security monitoring, database maintenance) to build reliable recurring monthly income.

3. Actionable 6-Month Skill Roadmap:
- Month 1-2: Master Vector Databases (Pinecone, Chroma) and Semantic Search configurations.
- Month 3-4: Learn serverless API endpoints integration, caching strategies (Redis), and edge routing.
- Month 5-6: Study containerized deployments (Docker, Kubernetes) and automated release management pipelines (CI/CD).`;
      }

      if (promptLower.includes("skill") || promptLower.includes("recommendation") || promptLower.includes("suggest")) {
        return `NEXORA AI SKILL PATH RECOMMENDATIONS

Here is the strategic stack recommendation to focus on for maximizing project values:

1. AI Vector Core: Pinecone, ChromaDB, OpenAI/Gemini SDKs, RAG pipelines (Retrieval-Augmented Generation).
2. State & Query Caching: React Query (TanStack Query) for data fetching, and Redis for server caching.
3. Robust Backend API Architecture: NestJS / Fastify for enterprise APIs, and Mongoose indexing optimization.
4. DevOps & Containers: Docker file writing, AWS Elastic Container Service (ECS), and GitHub Actions CI/CD workflows.
5. UI & Interactive CSS Components: Tailwind CSS grids container setups, and Framer Motion micro-animations.`;
      }

      if (promptLower.includes("strategy") || promptLower.includes("roadmap") || promptLower.includes("plan")) {
        return `AI STRATEGIC LAUNCH ROADMAP

Here is the step-by-step strategic plan to bootstrap and deploy your next freelance project or SaaS platform:

Phase 1: Database Model & Core API Scaffolding (Week 1)
- Draft the mongoose schemas, setup relational collections, and build secure JWT authentication middleware.
- Configure Axios client endpoints and map the API routes wrapper.

Phase 2: UI State Bindings & Cache Setup (Week 2)
- Setup React Query providers, build global navigation layouts, and integrate standard forms.
- Configure local/session storage caching for rapid page rehydration.

Phase 3: Service Integration & AI Middleware (Week 3)
- Connect the external AI endpoints, wire up file upload multer controllers, and write data sanitizers.
- Build progress notification toasts and transaction escrow boards.

Phase 4: Optimization, Auditing & Release (Week 4)
- Minify asset chunks, configure production environment variables, run Lighthouse performance scores audits, and launch on a secure VPS/AWS stack.`;
      }

      if (promptLower.includes("resume") || promptLower.includes("audit") || promptLower.includes("analysis")) {
        return `RESUME AUDIT SUMMARY REPORT

Overall Resume Score: 84/100 (Strong Baseline)

Core Observations:
- Strengths: Solid listing of modern technologies (React, Node.js, Express) and clean layout structures.
- Weaknesses: Needs more quantitative metrics. Instead of saying "worked on database", say "restructured database queries, reducing API latency by 35%".

Actionable Optimization Steps:
1. ATS Compatibility: Ensure headers use standard layout blocks (e.g. "Work Experience" instead of "Where I've Been").
2. Link Verification: Embed working GitHub repo links directly under each listed project.
3. Core Expertise: Clearly highlight AI/ML library experience (e.g. Gemini, LangChain) at the top of the stack.`;
      }

      if (promptLower.includes("react query") || promptLower.includes("useeffect")) {
        return `REACT QUERY VS USEEFFECT DATA FETCHING COMPARISON

Here is why you should choose React Query over standard useEffect blocks in production apps:

\`\`\`tsx
// ❌ The old way (useEffect)
useEffect(() => {
  setLoading(true);
  fetch("/api/data")
    .then(res => res.json())
    .then(data => { setData(data); setLoading(false); })
  // No caching, duplicate API queries, manual loader states
}, []);

//  The React Query way (Declarative Caching)
const { data, isLoading } = useQuery({
  queryKey: ["myData"],
  queryFn: () => apiClient.get("/api/data").then(res => res.data)
});
// Cached memory, automated rehydration, background sync
\`\`\``;
      }

      if (promptLower.includes("hello") || promptLower.includes("hi ") || promptLower.includes("hey")) {
        return `Hello! I am Nexora AI, your expert freelance development assistant.

I can help you:
- Draft high-converting client proposals (e.g., ask: "Write a proposal for a Python Web Scraper").
- Write detailed job descriptions (e.g., ask: "Write a job description for a React Developer").
- Generate strategic project roadmaps (e.g., click "Project Strategy" below).
- Audit your resume (click "Upload Resume" below to scan a document).
- Recommend technical skill upgrades (click "Recommend Skills" below).

Let me know what you would like to construct today!`;
      }

      return `NEXORA AI TECHNICAL ASSISTANT

I am here to help you solve coding blocks and build SaaS products. Here is some support documentation:

1. Secure API Requests
Always make sure to attach the bearer token headers inside Axios hooks:
\`\`\`ts
headers: { Authorization: \`Bearer \${token}\` }
\`\`\`

2. Database Security
Never expose raw database credentials. Store the MongoDB URI inside variables:
\`\`\`env
MONGO_URI=mongodb://127.0.0.1:27017/nexora
\`\`\`

3. State Management
Store global user contexts inside React Context providers, and bind layout panels to state hooks.

How else can I assist you with your platform development today?`;
    }
  } catch (error) {
    console.error("Gemini AI API Error:", error.message);
    throw error;
  }
};
