#!/usr/bin/env node
/**
 * Navigate to a URL for debugging
 * Usage: node navigate.js --url https://example.com [--wait-until networkidle2] [--timeout 30000]
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError } from '../lib/browser.js';

interface NavigateArgs {
  url?: string;
  'wait-until'?: string;
  timeout?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

async function navigate() {
  const args = parseArgs(process.argv.slice(2)) as NavigateArgs;

  if (!args.url) {
    return outputError(new Error('--url is required'));
    return;
  }

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== 'false',
      timeout: args.timeout ? parseInt(args.timeout) : undefined,
    });

    const waitUntil = args['wait-until'] as any || 'networkidle';

    await session.page.goto(args.url, {
      waitUntil,
      timeout: args.timeout ? parseInt(args.timeout) : 30000,
    });

    const title = await session.page.title();
    const finalUrl = session.page.url();

    const result = {
      success: true,
      url: finalUrl,
      title: title,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
    };

    outputJSON(result);

    if (args.close !== 'false') {
      await closeBrowserSession();
    } else {
      // Explicitly exit the process when keeping session open
      process.exit(0);
    }
  } catch (error) {
    return outputError(error instanceof Error ? error : new Error(String(error)));
  }
}

navigate();
