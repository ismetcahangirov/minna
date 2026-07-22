import { configureStore } from "@reduxjs/toolkit";

import { baseApi } from "@/store/api/base-api";
// Side-effect import: registers the feature endpoints on `baseApi` via
// `injectEndpoints` so they exist on every store instance (server and client),
// regardless of which component first imports a generated hook.
import "@/store/api/anime-api";

// A new store per request (App Router) — never a module-level singleton.
export const makeStore = () => {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
