import type { DefaultSession } from "next-auth";

import type { User } from "@/db/schema";

type UserRole = User["role"];

// Extra fields set on the session token in the Auth.js callbacks (src/auth.ts):
// the internal Neon user id and role, mirrored onto the session for server
// components, the `useSession` hook and the protected-route proxy.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
    } & DefaultSession["user"];
  }
}

// The JWT interface lives in `@auth/core/jwt`; `next-auth/jwt` only re-exports
// it (`export *`), so augmenting that re-export would not merge. Target the
// original declaration site instead.
declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
  }
}
