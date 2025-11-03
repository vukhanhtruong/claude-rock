#!/usr/bin/env node
/**
 * Execute JavaScript for debugging and analysis
 * Usage: node evaluate.js --url https://example.com --script "document.title"
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError, executeScript } from '../lib/browser.js';

interface EvaluateArgs {
  url?: string;
  script?: string;
  timeout?: string;
  'wait-until'?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

async function evaluate() {
  const args = parseArgs(process.argv.slice(2)) as EvaluateArgs;

  if (!args.script) {
    return outputError(new Error('--script is required'));
    return;
  }

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== 'false',
      timeout: args.timeout ? parseInt(args.timeout) : undefined,
    });

    // Navigate to URL if provided
    if (args.url) {
      await session.page.goto(args.url, {
        waitUntil: args['wait-until'] as any || 'load',
        timeout: args.timeout ? parseInt(args.timeout) : 30000,
      });
    }

    // Execute the script
    const result = await executeScript(session.page, args.script);

    const responseData = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      script: args.script,
      result: result,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
    };

    outputJSON(responseData);

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

evaluate();
