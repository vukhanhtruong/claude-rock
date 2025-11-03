#!/usr/bin/env node
/**
 * Element interaction for testing UI behavior
 * Usage: node click.js --selector ".button" [--url https://example.com] [--wait-for ".result"]
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError, waitForElement, getElementInfo } from '../lib/browser.js';

interface ClickArgs {
  selector?: string;
  url?: string;
  'wait-for'?: string;
  'wait-timeout'?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

async function click() {
  const args = parseArgs(process.argv.slice(2)) as ClickArgs;

  if (!args.selector) {
    return outputError(new Error('--selector is required'));
    return;
  }

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== 'false',
    });

    // Navigate to URL if provided
    if (args.url) {
      await session.page.goto(args.url, { waitUntil: 'networkidle' });
    }

    // Wait for element to be available
    const waitTimeout = args['wait-timeout'] ? parseInt(args['wait-timeout']) : 30000;
    await waitForElement(session.page, args.selector, waitTimeout);

    // Get element info before click
    const elementInfo = await getElementInfo(session.page, args.selector);

    // Check if element is visible and clickable
    if (!elementInfo.visible) {
      return outputError(new Error(`Element is not visible: ${args.selector}`));
      return;
    }

    // Click the element
    await session.page.click(args.selector);

    // Wait for navigation or new content if specified
    if (args['wait-for']) {
      try {
        await waitForElement(session.page, args['wait-for'], waitTimeout);
      } catch (error) {
        // Don't fail if wait-for element doesn't appear, just log it
        console.warn(`Warning: Wait-for element not found: ${args['wait-for']}`);
      }
    }

    const result = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      action: {
        type: 'click',
        selector: args.selector,
        elementInfo: elementInfo,
        waitFor: args['wait-for'] || null,
      },
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

click();
