import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";
import Message from "../models/Message.js";
import WorkspaceTask from "../models/WorkspaceTask.js";
import WorkspaceFile from "../models/WorkspaceFile.js";
import Notification from "../models/Notification.js";
import Milestone from "../models/Milestone.js";
import Deliverable from "../models/Deliverable.js";
import TimeLog from "../models/TimeLog.js";
import Review from "../models/Review.js";

dotenv.config();

// ── Realistic client companies ─────────────────────────────────────────────
const CLIENT_PROFILES = [
  { fullName: "Arjun Mehta", company: "PixelForge Studio",      rating: 4.9, paymentVerified: true  },
  { fullName: "Sarah Mitchell", company: "Orion Tech Solutions", rating: 4.8, paymentVerified: true  },
  { fullName: "James Chen", company: "BlueWave Labs",            rating: 4.7, paymentVerified: true  },
  { fullName: "Priya Sharma", company: "Zenith Digital",         rating: 4.9, paymentVerified: true  },
  { fullName: "Michael Torres", company: "NimbusOps Inc",        rating: 4.6, paymentVerified: false },
  { fullName: "Emma Roberts", company: "Prism Digital",          rating: 4.8, paymentVerified: true  },
  { fullName: "Rohan Verma", company: "CodeCraft Agency",        rating: 4.5, paymentVerified: true  },
  { fullName: "Lisa Park", company: "GrowthHive",                rating: 4.7, paymentVerified: false },
  { fullName: "David Wilson", company: "SkyNet Ventures",        rating: 4.9, paymentVerified: true  },
  { fullName: "Ananya Kapoor", company: "Forge Studio",          rating: 4.6, paymentVerified: true  },
];

