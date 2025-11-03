#!/usr/bin/env node
/**
 * Performance metrics and Core Web Vitals
 * Usage: node performance.js --url https://example.com [--trace trace.json] [--resources true]
 */

import {
  getBrowserSession,
  closeBrowserSession,
  parseArgs,
  outputJSON,
  outputError,
} from "../lib/browser.js";
import { writeFile } from "fs/promises";

interface PerformanceArgs {
  url?: string;
  trace?: string;
  resources?: string | boolean;
  timeout?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

interface CoreWebVitals {
  LCP: number | null; // Largest Contentful Paint
  FID: number | null; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  FCP: number | null; // First Contentful Paint
  TTFB: number | null; // Time to First Byte
}

interface PerformanceResource {
  name: string;
  type: string;
  duration: number;
  size: number;
  startTime: number;
  responseEnd: number;
}

async function measurePerformance() {
  const args = parseArgs(process.argv.slice(2)) as PerformanceArgs;

  if (!args.url) {
    return outputError(new Error("--url is required"));
  }

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== "false",
      timeout: args.timeout ? parseInt(args.timeout) : undefined,
    });

    // Start tracing if requested
    if (args.trace) {
      await session.page.context().tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
    }

    // Navigate to the URL
    await session.page.goto(args.url, { waitUntil: "networkidle" });

    // Stop tracing and save if requested
    if (args.trace) {
      await session.page.context().tracing.stop({ path: args.trace });
    }

    // Get performance metrics from Chrome DevTools Protocol
    const client = await session.page.context().newCDPSession(session.page);
    const metrics = await client.send("Performance.getMetrics");

    // Get Core Web Vitals
    const vitals = await session.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: CoreWebVitals = {
          LCP: null,
          FID: null,
          CLS: 0,
          FCP: null,
          TTFB: null,
        };

        // LCP - Largest Contentful Paint
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              const lastEntry = entries[entries.length - 1] as any;
              vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
            }
          }).observe({
            entryTypes: ["largest-contentful-paint"],
            buffered: true,
          });
        } catch (e) {
          // LCP not supported
        }

        // CLS - Cumulative Layout Shift
        try {
          new PerformanceObserver((list) => {
            list.getEntries().forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                vitals.CLS += entry.value;
              }
            });
          }).observe({ entryTypes: ["layout-shift"], buffered: true });
        } catch (e) {
          // CLS not supported
        }

        // FCP - First Contentful Paint
        try {
          const paintEntries = performance.getEntriesByType("paint");
          const fcpEntry = paintEntries.find(
            (e: any) => e.name === "first-contentful-paint",
          );
          if (fcpEntry) {
            vitals.FCP = fcpEntry.startTime;
          }
        } catch (e) {
          // FCP not supported
        }

        // TTFB - Time to First Byte
        try {
          const [navigationEntry] = performance.getEntriesByType(
            "navigation",
          ) as any[];
          if (navigationEntry) {
            vitals.TTFB =
              navigationEntry.responseStart - navigationEntry.requestStart;
          }
        } catch (e) {
          // Navigation timing not supported
        }

        // Wait a bit for metrics to stabilize
        setTimeout(() => resolve(vitals), 1000);
      });
    });

    // Get resource timing information
    let resources: PerformanceResource[] = [];
    if (args.resources === "true") {
      resources = await session.page.evaluate(() => {
        return performance.getEntriesByType("resource").map((r: any) => ({
          name: r.name,
          type: r.initiatorType,
          duration: r.duration,
          size: r.transferSize || 0,
          startTime: r.startTime,
          responseEnd: r.responseEnd,
        }));
      });
    }

    const resourceSummary = {
      count: resources.length,
      totalDuration: resources.reduce((sum, r) => sum + r.duration, 0),
      totalSize: resources.reduce((sum, r) => sum + r.size, 0),
      averageDuration:
        resources.length > 0
          ? resources.reduce((sum, r) => sum + r.duration, 0) / resources.length
          : 0,
      resourcesByType: resources.reduce(
        (acc, r) => {
          acc[r.type] = (acc[r.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };

    // Process metrics into a more usable format
    const processedMetrics: Record<string, any> = {};
    metrics.metrics?.forEach((metric: any) => {
      processedMetrics[metric.name] = metric.value;
    });

    const result = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      metrics: {
        ...processedMetrics,
        JSHeapUsedSizeMB: (
          (processedMetrics.JSHeapUsedSize || 0) /
          1024 /
          1024
        ).toFixed(2),
        JSHeapTotalSizeMB: (
          (processedMetrics.JSHeapTotalSize || 0) /
          1024 /
          1024
        ).toFixed(2),
      },
      vitals: vitals,
      resources:
        args.resources === "true"
          ? {
              ...resourceSummary,
              items: resources,
            }
          : resourceSummary,
      trace: args.trace || null,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
    };

    outputJSON(result);

    if (args.close !== "false") {
      await closeBrowserSession();
    } else {
      // Explicitly exit the process when keeping session open
      process.exit(0);
    }
  } catch (error) {
    return outputError(error instanceof Error ? error : new Error(String(error)));
  }
}

measurePerformance();

