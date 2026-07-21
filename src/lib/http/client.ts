import axios, {
  AxiosError,
  type AxiosInstance,
  type CreateAxiosDefaults,
} from "axios";

export interface HttpError {
  status: number | null;
  message: string;
  data: unknown;
}

export function toHttpError(error: unknown): HttpError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return {
      status: axiosError.response?.status ?? null,
      message:
        axiosError.response?.data?.message ??
        axiosError.message ??
        "Request failed",
      data: axiosError.response?.data ?? null,
    };
  }
  return {
    status: null,
    message: error instanceof Error ? error.message : "Unknown error",
    data: null,
  };
}

const DEFAULT_TIMEOUT_MS = 15_000;

export function createHttpClient(config?: CreateAxiosDefaults): AxiosInstance {
  const client = axios.create({
    timeout: DEFAULT_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
    ...config,
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(toHttpError(error)),
  );

  return client;
}