// ── 50 Job Templates ──────────────────────────────────────────────────────
const JOB_TEMPLATES = [
  // ─ Full Stack Development (8 jobs) ──────────────────────────────────────
  { title: "AI-Powered SaaS Dashboard", category: "Full Stack Development",
    description: "Build a responsive analytics portal using Next.js, TailwindCSS, and Node.js. Integrate OpenAI API to summarise records and show predictive insights.",
    budgetMin: 280000, budgetMax: 480000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Next.js","Node.js","OpenAI API","TailwindCSS","PostgreSQL"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 7 },

  { title: "E-Commerce Multi-Vendor Marketplace", category: "Full Stack Development",
    description: "Develop a multi-vendor marketplace with Stripe split billing, automatic vendor payouts, commission management, and product listing system.",
    budgetMin: 360000, budgetMax: 640000, priceType: "fixed", experienceLevel: "expert",
    skills: ["React","Express","Stripe Connect","MongoDB","Redux"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 12 },

  { title: "Real-Time Chat & Support Desk System", category: "Full Stack Development",
    description: "Create a customer support chat with agent routing, typing indicators, auto-canned replies, and full customer history. Uses Socket.IO and Redis.",
    budgetMin: 160000, budgetMax: 280000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["React","Node.js","Socket.IO","Redis","MongoDB"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 5 },

  { title: "Next.js Job Board Platform", category: "Full Stack Development",
    description: "Develop a niche job search platform with search filters, resume parsing, applicant profiles, and Stripe payment integration for premium postings.",
    budgetMin: 144000, budgetMax: 240000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Next.js","TailwindCSS","Prisma","PostgreSQL","Stripe"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: false, proposalsCount: 9 },

  { title: "Collaborative Whiteboard Application", category: "Full Stack Development",
    description: "Develop a multi-user real-time whiteboarding canvas. Features: draw, sticky notes, export to SVG, live comments. Canvas API + Socket.IO.",
    budgetMin: 320000, budgetMax: 560000, priceType: "fixed", experienceLevel: "expert",
    skills: ["TypeScript","Canvas API","Socket.IO","React","Node.js"], duration: "1-3 months",
    location: "Bangalore, India", workType: "hybrid", clientRating: 4.9, paymentVerified: true, proposalsCount: 4 },

  { title: "Healthcare Appointment Booking System", category: "Full Stack Development",
    description: "Build a HIPAA-compliant clinic booking platform with doctor availability calendars, patient records, SMS reminders, and payment gateway.",
    budgetMin: 400000, budgetMax: 720000, priceType: "fixed", experienceLevel: "expert",
    skills: ["React","Node.js","PostgreSQL","Twilio","Stripe"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 6 },

  { title: "School LMS with Video Streaming", category: "Full Stack Development",
    description: "Create a learning management system with course builder, video hosting, quiz engine, student progress tracking, and certificate generation.",
    budgetMin: 480000, budgetMax: 800000, priceType: "fixed", experienceLevel: "expert",
    skills: ["React","Node.js","AWS S3","HLS Streaming","MongoDB"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 11 },

  { title: "Social Media Analytics Dashboard", category: "Full Stack Development",
    description: "Connect to Instagram, Twitter, and LinkedIn APIs. Visualise engagement metrics, follower growth, post performance, and export PDF reports.",
    budgetMin: 200000, budgetMax: 360000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["React","Node.js","Recharts","Twitter API","MongoDB"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 8 },

  // ─ Frontend Development (6 jobs) ─────────────────────────────────────────
  { title: "Figma to React — Pixel-Perfect Conversion", category: "Frontend Development",
    description: "Convert a high-fidelity Figma dashboard into clean, modular Tailwind CSS components inside a Next.js workspace. Strict responsive layout checks.",
    budgetMin: 2800, budgetMax: 4800, priceType: "hourly", experienceLevel: "intermediate",
    skills: ["React","Next.js","TailwindCSS","Figma"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 15 },

  { title: "Web3 Interactive Landing Page", category: "Frontend Development",
    description: "Build a glassmorphic marketing landing page with smooth Framer Motion animations and wallet connections (RainbowKit/Metamask).",
    budgetMin: 96000, budgetMax: 176000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["React","Framer Motion","Wagmi","Web3.js","TailwindCSS"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 19 },

  { title: "Custom Data Visualisation Widget Library", category: "Frontend Development",
    description: "Create an interactive library of 10+ chart types (Pie, Donut, Line, Area, Radar) using D3.js that accepts live WebSocket data.",
    budgetMin: 120000, budgetMax: 200000, priceType: "fixed", experienceLevel: "expert",
    skills: ["D3.js","React","TypeScript","WebSocket"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 3 },

  { title: "Vue.js ERP Frontend Interface", category: "Frontend Development",
    description: "Refactor old accounting interface into modern Vue 3 application using Pinia state management and Vuetify components.",
    budgetMin: 200000, budgetMax: 320000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Vue 3","Pinia","Vuetify","TypeScript"], duration: "1-3 months",
    location: "Mumbai, India", workType: "hybrid", clientRating: 4.7, paymentVerified: true, proposalsCount: 7 },

  { title: "Angular 17 Enterprise Dashboard Refactor", category: "Frontend Development",
    description: "Upgrade an Angular 12 admin dashboard to Angular 17 with Signals, standalone components, lazy routes, and updated Material Design.",
    budgetMin: 240000, budgetMax: 400000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Angular 17","RxJS","Angular Material","TypeScript"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 5 },

  { title: "Tailwind UI Component Library (50+ Components)", category: "Frontend Development",
    description: "Create a customized collection of 50+ responsive UI components: dropdowns, forms, modals, accordions, tables, all with dark mode.",
    budgetMin: 80000, budgetMax: 144000, priceType: "fixed", experienceLevel: "entry",
    skills: ["TailwindCSS","React","HTML5","CSS3"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 22 },

  // ─ Backend Development (5 jobs) ──────────────────────────────────────────
  { title: "NestJS Microservices Architecture Setup", category: "Backend Development",
    description: "Design and implement a scalable NestJS microservice system communicating via gRPC. Connect Redis for caching and RabbitMQ for message queues.",
    budgetMin: 4000, budgetMax: 7200, priceType: "hourly", experienceLevel: "expert",
    skills: ["NestJS","gRPC","RabbitMQ","Redis","Docker"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 2 },

  { title: "Video Transcoding & HLS Streaming Pipeline", category: "Backend Development",
    description: "Create a scalable backend that accepts video uploads, transcodes via FFmpeg into HLS chunks, and uploads to AWS S3 with CDN delivery.",
    budgetMin: 240000, budgetMax: 400000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Node.js","FFmpeg","AWS S3","Docker","BullMQ"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 4 },

  { title: "RESTful API for Logistics CRM", category: "Backend Development",
    description: "Expose secure REST endpoints for inventory control, order dispatch, and FedEx/UPS carrier integrations. Write OpenAPI/Swagger documentation.",
    budgetMin: 96000, budgetMax: 160000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Express","TypeScript","PostgreSQL","Swagger"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 10 },

  { title: "Real Estate Lead Web Scraper", category: "Backend Development",
    description: "Build a headless Puppeteer crawler to gather real estate listings from public sources weekly. Clean, deduplicate, and store in MongoDB.",
    budgetMin: 64000, budgetMax: 120000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Puppeteer","Node.js","MongoDB","Cron Jobs"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 14 },

  { title: "Django REST Framework API for EdTech Platform", category: "Backend Development",
    description: "Build a fully documented DRF API for a course platform: user auth, course CRUD, enrollment, payment webhooks, and admin panel customisation.",
    budgetMin: 160000, budgetMax: 280000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Django","DRF","PostgreSQL","Celery","Redis"], duration: "1-3 months",
    location: "Hyderabad, India", workType: "hybrid", clientRating: 4.6, paymentVerified: true, proposalsCount: 8 },

  // ─ Mobile App Development (5 jobs) ────────────────────────────────────────
  { title: "React Native Fitness Tracker App", category: "Mobile App Development",
    description: "Cross-platform iOS/Android fitness app integrating Apple HealthKit and Google Fit. Log daily metrics, plot visual workouts, and social challenges.",
    budgetMin: 320000, budgetMax: 560000, priceType: "fixed", experienceLevel: "expert",
    skills: ["React Native","TypeScript","Redux","HealthKit","Google Fit"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 6 },

  { title: "Flutter Real-Time Delivery Tracker", category: "Mobile App Development",
    description: "Flutter mobile client with real-time location mapping using Google Maps API. Tracks active drivers and displays live ETA overlays.",
    budgetMin: 240000, budgetMax: 400000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Flutter","Dart","Google Maps API","Socket.IO","Firebase"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 9 },

  { title: "Native SwiftUI Offline Audio Player", category: "Mobile App Development",
    description: "Native iOS audio player with offline playback, local storage management, sleep timers, and CoreData sync. Target iOS 17+.",
    budgetMin: 200000, budgetMax: 320000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["SwiftUI","CoreData","AVFoundation","iOS"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: false, proposalsCount: 3 },

  { title: "Kotlin Android Social Media Feed App", category: "Mobile App Development",
    description: "Lightweight Android social networking feed using Kotlin, Jetpack Compose, Retrofit for API calls, and Room for local caching.",
    budgetMin: 240000, budgetMax: 360000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Android","Kotlin","Jetpack Compose","Room Database"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: true, proposalsCount: 7 },

  { title: "Uber-like Ride Booking App (React Native)", category: "Mobile App Development",
    description: "Ride booking mobile client with driver/rider maps, real-time socket dispatcher, fare calculation, and in-app payment flows.",
    budgetMin: 400000, budgetMax: 720000, priceType: "fixed", experienceLevel: "expert",
    skills: ["React Native","Redux Toolkit","Socket.IO","Geolocation"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 11 },

  // ─ AI & Machine Learning (5 jobs) ─────────────────────────────────────────
  { title: "Fine-Tune Llama 3 for Legal Summaries", category: "AI & Machine Learning",
    description: "Fine-tune Llama-3-8B with QLoRA on a legal document dataset. Host on HuggingFace and expose a secure FastAPI endpoint.",
    budgetMin: 4800, budgetMax: 8800, priceType: "hourly", experienceLevel: "expert",
    skills: ["Python","PyTorch","HuggingFace","Transformers","QLoRA"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 2 },

  { title: "RAG Pipeline with Pinecone & GPT-4", category: "AI & Machine Learning",
    description: "Build a Retrieval-Augmented Generation pipeline. Ingest PDFs, embed vectors via LangChain, store in Pinecone, query with GPT-4.",
    budgetMin: 160000, budgetMax: 280000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Python","LangChain","Pinecone","OpenAI API","FastAPI"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 5 },

  { title: "YOLOv8 Object Detection for Conveyor Belts", category: "AI & Machine Learning",
    description: "Train a YOLOv8 model to classify conveyor belt items in real time. Integrate with an RTSP video stream and alert dashboard.",
    budgetMin: 240000, budgetMax: 400000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Python","YOLOv8","OpenCV","PyTorch"], duration: "1-3 months",
    location: "Pune, India", workType: "onsite", clientRating: 4.8, paymentVerified: true, proposalsCount: 3 },

  { title: "Sentiment Analyser for Customer Reviews", category: "AI & Machine Learning",
    description: "Text classification model that reads daily customer feedback, identifies sentiment polarity, and flags urgent complaints for support teams.",
    budgetMin: 48000, budgetMax: 96000, priceType: "fixed", experienceLevel: "entry",
    skills: ["Python","NLTK","Scikit-learn","Pandas"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 18 },

  { title: "OpenAI Whisper Transcription & Translation API", category: "AI & Machine Learning",
    description: "Audio upload service that transcribes speech with OpenAI Whisper and translates output into 5 languages. Secured FastAPI endpoints.",
    budgetMin: 120000, budgetMax: 224000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["OpenAI Whisper","FastAPI","Python","Docker"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 7 },

  // ─ UI/UX Design (5 jobs) ──────────────────────────────────────────────────
  { title: "Complete FinTech Mobile App Re-Design", category: "UI/UX Design",
    description: "Modern UX design system and high-fidelity Figma prototype for a financial mobile application. 25 screens, design tokens included.",
    budgetMin: 160000, budgetMax: 280000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Figma","UI Design","UX Wireframing","Prototyping"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 4 },

  { title: "SaaS Telemetry Dashboard Dark-Mode Mockups", category: "UI/UX Design",
    description: "Design mockups for a developer-focused telemetry platform. Emphasis on readability of large datasets and sleek dark mode.",
    budgetMin: 96000, budgetMax: 160000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Figma","SaaS Design","Design System"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 9 },

  { title: "B2B AI Marketing Landing Page Design", category: "UI/UX Design",
    description: "Landing page mockup for a B2B AI marketing startup. Custom illustrations, grid layouts, mobile-responsive, and conversion-optimised.",
    budgetMin: 40000, budgetMax: 72000, priceType: "fixed", experienceLevel: "entry",
    skills: ["Figma","Graphic Design","Responsive Layout"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: false, proposalsCount: 21 },

  { title: "Brand Identity Guide & Digital Asset Kit", category: "UI/UX Design",
    description: "Complete brand kit: logo, typeface, primary colours, email signatures, presentation decks, and social banners. AI Illustrator files.",
    budgetMin: 80000, budgetMax: 144000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Adobe Illustrator","Logo Design","Brand Guidelines"], duration: "Less than 1 month",
    location: "Delhi, India", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 13 },

  { title: "UX Audit & Booking Flow Redesign", category: "UI/UX Design",
    description: "Conduct usability tests on existing booking flow, identify friction points, and deliver wireframe redesigns with a written UX summary.",
    budgetMin: 64000, budgetMax: 112000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Figma","UX Research","Wireframing","Usability Testing"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 6 },

  // ─ DevOps & Cloud Engineering (4 jobs) ───────────────────────────────────
  { title: "Terraform Multi-AZ AWS Cluster Deployment", category: "DevOps & Cloud Engineering",
    description: "Configure Terraform to deploy a multi-AZ AWS VPC, EKS Kubernetes clusters, RDS databases, and secure load balancers.",
    budgetMin: 3200, budgetMax: 6000, priceType: "hourly", experienceLevel: "expert",
    skills: ["Terraform","AWS EKS","VPC Networking","IAM"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 2 },

  { title: "GitHub Actions CI/CD Pipeline for NestJS Monorepo", category: "DevOps & Cloud Engineering",
    description: "Fully automated build-test-deploy pipelines for a NestJS & Next.js monorepo deploying to AWS ECS with blue-green deployment.",
    budgetMin: 64000, budgetMax: 120000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["GitHub Actions","Docker","AWS ECS","Helm"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 5 },

  { title: "Kubernetes Migration & Helm Chart Packaging", category: "DevOps & Cloud Engineering",
    description: "Containerise legacy Node/Python services, write Helm templates, and coordinate zero-downtime deployment to a self-hosted k8s cluster.",
    budgetMin: 240000, budgetMax: 400000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Kubernetes","Docker","Helm Charts","Linux"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 3 },

  { title: "Ubuntu Server Security Hardening & Firewall", category: "DevOps & Cloud Engineering",
    description: "Harden Ubuntu servers: strict firewalls, SSH key protocols, fail2ban, rate-limit protections, and Nginx reverse proxy setup.",
    budgetMin: 48000, budgetMax: 80000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Ubuntu Linux","SSH Security","Fail2Ban","Nginx"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 8 },

  // ─ Data Science & Analytics (4 jobs) ─────────────────────────────────────
  { title: "Power BI Sales Analytics Dashboard", category: "Data Science & Analytics",
    description: "Build an interactive Power BI dashboard connecting to SQL Server, with DAX measures for YoY growth, pipeline forecasting, and executive KPIs.",
    budgetMin: 80000, budgetMax: 144000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Power BI","DAX","SQL Server","Excel"], duration: "Less than 1 month",
    location: "Bangalore, India", workType: "hybrid", clientRating: 4.7, paymentVerified: true, proposalsCount: 10 },

  { title: "Python ETL Pipeline for Data Warehouse", category: "Data Science & Analytics",
    description: "Design and implement an ETL pipeline that ingests data from REST APIs and CSVs, transforms with Pandas, and loads into Redshift.",
    budgetMin: 160000, budgetMax: 280000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Python","Pandas","AWS Redshift","Apache Airflow"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 6 },

  { title: "Tableau Executive Reporting Suite", category: "Data Science & Analytics",
    description: "Create a Tableau reporting suite with 10+ executive dashboards tracking revenue, churn, engagement, and NPS scores from multiple data sources.",
    budgetMin: 96000, budgetMax: 160000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Tableau","SQL","Data Visualisation","Excel"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 7 },

  { title: "Customer Churn Prediction ML Model", category: "Data Science & Analytics",
    description: "Build a churn prediction model using XGBoost/LightGBM on customer transaction data. Deliver model explanation dashboard with SHAP values.",
    budgetMin: 120000, budgetMax: 200000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Python","XGBoost","SHAP","Scikit-learn","Jupyter"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: false, proposalsCount: 4 },

  // ─ Content, SEO & Marketing (4 jobs) ─────────────────────────────────────
  { title: "SEO Content Writer — Tech & SaaS Blog", category: "Content & SEO",
    description: "Write 8 long-form SEO-optimised articles (2000+ words each) per month for a B2B SaaS company. Keyword research provided. Brand voice guide included.",
    budgetMin: 3500, budgetMax: 6000, priceType: "hourly", experienceLevel: "intermediate",
    skills: ["SEO Writing","Content Strategy","Ahrefs","WordPress"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 25 },

  { title: "Technical Copywriter for SaaS Website Relaunch", category: "Content & SEO",
    description: "Rewrite all website copy (homepage, features, pricing, about) for a developer tool SaaS company. Conversion-focused, developer audience.",
    budgetMin: 64000, budgetMax: 120000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Copywriting","SaaS Marketing","A/B Testing","HubSpot"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 8 },

  { title: "Google & Meta Ads Campaign Manager", category: "Content & SEO",
    description: "Run and optimise Google Search, Display, and Meta ad campaigns for an e-commerce brand. Monthly budget ₹5 lakhs. ROAS target 4×.",
    budgetMin: 2500, budgetMax: 4000, priceType: "hourly", experienceLevel: "intermediate",
    skills: ["Google Ads","Meta Ads","GA4","Conversion Tracking"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 12 },

  { title: "Social Media Content Creator — Instagram & LinkedIn", category: "Content & SEO",
    description: "Create 20 posts/month for Instagram and LinkedIn. Short-form video scripts, carousels, graphic briefs, and caption writing for a fintech brand.",
    budgetMin: 40000, budgetMax: 72000, priceType: "fixed", experienceLevel: "entry",
    skills: ["Canva","Social Media","Copywriting","Instagram"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 30 },

  // ─ Blockchain & Web3 (3 jobs) ─────────────────────────────────────────────
  { title: "Solidity Smart Contracts for NFT Marketplace", category: "Blockchain & Web3",
    description: "Write, test, and deploy ERC-721 and ERC-1155 smart contracts on Ethereum mainnet. Includes royalty management and gasless minting.",
    budgetMin: 400000, budgetMax: 720000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Solidity","Hardhat","Ethers.js","OpenZeppelin","ERC-721"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 5 },

  { title: "DeFi Protocol Frontend (Next.js + Wagmi)", category: "Blockchain & Web3",
    description: "Build the frontend for a DeFi yield aggregator. Wallet connections, real-time APY feeds, staking interface, and transaction history.",
    budgetMin: 320000, budgetMax: 560000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Next.js","Wagmi","Viem","TailwindCSS","Web3.js"], duration: "1-3 months",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 4 },

  { title: "Blockchain Integration for Supply Chain System", category: "Blockchain & Web3",
    description: "Integrate Hyperledger Fabric blockchain into an existing supply chain system to provide immutable product traceability and audit trails.",
    budgetMin: 480000, budgetMax: 800000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Hyperledger Fabric","Node.js","Go","Docker"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.9, paymentVerified: true, proposalsCount: 2 },

  // ─ Graphic Design & Video (3 jobs) ────────────────────────────────────────
  { title: "Motion Graphics Explainer Video (60 sec)", category: "Graphic Design & Video",
    description: "Create a 60-second motion graphics explainer video for a SaaS product launch. Script provided. Deliver in 1080p MP4 and 4K if possible.",
    budgetMin: 64000, budgetMax: 120000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["After Effects","Motion Graphics","Adobe Premiere","Illustrator"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.7, paymentVerified: true, proposalsCount: 16 },

  { title: "3D Product Visualisation for E-Commerce", category: "Graphic Design & Video",
    description: "Create photorealistic 3D renders of 15 furniture products for an e-commerce catalogue. Deliver in multiple angles and white background.",
    budgetMin: 120000, budgetMax: 200000, priceType: "fixed", experienceLevel: "expert",
    skills: ["Blender","3D Modelling","Rendering","Adobe Photoshop"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.8, paymentVerified: true, proposalsCount: 9 },

  { title: "YouTube Channel Art & Thumbnail Templates", category: "Graphic Design & Video",
    description: "Design a full YouTube brand kit: channel banner, profile picture, 20 thumbnail templates, and lower-thirds for a tech channel.",
    budgetMin: 24000, budgetMax: 48000, priceType: "fixed", experienceLevel: "entry",
    skills: ["Canva","Adobe Photoshop","Graphic Design"], duration: "Less than 1 month",
    location: "Remote", workType: "remote", clientRating: 4.5, paymentVerified: false, proposalsCount: 28 },

  // ─ Virtual Assistant & Support (3 jobs) ──────────────────────────────────
  { title: "Executive Virtual Assistant (Part-Time, Ongoing)", category: "Virtual Assistant",
    description: "Calendar management, email triage, research, travel bookings, and vendor coordination for a startup founder. 20 hrs/week.",
    budgetMin: 800, budgetMax: 1200, priceType: "hourly", experienceLevel: "intermediate",
    skills: ["Google Workspace","Calendar Management","Research","Notion"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.6, paymentVerified: true, proposalsCount: 35 },

  { title: "Customer Support Agent — SaaS Product", category: "Virtual Assistant",
    description: "Handle customer tickets via Intercom and email for a B2B SaaS tool. Troubleshoot issues, escalate bugs, and maintain the help centre docs.",
    budgetMin: 600, budgetMax: 900, priceType: "hourly", experienceLevel: "entry",
    skills: ["Intercom","Customer Support","Zendesk","Documentation"], duration: "3-6 months",
    location: "Remote", workType: "remote", clientRating: 4.4, paymentVerified: true, proposalsCount: 42 },

  { title: "Excel & Power BI Reporting Specialist", category: "Virtual Assistant",
    description: "Build weekly automated Excel reports with pivot tables, VLOOKUP formulas, and connected Power BI dashboard for a retail chain's operations team.",
    budgetMin: 48000, budgetMax: 80000, priceType: "fixed", experienceLevel: "intermediate",
    skills: ["Excel","Power BI","Data Entry","VBA"], duration: "Less than 1 month",
    location: "Jaipur, India", workType: "hybrid", clientRating: 4.5, paymentVerified: false, proposalsCount: 19 },
];

// ── Seed function ─────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/nexora");
    console.log("✅ Connected to MongoDB");

    // ── Clear existing data ────────────────────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      Proposal.deleteMany({}),
      Contract.deleteMany({}),
      Message.deleteMany({}),
      WorkspaceTask.deleteMany({}),
      WorkspaceFile.deleteMany({}),
      Notification.deleteMany({}),
      Milestone.deleteMany({}),
      Deliverable.deleteMany({}),
      TimeLog.deleteMany({}),
      Review.deleteMany({}),
    ]);
    console.log("🗑️  Cleared existing data");

    const hashedPw = await bcrypt.hash("password123", 10);

    // ── Create admin ───────────────────────────────────────────────────────
    const admin = await User.create({
      fullName: "Nexora Admin", email: "admin@nexora.ai", password: hashedPw,
      role: "admin", verified: true,
    });

    // ── Create a demo freelancer ───────────────────────────────────────────
    const freelancer = await User.create({
      fullName: "Alex Rivera", email: "freelancer@nexora.ai", password: hashedPw,
      role: "freelancer", verified: true,
      bio: "Full-stack developer with 5+ years experience in React, Node.js, and cloud architecture.",
      skills: ["React","Node.js","TypeScript","MongoDB","TailwindCSS","Next.js"],
      location: "Bangalore, India",
    });

    // ── Create diverse client users ────────────────────────────────────────
    const clientUsers = await Promise.all(
      CLIENT_PROFILES.map((cp) =>
        User.create({
          fullName: cp.fullName, email: `${cp.fullName.split(" ")[0].toLowerCase()}@nexora.ai`,
          password: hashedPw, role: "client", verified: true,
          bio: `Founder at ${cp.company}`,
        })
      )
    );

    // ── Create all 50 jobs, distributed across clients ─────────────────────
    const deadlineBase = new Date();
    const createdJobs = await Promise.all(
      JOB_TEMPLATES.map((tmpl, idx) => {
        const clientUser = clientUsers[idx % clientUsers.length];
        const cp         = CLIENT_PROFILES[idx % CLIENT_PROFILES.length];
        const daysAhead  = 14 + (idx % 45);
        const deadline   = new Date(deadlineBase);
        deadline.setDate(deadline.getDate() + daysAhead);

        return Job.create({
          ...tmpl,
          client:          clientUser._id,
          clientRating:    cp.rating,
          paymentVerified: cp.paymentVerified,
          deadline,
          status:          "open",
        });
      })
    );

    console.log(`🌱 Created ${createdJobs.length} demo jobs`);
    console.log(`👤 Created ${clientUsers.length} client users`);

    // ── Create Active and Completed Contracts for the Freelancer ────────────────
    console.log("💼 Seeding Active and Completed Contracts...");
    
    const activeJobTemplates = createdJobs.slice(0, 3);
    const completedJobTemplates = createdJobs.slice(3, 5);

    // Active Contracts
    for (let i = 0; i < activeJobTemplates.length; i++) {
      const job = activeJobTemplates[i];
      job.status = "in_progress";
      await job.save();

      const proposal = await Proposal.create({
        job: job._id,
        freelancer: freelancer._id,
        bidAmount: job.budgetMax - 1000,
        estimatedDelivery: "30 days",
        description: `I will build this ${job.title} to the highest standards. Under budget and ahead of time!`,
        status: "accepted",
      });

      const contract = await Contract.create({
        job: job._id,
        proposal: proposal._id,
        client: job.client,
        freelancer: freelancer._id,
        title: job.title,
        budget: proposal.bidAmount,
        status: "active",
        escrowStatus: "funded",
      });

      const m1 = await Milestone.create({
        contract: contract._id,
        title: "Requirements Discovery & High-Fidelity Mockups",
        description: "Draft system architecture maps and coordinate visual mockups with client stakeholders.",
        budget: Math.round(contract.budget * 0.25),
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "approved",
        progress: 100,
        clientFeedback: "Excellent mockups! Looking forward to the next steps.",
      });

      const m2 = await Milestone.create({
        contract: contract._id,
        title: "Core Functionality & Database Schema Layout",
        description: "Establish database models, write core API controllers, and finalize backend logic.",
        budget: Math.round(contract.budget * 0.5),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: "in_progress",
        progress: 40,
      });

      const m3 = await Milestone.create({
        contract: contract._id,
        title: "Integration, Polish & Client Sign-off",
        description: "Connect the frontend application to backend services, write production tests, and deploy.",
        budget: Math.round(contract.budget * 0.25),
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        status: "pending",
        progress: 0,
      });

      await WorkspaceTask.create([
        { projectId: job._id, title: "Define Mongoose schemas for milestones", label: "Backend", labelColor: "#4f46e5", assignee: freelancer._id, column: "in_progress" },
        { projectId: job._id, title: "Integrate Rupee conversion formatting inside formatters.ts", label: "Frontend", labelColor: "#0f766e", assignee: freelancer._id, column: "review" },
        { projectId: job._id, title: "Coordinate Figma mockups sign-off with Sarah Mitchell", label: "Design", labelColor: "#f59e0b", assignee: freelancer._id, column: "todo" },
        { projectId: job._id, title: "Draft deployment scripts for production staging server", label: "DevOps", labelColor: "#ef4444", assignee: freelancer._id, column: "todo" }
      ]);

      await WorkspaceFile.create([
        { projectId: job._id, name: "SystemArchitectureDiagram.png", size: "450 KB", url: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=500&auto=format&fit=crop", thumbnailUrl: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=100&auto=format&fit=crop" },
        { projectId: job._id, name: "APIContractDocumentation.pdf", size: "1.2 MB", url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
      ]);

      await Deliverable.create({
        contract: contract._id,
        milestone: m1._id,
        name: "Mockups Submission v1.0",
        fileType: "zip",
        fileSize: "8.5 MB",
        liveSiteUrl: "https://github.com/alexrivera/project-mockups",
        gitRepoUrl: "https://github.com/alexrivera/project-mockups",
        status: "approved",
        feedback: "Awesome work, thanks!",
      });

      await TimeLog.create([
        { contract: contract._id, freelancer: freelancer._id, startTime: new Date(Date.now() - 3 * 3600 * 1000), endTime: new Date(Date.now() - 1 * 3600 * 1000), duration: 7200, notes: "Setting up project folders and Git repository.", status: "logged" },
        { contract: contract._id, freelancer: freelancer._id, startTime: new Date(Date.now() - 25 * 3600 * 1000), endTime: new Date(Date.now() - 22 * 3600 * 1000), duration: 10800, notes: "Drafting REST API controllers.", status: "logged" }
      ]);
    }

    // Completed Contracts
    for (let i = 0; i < completedJobTemplates.length; i++) {
      const job = completedJobTemplates[i];
      job.status = "completed";
      await job.save();

      const proposal = await Proposal.create({
        job: job._id,
        freelancer: freelancer._id,
        bidAmount: job.budgetMax - 500,
        estimatedDelivery: "14 days",
        description: `Expert execution for ${job.title}. Finished with high ratings!`,
        status: "accepted",
      });

      const contract = await Contract.create({
        job: job._id,
        proposal: proposal._id,
        client: job.client,
        freelancer: freelancer._id,
        title: job.title,
        budget: proposal.bidAmount,
        status: "completed",
        escrowStatus: "released",
      });

      const cm1 = await Milestone.create({
        contract: contract._id,
        title: "Project Delivery & Deployment",
        description: "Final execution and handover of all visual assets and source code repositories.",
        budget: contract.budget,
        dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: "approved",
        progress: 100,
      });

      await Review.create({
        contract: contract._id,
        reviewer: job.client,
        reviewee: freelancer._id,
        rating: 5,
        comment: "Flawless execution! Alex delivered high quality code and communicates extremely well.",
      });

      await Review.create({
        contract: contract._id,
        reviewer: freelancer._id,
        reviewee: job.client,
        rating: 5,
        comment: "Excellent experience. Clear requirements and quick feedback on milestones.",
      });
    }

    console.log("✅ Seed complete!\n");
    console.log("Demo accounts:");
    console.log("  Admin     → admin@nexora.ai      / password123");
    console.log("  Freelancer→ freelancer@nexora.ai / password123");
    CLIENT_PROFILES.forEach((cp) => {
      console.log(`  Client    → ${cp.fullName.split(" ")[0].toLowerCase()}@nexora.ai / password123`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
};

seed();
