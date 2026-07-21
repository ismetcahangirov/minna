import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosRequestConfig } from "axios";

import { createHttpClient, type HttpError } from "@/lib/http/client";

interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
  params?: AxiosRequestConfig["params"];
  headers?: AxiosRequestConfig["headers"];
}

// The browser only ever calls our own Next.js API routes; those routes
// consult Redis and proxy to Consumet server-side (see lib/http/consumet.ts).
const apiClient = createHttpClient({ baseURL: "/api" });

const axiosBaseQuery =
  (): BaseQueryFn<AxiosBaseQueryArgs, unknown, HttpError> =>
  async ({ url, method = "GET", data, params, headers }) => {
    try {
      const result = await apiClient.request({ url, method, data, params, headers });
      return { data: result.data };
    } catch (error) {
      return { error: error as HttpError };
    }
  };

// Single API slice for the whole app. Feature modules extend it with
// baseApi.injectEndpoints(...) instead of creating new createApi instances.
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Anime", "Episodes", "Favorites", "WatchProgress", "Blogs", "Ads", "Users"],
  endpoints: () => ({}),
});
