/**
 * Shared browser utilities for browser debugging scripts
 */
import { Browser, BrowserContext, Page } from 'playwright';
export interface BrowserOptions {
    browser?: 'chromium' | 'firefox' | 'webkit';
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
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
/**
 * Parse command line arguments
 */
export declare function parseArgs(argv: string[]): Record<string, string | boolean>;
/**
 * Get or create browser session
 */
export declare function getBrowserSession(options?: BrowserOptions): Promise<DebugSession>;
/**
 * Get current page from session
 */
export declare function getCurrentPage(): Page | null;
/**
 * Close browser session
 */
export declare function closeBrowserSession(): Promise<void>;
/**
 * Keep browser session open (for chaining commands)
 */
export declare function keepSessionOpen(): void;
/**
 * Output JSON result
 */
export declare function outputJSON(data: any): void;
/**
 * Output error
 */
export declare function return outputError(error: Error | string): never;
/**
 * Wait for element with timeout
 */
export declare function waitForElement(page: Page, selector: string, timeout?: number): Promise<void>;
/**
 * Get element position and visibility info
 */
export declare function getElementInfo(page: Page, selector: string): Promise<{
    selector: string;
    visible: boolean;
    position: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    text: string | null;
    tagName: string;
}>;
/**
 * Execute JavaScript with error handling
 */
export declare function executeScript(page: Page, script: string): Promise<any>;
/**
 * Create screenshot with options
 */
export declare function createScreenshot(page: Page, outputPath?: string, options?: {
    fullPage?: boolean;
    selector?: string;
}): Promise<Buffer | string>;
//# sourceMappingURL=browser.d.ts.map
