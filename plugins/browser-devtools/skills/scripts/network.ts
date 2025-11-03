#!/usr/bin/env node
/**
 * Network request debugging and performance analysis
 * Usage: node network.js --url https://example.com [--types xhr,fetch] [--duration 5000] [--output requests.json]
 */

import { getBrowserSession, closeBrowserSession, parseArgs, outputJSON, outputError } from '../lib/browser.js';
import { writeFile } from 'fs/promises';

interface NetworkArgs {
  url?: string;
  types?: string;
  duration?: string;
  output?: string;
  timeout?: string;
  headless?: string | boolean;
  close?: string | boolean;
  browser?: string;
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText: string;
  type: string;
  resourceType: string;
  size: {
    request: number;
    response: number;
    total: number;
  };
  timing: {
    startTime: number;
    endTime: number;
    duration: number;
  };
  headers: {
    request: Record<string, string>;
    response: Record<string, string>;
  };
  failed: boolean;
  errorText?: string;
}

async function monitorNetwork() {
  const args = parseArgs(process.argv.slice(2)) as NetworkArgs;

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

    const requests: NetworkRequest[] = [];
    const filterTypes = args.types ? args.types.split(',').map(t => t.trim().toLowerCase()) : null;
    const duration = args.duration ? parseInt(args.duration) : 5000;

    // Set up request and response listeners
    session.page.on('request', (request) => {
      const resourceType = request.resourceType().toLowerCase();

      // Filter by resource types if specified
      if (filterTypes && !filterTypes.includes(resourceType)) {
        return;
      }

      const requestData: any = {
        url: request.url(),
        method: request.method(),
        resourceType: resourceType,
        type: 'request',
        headers: request.headers(),
        size: {
          request: 0, // Playwright doesn't expose header size directly
          response: 0,
          total: 0,
        },
        timing: {
          startTime: Date.now(),
          endTime: 0,
          duration: 0,
        },
        status: 0,
        statusText: '',
        failed: false,
      };

      // Store temporary request data
      (request as any)._requestData = requestData;
    });

    session.page.on('response', async (response) => {
      const request = response.request() as any;
      const requestData = request._requestData;

      if (!requestData) {
        return; // Skip if not tracked
      }

      const resourceType = response.request().resourceType().toLowerCase();

      // Filter by resource types if specified
      if (filterTypes && !filterTypes.includes(resourceType)) {
        return;
      }

      const endTime = Date.now();
      const responseBody = await response.text();
      const responseSize = responseBody.length;

      const networkRequest: NetworkRequest = {
        url: response.url(),
        method: request.method(),
        status: response.status(),
        statusText: response.statusText(),
        type: 'response',
        resourceType: resourceType,
        size: {
          request: requestData.size.request,
          response: responseSize,
          total: requestData.size.request + responseSize,
        },
        timing: {
          startTime: requestData.timing.startTime,
          endTime: endTime,
          duration: endTime - requestData.timing.startTime,
        },
        headers: {
          request: requestData.headers,
          response: response.headers(),
        },
        failed: !response.ok(),
        errorText: !response.ok() ? response.statusText() : undefined,
      };

      requests.push(networkRequest);
    });

    session.page.on('requestfailed', (request) => {
      const requestData = (request as any)._requestData;

      if (!requestData) {
        return; // Skip if not tracked
      }

      const resourceType = request.resourceType().toLowerCase();

      // Filter by resource types if specified
      if (filterTypes && !filterTypes.includes(resourceType)) {
        return;
      }

      const endTime = Date.now();

      const networkRequest: NetworkRequest = {
        url: request.url(),
        method: request.method(),
        status: 0,
        statusText: 'Failed',
        type: 'failed',
        resourceType: resourceType,
        size: requestData.size,
        timing: {
          startTime: requestData.timing.startTime,
          endTime: endTime,
          duration: endTime - requestData.timing.startTime,
        },
        headers: {
          request: requestData.headers,
          response: {},
        },
        failed: true,
        errorText: (request as any).failure()?.errorText || 'Request failed',
      };

      requests.push(networkRequest);
    });

    // Navigate to the URL
    await session.page.goto(args.url, { waitUntil: 'networkidle' });

    // Wait for the specified duration
    await new Promise(resolve => setTimeout(resolve, duration));

    // Calculate summary statistics
    const summary = {
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => !r.failed).length,
      failedRequests: requests.filter(r => r.failed).length,
      totalSize: requests.reduce((sum, r) => sum + r.size.total, 0),
      averageResponseTime: requests.length > 0
        ? requests.reduce((sum, r) => sum + r.timing.duration, 0) / requests.length
        : 0,
      requestsByType: requests.reduce((acc, r) => {
        acc[r.resourceType] = (acc[r.resourceType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      requestsByStatus: requests.reduce((acc, r) => {
        if (r.failed) {
          acc['failed'] = (acc['failed'] || 0) + 1;
        } else {
          const statusGroup = Math.floor(r.status / 100) * 100;
          acc[statusGroup] = (acc[statusGroup] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
    };

    const result = {
      success: true,
      url: session.page.url(),
      title: await session.page.title(),
      monitoring: {
        duration: duration,
        types: filterTypes || 'all',
        ...summary,
      },
      requests: requests,
      sessionId: session.sessionId,
      timestamp: new Date().toISOString(),
    };

    // Save to file if output path provided
    if (args.output) {
      await writeFile(args.output, JSON.stringify(result, null, 2));
      outputJSON({
        success: true,
        output: args.output,
        ...summary,
        url: session.page.url()
      });
    } else {
      outputJSON(result);
    }

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

monitorNetwork();
