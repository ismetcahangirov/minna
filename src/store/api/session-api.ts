import type { SessionUser } from "@/lib/auth/session-user";
import { baseApi } from "@/store/api/base-api";

/** Auth.js answers `{}` when signed out, so `user` is optional. */
interface SessionResponse {
  user?: SessionUser;
  expires?: string;
}

/**
 * The signed-in user, read in the browser from Auth.js's own session endpoint.
 *
 * This exists so that **no page has to be rendered per visitor**. The header is
 * mounted from the root layout on every route, and it used to read the session
 * server-side; a cookie read during render opts the whole route out of static
 * and ISR rendering, which made Next emit `Cache-Control: private, no-cache,
 * no-store` site-wide. Every request — a reader or a crawler — therefore ran a
 * function and rendered React on the server. That is what exhausted the
 * account's Fluid Active CPU and Fast Origin Transfer allowances.
 *
 * Reading it here instead keeps the HTML identical for everyone, so the CDN can
 * serve it. The cost is one request per full page load, and only from clients
 * that run JavaScript: the crawler traffic this is meant to absorb never asks.
 * The endpoint itself only decodes the session JWT — no database round trip.
 *
 * Extends the single app-wide `baseApi` (never a new `createApi`), so the two
 * headers that need it — desktop `UserMenu` and `MobileMenu` — share one
 * in-flight request rather than each making their own.
 */
export const sessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSession: builder.query<SessionUser | null, void>({
      query: () => ({ url: "/auth/session" }),
      // `null` rather than `undefined` for the signed-out case: `undefined` is
      // what the hook reports while the request is still in flight, and the
      // header has to tell "nobody is signed in" apart from "not known yet" to
      // avoid flashing a Login button at a signed-in reader.
      transformResponse: (response: SessionResponse) => response?.user ?? null,
      providesTags: ["Session"],
    }),
  }),
});

export const { useGetSessionQuery } = sessionApi;
