import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { createProxyMiddleware } from "http-proxy-middleware";
import router from "./routes";
import { logger } from "./lib/logger";
import { initializeJobsSync } from "./services/jobsSync";

const FRONTEND_PORT = process.env.FRONTEND_PORT ?? "5173";
 
const app: Express = express();

// initializeJobsSync();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);


// ---------------------------------------------------------------------------
// CORS configuration
//
// In production only the configured production origins are allowed.
// In development all origins are permitted for convenience.
// ---------------------------------------------------------------------------
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === "production";

app.use(
  cors({
    credentials: true,
    origin: isProduction
      ? (origin, callback) => {
          // Allow requests with no origin (e.g. server-to-server, curl)
          if (!origin) return callback(null, true);
          if (allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          callback(new Error("Not allowed by CORS"));
        }
      : true, // allow all origins in development
  }),
);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Authentication is handled by simple header-based middleware in `requireAuth`.

app.use("/api", router);

if (process.env.NODE_ENV === "development") {
  app.use(
    "/",
    createProxyMiddleware({
      target: `http://127.0.0.1:${FRONTEND_PORT}`,
      changeOrigin: true,
      ws: true,
    }),
  );
}

export default app;
