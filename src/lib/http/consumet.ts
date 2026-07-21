import "server-only";

import { createHttpClient } from "@/lib/http/client";

// All anime data flows through this server-side instance so the browser
// never talks to Consumet directly (rate limiting + Redis caching happen
// on our server layer). Configure CONSUMET_API_URL in the environment;
// self-hosting the Consumet API is recommended (see SETUP-09 .env.example).
export const consumetClient = createHttpClient({
  baseURL: process.env.CONSUMET_API_URL ?? "https://api.consumet.org",
});
