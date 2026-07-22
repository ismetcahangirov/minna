import { handlers } from "@/auth";

// Auth.js mounts all of its endpoints (sign-in, OAuth callback, session,
// csrf, sign-out, …) under /api/auth/* through this catch-all route handler.
export const { GET, POST } = handlers;
