import type { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/backend";
import { logger } from "../lib/logger";
import { verifyToken } from "@clerk/backend";

// ---------------------------------------------------------------------------
// Clerk client – initialised lazily so the module can be imported even when
// CLERK_SECRET_KEY is not yet set (e.g. during tests).
// ---------------------------------------------------------------------------

let _clerkClient: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  if (!_clerkClient) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("CLERK_SECRET_KEY must be set for authentication.");
    }
    _clerkClient = createClerkClient({ secretKey });
  }
  return _clerkClient;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(" ", 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;

  return token;
}

// ---------------------------------------------------------------------------
// requireAuth – verifies the Clerk JWT and attaches userId to the request.
//
// In development with SKIP_ADMIN_CHECK=true, the middleware bypasses
// verification and assigns a mock user id so that local development
// remains frictionless.
// ---------------------------------------------------------------------------

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Development bypass for easy local testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_ADMIN_CHECK === "true"
  ) {
    (req as any).clerkUserId = "dev_user_id";
    next();
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized: missing Bearer token" });
    return;
  }

  try {
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // session.sub is the Clerk user id (the "sub" claim of the JWT).
    (req as any).clerkUserId = session.sub;
    (req as any).clerkSessionId = session.sid;
    next();
  } catch (error: any) {
    logger.warn({ error: error.message }, "Clerk token verification failed");
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
};

// ---------------------------------------------------------------------------
// requireAdmin – same as requireAuth but also checks that the user has the
// "admin" role in their Clerk public metadata.
//
// Because role information lives on the User object (not in the JWT), we
// fetch it from the Clerk backend after verifying the token.
// ---------------------------------------------------------------------------

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Development bypass for easy local testing
  if (
    process.env.NODE_ENV === "development" &&
    process.env.SKIP_ADMIN_CHECK === "true"
  ) {
    (req as any).clerkUserId = "mock_admin_id";
    next();
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized: missing Bearer token" });
    return;
  }

  try {
    const clerk = getClerkClient();
    const session = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    const userId = session.sub;

    // Fetch user to check public metadata for admin role
    const user = await clerk.users.getUser(userId);
    const role = (user.publicMetadata as Record<string, unknown>)?.role;

    if (role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin access required" });
      return;
    }

    (req as any).clerkUserId = userId;
    (req as any).clerkSessionId = session.sid;
    next();
  } catch (error: any) {
    logger.warn({ error: error.message }, "Clerk admin verification failed");
    res.status(401).json({ error: "Unauthorized: invalid or expired token" });
  }
};
