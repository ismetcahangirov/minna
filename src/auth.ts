import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) configuration. Google is the only sign-in method
 * (see CLAUDE.md). This module exports the primitives the rest of the app
 * uses: `handlers` (the /api/auth route), `auth` (server-side session read),
 * and `signIn` / `signOut` (server actions).
 *
 * Sessions use the JWT strategy: the signed session token lives in an
 * httpOnly cookie, so no server-side session store is required. The user is
 * mirrored into Neon on first login in AUTH-02 via the `jwt` callback.
 *
 * Credentials are read from the existing env names (GOOGLE_CLIENT_ID /
 * GOOGLE_CLIENT_SECRET / NEXTAUTH_SECRET — see .env.example) and passed
 * explicitly, instead of relying on Auth.js's AUTH_* auto-discovery.
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // Required when the app is not deployed on Vercel (e.g. Render.com) so
  // Auth.js trusts the incoming Host header for building callback URLs.
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Under the JWT strategy Auth.js stores the user id in `token.sub`, so we
    // surface it as `session.user.id` for server components and the client
    // `useSession` hook without a DB round-trip. DB sync + role land in AUTH-02.
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
