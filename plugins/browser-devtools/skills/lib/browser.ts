/**
 * Shared browser utilities for browser debugging scripts
 */

import {
  chromium,
  firefox,
  webkit,
  Browser,
  BrowserContext,
  Page,
  LaunchOptions,
} from "playwright";
import { join } from "path";
import { existsSync } from "fs";

export interface BrowserOptions {
  browser?: "chromium" | "firefox" | "webkit";
  headless?: boolean;
  viewport?: { width: number; height: number };
  timeout?: number;
  slowMo?: number;
  args?: string[];
}

export interface DebugSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  sessionId: string;
}

let currentSession: DebugSession | null = null;

/**
 * Get the best output directory for saving files
 * Priority:
 * 1. CLAUDE_PROJECT_DIR environment variable (if set)
 * 2. Find project root by looking for common project files
 * 3. Use current working directory
 */
export function getOutputDirectory(): string {
  // Check if Claude provides the original project directory
  const claudeProjectDir = process.env.CLAUDE_PROJECT_DIR;
  if (claudeProjectDir) {
    return claudeProjectDir;
  }

  // Try to find project root by looking for common project files
  let currentDir = process.cwd();
  let foundProjectRoot = null;

  // First pass: look for priority markers (walk up the entire tree)
  while (currentDir !== '/') {
    const priorityMarkers = ['.git', 'Cargo.toml', 'pyproject.toml', 'go.mod', 'pom.xml', 'build.gradle'];

    const hasPriorityMarker = priorityMarkers.some(file => {
      return existsSync(join(currentDir, file));
    });

    if (hasPriorityMarker) {
      foundProjectRoot = currentDir;
      break;
    }

    // Go up one directory
    const parentDir = join(currentDir, '..');
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  // If we found a priority marker, return it
  if (foundProjectRoot) {
    return foundProjectRoot;
  }

  // Second pass: if no priority markers found, look for secondary markers (but avoid node_modules)
  currentDir = process.cwd();
  while (currentDir !== '/') {
    const secondaryMarkers = ['package.json', 'tsconfig.json', 'requirements.txt', 'Makefile'];

    const hasSecondaryMarker = secondaryMarkers.some(file => {
      return existsSync(join(currentDir, file));
    });

    if (hasSecondaryMarker && !currentDir.includes('node_modules')) {
      return currentDir;
    }

    // Go up one directory
    const parentDir = join(currentDir, '..');
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  // Fallback to current working directory
  return process.cwd();
}

/**
 * Parse command line arguments
 */
export function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = argv[i + 1];

      if (nextArg && !nextArg.startsWith("--")) {
        args[key] = nextArg;
        i++;
      } else {
        args[key] = true;
      }
    }
  }

  return args;
}

/**
 * Get or create browser session
 */
export async function getBrowserSession(
  options: BrowserOptions = {},
): Promise<DebugSession> {
  if (currentSession && currentSession.browser.isConnected()) {
    return currentSession;
  }

  const browserType = getBrowserType(options.browser || "chromium");

  const launchOptions: LaunchOptions = {
    headless: options.headless !== false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      ...(options.args || []),
    ],
    slowMo: options.slowMo,
  };

  const browser = await browserType.launch(launchOptions);
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  page.setDefaultTimeout(options.timeout || 30000);

  currentSession = {
    browser,
    context,
    page,
    sessionId: generateSessionId(),
  };

  return currentSession;
}

/**
 * Get current page from session
 */
export function getCurrentPage(): Page | null {
  return currentSession?.page || null;
}

/**
 * Get existing session without creating a new one
 */
export function getExistingSession(): DebugSession | null {
  if (currentSession && currentSession.browser.isConnected()) {
    return currentSession;
  }
  return null;
}

/**
 * Close browser session
 */
export async function closeBrowserSession(): Promise<void> {
  if (currentSession) {
    await currentSession.context.close();
    await currentSession.browser.close();
    currentSession = null;
  }
}

/**
 * Keep browser session open (for chaining commands)
 */
export function keepSessionOpen(): void {
  // Intentionally do nothing - just signal that session should remain
}

/**
 * Output JSON result
 */
export function outputJSON(data: any): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output error
 */
export function outputError(error: Error | string): never {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorData = {
    success: false,
    error: errorMessage,
    ...(error instanceof Error && { stack: error.stack }),
  };

  console.error(JSON.stringify(errorData, null, 2));
  process.exit(1);
}

/**
 * Generate unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get browser type by name
 */
function getBrowserType(name: string) {
  switch (name.toLowerCase()) {
    case "firefox":
      return firefox;
    case "webkit":
      return webkit;
    case "chromium":
    default:
      return chromium;
  }
}

/**
 * Wait for element with timeout
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout?: number,
): Promise<void> {
  try {
    await page.waitForSelector(selector, { timeout: timeout || 30000 });
  } catch (error) {
    throw new Error(
      `Element not found: ${selector} (${error instanceof Error ? error.message : "Unknown error"})`,
    );
  }
}

/**
 * Get element position and visibility info
 */
export async function getElementInfo(page: Page, selector: string) {
  const element = await page.$(selector);
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const isVisible = await element.isVisible();
  const boundingBox = await element.boundingBox();
  const textContent = await element.textContent();

  return {
    selector,
    visible: isVisible,
    position: boundingBox,
    text: textContent?.trim() || null,
    tagName: await element.evaluate((el) => el.tagName.toLowerCase()),
  };
}

/**
 * Execute JavaScript with error handling
 */
export async function executeScript(page: Page, script: string): Promise<any> {
  try {
    return await page.evaluate(script);
  } catch (error) {
    throw new Error(
      `Script execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Create screenshot with options
 */
export async function createScreenshot(
  page: Page,
  outputPath?: string,
  options: { fullPage?: boolean; selector?: string } = {},
): Promise<Buffer | string> {
  const screenshotOptions: any = {
    type: "png",
    fullPage: options.fullPage || false,
  };

  if (options.selector) {
    const element = await page.$(options.selector);
    if (!element) {
      throw new Error(`Element not found for screenshot: ${options.selector}`);
    }
    return await element.screenshot(screenshotOptions);
  }

  if (outputPath) {
    await page.screenshot({ ...screenshotOptions, path: outputPath });
    return outputPath;
  }

  return await page.screenshot(screenshotOptions);
}
