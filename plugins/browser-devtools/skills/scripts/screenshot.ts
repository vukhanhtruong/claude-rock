#!/usr/bin/env node
/**
 * Capture screenshots for visual debugging
 * Usage: node screenshot.js --url https://example.com --output screenshot.png [--full-page true] [--selector .element]
 */

import {
  getBrowserSession,
  closeBrowserSession,
  parseArgs,
  outputJSON,
  outputError,
  createScreenshot,
  getOutputDirectory,
} from "../lib/browser.js";
import { writeFile } from "fs/promises";
import { join } from "path";

interface ScreenshotArgs {
  url?: string;
  output?: string;
  "full-page"?: string | boolean;
  selector?: string;
  format?: string;
  quality?: string;
  "wait-until"?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

async function takeScreenshot() {
  const args = parseArgs(process.argv.slice(2)) as ScreenshotArgs;

  if (!args.url && !args.selector) {
    return outputError(new Error("Either --url or --selector is required"));
  }

  // --output is optional - will auto-generate if not provided

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== "false",
    });

    // Navigate to URL if provided
    if (args.url) {
      await session.page.goto(args.url, {
        waitUntil: (args["wait-until"] as any) || "load",
      });
    }

    const outputPath =
      args.output || join(getOutputDirectory(), `screenshot_${Date.now()}.png`);
    const fullPage = args["full-page"] === "true";

    // Create screenshot
    const result = await createScreenshot(session.page, outputPath, {
      fullPage,
      selector: args.selector,
    });

    const screenshotData = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      outputPath: typeof result === "string" ? result : outputPath,
      fullPage,
      selector: args.selector || null,
      size: typeof result === "string" ? null : result.length,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
    };

    outputJSON(screenshotData);

    if (args.close !== "false") {
      await closeBrowserSession();
    } else {
      // Explicitly exit the process when keeping session open
      process.exit(0);
    }
  } catch (error) {
    return outputError(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

takeScreenshot();
