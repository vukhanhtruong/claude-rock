#!/usr/bin/env node
/**
 * DOM inspection and element discovery
 * Usage: node snapshot.js --url https://example.com [--output snapshot.json]
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError, getOutputDirectory } from '../lib/browser.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';

interface SnapshotArgs {
  url?: string;
  output?: string;
  timeout?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

interface ElementInfo {
  index: number;
  tagName: string;
  id: string | null;
  className: string | null;
  name: string | null;
  value: string | null;
  type: string | null;
  text: string | null;
  href: string | null;
  selector: string;
  xpath: string;
  visible: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

async function takeSnapshot() {
  const args = parseArgs(process.argv.slice(2)) as SnapshotArgs;

  try {
    const session = await getBrowserSession({
      browser: args.browser as any,
      headless: args.headless !== 'false',
      timeout: args.timeout ? parseInt(args.timeout) : undefined,
    });

    // Navigate if URL provided
    if (args.url) {
      await session.page.goto(args.url, {
        waitUntil: 'networkidle',
        timeout: args.timeout ? parseInt(args.timeout) : 30000,
      });
    }

    // Get interactive elements with metadata
    const elements = await session.page.evaluate(() => {
      const interactiveSelectors = [
        'a[href]',
        'button',
        'input',
        'textarea',
        'select',
        '[onclick]',
        '[role="button"]',
        '[role="link"]',
        '[contenteditable]',
        '[tabindex]'
      ];

      const elements: ElementInfo[] = [];
      const selector = interactiveSelectors.join(', ');
      const nodes = document.querySelectorAll(selector);

      nodes.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        const element = el as HTMLElement;

        // Generate unique selector
        let uniqueSelector = '';
        if (element.id) {
          uniqueSelector = `#${element.id}`;
        } else if (element.className) {
          const classes = Array.from(element.classList).join('.');
          uniqueSelector = `${element.tagName.toLowerCase()}.${classes}`;
        } else {
          uniqueSelector = element.tagName.toLowerCase();
        }

        elements.push({
          index: index,
          tagName: element.tagName.toLowerCase(),
          id: element.id || null,
          className: element.className || null,
          name: (element as any).name || null,
          value: (element as any).value || null,
          type: (element as any).type || null,
          text: element.textContent?.trim().substring(0, 100) || null,
          href: (element as HTMLAnchorElement).href || null,
          selector: uniqueSelector,
          xpath: getXPath(element),
          visible: rect.width > 0 && rect.height > 0,
          position: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        });
      });

      function getXPath(element: Element): string {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 0;
        const parent = element.parentNode as Element;
        const siblings = parent?.children || [];
        for (let i = 0; i < siblings.length; i++) {
          const sibling = siblings[i];
          if (sibling === element) {
            return getXPath(parent) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
        return '';
      }

      return elements;
    });

    const result = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      elementCount: elements.length,
      elements: elements,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
    };

    // Save to file if output path provided, otherwise save to project directory
    const outputPath = args.output || join(getOutputDirectory(), `snapshot_${Date.now()}.json`);
    await writeFile(outputPath, JSON.stringify(result, null, 2));

    outputJSON({
      success: true,
      output: outputPath,
      elementCount: elements.length,
      url: session.page.url()
    });

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

takeSnapshot();
