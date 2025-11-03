#!/usr/bin/env node
/**
 * Console log monitoring and error tracking
 * Usage: node console.js [--url URL] [--types error,warn] [--duration 5000] [--no-navigation]
 *
 * Options:
 *   --url           URL to navigate to (required if no existing browser session)
 *   --types         Console message types to capture (comma-separated, default: all)
 *   --duration      How long to monitor console (ms, default: 5000)
 *   --no-navigation Don't navigate, use existing browser session
 *
 * Examples:
 *   node console.js --url https://your-app.com --types error,warn
 *   node console.js --no-navigation true  # Uses existing session
 *   node navigate.js --url https://your-app.com --close false
 *   node console.js --no-navigation true --types error  # Monitor existing page
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError, getExistingSession } from '../lib/browser.js';

interface ConsoleArgs {
  url?: string;
  types?: string;
  duration?: string;
  timeout?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
  'no-navigation'?: string | boolean;
}

interface ConsoleMessage {
  type: string;
  text: string;
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  timestamp: number;
}

async function monitorConsole() {
  const args = parseArgs(process.argv.slice(2)) as ConsoleArgs;

  // Smart URL handling
  let shouldNavigate = args['no-navigation'] !== 'true';
  let targetUrl = args.url;

  // If no URL provided, try to use existing session
  if (!targetUrl) {
    const existingSession = await getExistingSession();
    if (existingSession && existingSession.browser.isConnected()) {
      // Use existing session, don't navigate
      shouldNavigate = false;
      targetUrl = existingSession.page.url();
    } else {
      // No existing session and no URL provided - require explicit URL from user
      return outputError(new Error('No browser session found. Please provide a URL with --url or navigate first using navigate.js. For example: --url https://your-site.com'));
    }
  }

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== 'false',
      timeout: args.timeout ? parseInt(args.timeout) : undefined,
    });

    const messages: ConsoleMessage[] = [];
    const filterTypes = args.types ? args.types.split(',').map(t => t.trim().toLowerCase()) : null;
    const duration = args.duration ? parseInt(args.duration) : 5000;

    // Set up console message listener
    session.page.on('console', (msg) => {
      const messageType = msg.type().toLowerCase();

      // Filter by message types if specified
      if (filterTypes && !filterTypes.includes(messageType)) {
        return;
      }

      const consoleMessage: ConsoleMessage = {
        type: messageType,
        text: msg.text(),
        timestamp: Date.now(),
      };

      // Add location info if available
      const location = msg.location();
      if (location) {
        consoleMessage.location = {
          url: location.url,
          lineNumber: location.lineNumber,
          columnNumber: location.columnNumber,
        };
      }

      messages.push(consoleMessage);
    });

    // Navigate to the URL if needed
    if (shouldNavigate && targetUrl) {
      await session.page.goto(targetUrl, { waitUntil: 'networkidle' });
    }

    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, duration));

    // Count messages by type
    const messageCount = messages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const result = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      monitoring: {
        duration: duration,
        types: filterTypes || 'all',
        messageCount: messages.length,
        messageCountByType: messageCount,
        usedExistingSession: !args.url && !shouldNavigate,
        autoNavigated: shouldNavigate && args.url,
      },
      messages: messages,
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

monitorConsole();
