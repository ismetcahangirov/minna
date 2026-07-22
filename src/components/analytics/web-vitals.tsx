"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Core Web Vitals instrumentation (PERF-03). Mounted once in the root layout,
 * this confines the client boundary to a single tiny component (per the Next.js
 * guidance) and gives the app a durable way to measure LCP/CLS/INP/FCP/TTFB in
 * the field rather than only in one-off Lighthouse runs.
 *
 * Reporting is intentionally provider-agnostic:
 * - If `NEXT_PUBLIC_WEB_VITALS_ENDPOINT` is set, each metric is POSTed there via
 *   `navigator.sendBeacon` (non-blocking, survives page unload).
 * - In development, sub-par metrics are logged so regressions surface locally.
 *
 * The callback is a stable module-level reference so metrics are not re-reported
 * on re-render (Next.js requirement).
 */
const ENDPOINT = process.env.NEXT_PUBLIC_WEB_VITALS_ENDPOINT;

type Metric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];

function reportMetric(metric: Metric): void {
  if (ENDPOINT && typeof navigator !== "undefined" && navigator.sendBeacon) {
    const body = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    });
    navigator.sendBeacon(ENDPOINT, body);
    return;
  }

  if (process.env.NODE_ENV !== "production" && metric.rating !== "good") {
    // Surface only the metrics worth acting on during local development.
    console.warn(
      `[web-vitals] ${metric.name} = ${Math.round(metric.value)} (${metric.rating})`,
    );
  }
}

export function WebVitals() {
  useReportWebVitals(reportMetric);
  return null;
}
