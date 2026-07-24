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
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // sessions live for 30 days of inactivity
    updateAge: 24 * 60 * 60, // slide the expiry at most once a day
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    // Deny sign-in to blocked accounts (ADMIN-06) before any session is issued.
    // Returning false sends the user to the Auth.js error page. The db is
    // imported dynamically to keep DATABASE_URL out of the build-time graph.
    async signIn({ user, account }) {
      const { isBlockedUser } = await import("@/lib/auth/blocked");
      const blocked = await isBlockedUser({
        // `account.providerAccountId` is the stable Google `sub`; `user.id` is
        // a per-login value and must not be treated as the external identity.
        googleId: account?.providerAccountId,
        email: user?.email,
      });
      return !blocked;
    },
    // On sign-in `user` carries the Google profile: mirror it into Neon
    // (AUTH-02) and cache the internal user id + role on the token. On later
    // requests `user` is undefined and the token already holds them, so there
    // is no DB round-trip. The db is imported dynamically so its DATABASE_URL
    // requirement stays out of the build-time module graph.
    async jwt({ token, user, account }) {
      // `account` is only present on sign-in, and `account.providerAccountId`
      // is the stable Google `sub`. `user.id` here is a per-login random value,
      // so it must NOT be used as the external identity (doing so made every
      // returning user collide on the unique `email` and 500 the sign-in).
      if (account?.providerAccountId && user?.email && user.name) {
        const { syncUser } = await import("@/lib/auth/sync-user");
        const dbUser = await syncUser({
          googleId: account.providerAccountId,
          email: user.email,
          name: user.name,
          image: user.image,
        });
        token.id = dbUser.id;
        token.role = dbUser.role;
      }
      return token;
    },
    // Surface the internal id + role on the session read by server components,
    // the `useSession` hook and the protected-route proxy (AUTH-03).
    session({ session, token }) {
      session.user.id = token.id ?? (token.sub as string);
      session.user.role = token.role ?? "user";
      return session;
    },
  },
});
