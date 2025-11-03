#!/usr/bin/env node
/**
 * Form testing and input validation
 * Usage: node fill.js --selector "#input" --value "text" [--url https://example.com] [--clear true]
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError, waitForElement, getElementInfo } from '../lib/browser.js';

interface FillArgs {
  selector?: string;
  value?: string;
  url?: string;
  clear?: string | boolean;
  'wait-timeout'?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

async function fill() {
  const args = parseArgs(process.argv.slice(2)) as FillArgs;

  if (!args.selector) {
    return outputError(new Error('--selector is required'));
    return;
  }

  if (args.value === undefined) {
    return outputError(new Error('--value is required'));
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

    // Get element info before filling
    const elementInfo = await getElementInfo(session.page, args.selector);

    // Check if element is visible and fillable
    if (!elementInfo.visible) {
      return outputError(new Error(`Element is not visible: ${args.selector}`));
      return;
    }

    // Check if element is an input-like element
    const fillableTags = ['input', 'textarea', 'select'];
    if (!fillableTags.includes(elementInfo.tagName)) {
      return outputError(new Error(`Element is not fillable: ${elementInfo.tagName} (${args.selector})`));
      return;
    }

    // Clear the field if requested
    if (args.clear === 'true') {
      await session.page.fill(args.selector, '');
    }

    // Fill the element with the value
    await session.page.fill(args.selector, args.value);

    // Verify the value was set
    const actualValue = await session.page.inputValue(args.selector);

    const result = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      action: {
        type: 'fill',
        selector: args.selector,
        elementInfo: elementInfo,
        value: args.value,
        actualValue: actualValue,
        cleared: args.clear === 'true',
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

fill();
