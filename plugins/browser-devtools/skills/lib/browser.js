/**
 * Shared browser utilities for browser debugging scripts
 */
import { chromium, firefox, webkit } from 'playwright';
let currentSession = null;
/**
 * Parse command line arguments
 */
export function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const nextArg = argv[i + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                args[key] = nextArg;
                i++;
            }
            else {
                args[key] = true;
            }
        }
    }
    return args;
}
/**
 * Get or create browser session
 */
export async function getBrowserSession(options = {}) {
    if (currentSession && currentSession.browser.isConnected()) {
        return currentSession;
    }
    const browserType = getBrowserType(options.browser || 'chromium');
    const launchOptions = {
        headless: options.headless !== false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            ...(options.args || [])
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
        sessionId: generateSessionId()
    };
    return currentSession;
}
/**
 * Get current page from session
 */
export function getCurrentPage() {
    return currentSession?.page || null;
}
/**
 * Close browser session
 */
export async function closeBrowserSession() {
    if (currentSession) {
        await currentSession.context.close();
        await currentSession.browser.close();
        currentSession = null;
    }
}
/**
 * Keep browser session open (for chaining commands)
 */
export function keepSessionOpen() {
    // Intentionally do nothing - just signal that session should remain
}
/**
 * Output JSON result
 */
export function outputJSON(data) {
    console.log(JSON.stringify(data, null, 2));
}
/**
 * Output error
 */
export function outputError(error) {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorData = {
        success: false,
        error: errorMessage,
        ...(error instanceof Error && { stack: error.stack })
    };
    console.error(JSON.stringify(errorData, null, 2));
    process.exit(1);
}
/**
 * Generate unique session ID
 */
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Get browser type by name
 */
function getBrowserType(name) {
    switch (name.toLowerCase()) {
        case 'firefox':
            return firefox;
        case 'webkit':
            return webkit;
        case 'chromium':
        default:
            return chromium;
    }
}
/**
 * Wait for element with timeout
 */
export async function waitForElement(page, selector, timeout) {
    try {
        await page.waitForSelector(selector, { timeout: timeout || 30000 });
    }
    catch (error) {
        throw new Error(`Element not found: ${selector} (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
}
/**
 * Get element position and visibility info
 */
export async function getElementInfo(page, selector) {
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
        tagName: await element.evaluate(el => el.tagName.toLowerCase()),
    };
}
/**
 * Execute JavaScript with error handling
 */
export async function executeScript(page, script) {
    try {
        return await page.evaluate(script);
    }
    catch (error) {
        throw new Error(`Script execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Create screenshot with options
 */
export async function createScreenshot(page, outputPath, options = {}) {
    const screenshotOptions = {
        type: 'png',
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
//# sourceMappingURL=browser.js.map