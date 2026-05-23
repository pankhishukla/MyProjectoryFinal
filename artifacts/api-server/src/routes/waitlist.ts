import { Router, type Request, type Response } from "express";
import { db } from "../lib/db/index.js";
import { waitlist } from "../lib/db/schema/index.js";
import { z } from "zod";

const router = Router();

const waitlistSchema = z.object({
  email: z.string().email(),
});

router.post("/waitlist", async (req: Request, res: Response) => {
  try {
    const { email } = waitlistSchema.parse(req.body);

    await db.insert(waitlist).values({ email }).onDuplicateKeyUpdate({
      set: { id: waitlist.id } // No-op if duplicate
    });

    res.status(200).json({ success: true, message: "Added to waitlist" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: "Invalid email format" });
    } else {
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
});

export default router;
