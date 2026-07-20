import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import swaggerJsDoc from "swagger-jsdoc";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import proposalRoutes from "./routes/proposalRoutes.js";
import contractRoutes from "./routes/contractRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import workspaceRoutes from "./routes/workspaceRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import savedJobRoutes from "./routes/savedJobRoutes.js";
import jobAlertRoutes from "./routes/jobAlertRoutes.js";

import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false, // Allow local uploads to be displayed on frontend
}));

// CORS Configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Logging
app.use(morgan("dev"));

// Body parsers & Cookie parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Response compression
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, message: "Too many requests from this IP, please try again later." },
});
app.use("/api", limiter);

// Serve uploads folder locally
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Swagger Configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Nexora Freelance Marketplace API Docs",
      version: "1.0.0",
      description: "Complete list of RESTful API endpoints for the Nexora Marketplace application",
    },
    servers: [
      {
        url: "http://localhost:5000/api",
      },
    ],
  },
  apis: ["./routes/*.js", "./controllers/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
app.use("/api/job-alerts", jobAlertRoutes);

// Test endpoint
app.get("/", (req, res) => {
  res.send("Nexora API running. Documentation is available at /api-docs 🚀");
});

// Centralized error middleware fallback
app.use(notFound);
app.use(errorHandler);

export default app;
