import type { DefaultSession } from "next-auth";

// Module augmentation so the extra `id` we expose on the session in the
// Auth.js `session` callback (src/auth.ts) is typed wherever it is consumed.
// The JWT is augmented in AUTH-02, when the DB-backed `role` is added to it.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
