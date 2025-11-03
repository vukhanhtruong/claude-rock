# Browser Debugger Guide

Comprehensive guide for debugging web applications using the browser-devtools skill.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Debugging Workflows](#debugging-workflows)
3. [Common Scenarios](#common-scenarios)
4. [Advanced Techniques](#advanced-techniques)
5. [Performance Analysis](#performance-analysis)
6. [Network Debugging](#network-debugging)
7. [JavaScript Debugging](#javascript-debugging)

## Getting Started

### Quick Setup

```bash
cd plugins/browser-devtools/skills
./scripts/install.sh

# Test basic functionality
node dist/scripts/navigate.js --url https://example.com
```

### Basic Debugging Session

```bash
# 1. Open application (keep browser open)
node dist/scripts/navigate.js --url http://localhost:3000 --headless false --close false

# 2. Take initial screenshot
node dist/scripts/screenshot.js --output initial-state.png

# 3. Get page elements
node dist/scripts/snapshot.js --output page-elements.json

# 4. Monitor console for errors
node dist/scripts/console.js --duration 10000 --types error,warn
```

## Debugging Workflows

### Workflow 1: Visual Bug Investigation

When UI elements look wrong or are positioned incorrectly:

```bash
# 1. Navigate to page with issue
node dist/scripts/navigate.js --url https://example.com/page-with-issue --close false

# 2. Capture full page screenshot
node dist/scripts/screenshot.js --full-page true --output bug-screenshot.png

# 3. Get DOM snapshot of problematic area
node dist/scripts/snapshot.js --output dom-snapshot.json

# 4. Inspect specific elements
node dist/scripts/evaluate.js --script "
  const element = document.querySelector('.problematic-element');
  if (element) {
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    return {
      visible: rect.width > 0 && rect.height > 0,
      position: rect,
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      zIndex: styles.zIndex
    };
  }
  return null;
"

# 5. Get computed styles
node dist/scripts/evaluate.js --script "
  const element = document.querySelector('.problematic-element');
  return element ? window.getComputedStyle(element).cssText : null;
"
```

### Workflow 2: Form Validation Debugging

Debug form submission and validation issues:

```bash
# 1. Navigate to form page
node dist/scripts/navigate.js --url https://example.com/contact --close false

# 2. Get all form elements
node dist/scripts/snapshot.js | jq '.elements[] | select(.tagName == "input" or .tagName == "textarea" or .tagName == "select")'

# 3. Fill form fields
node dist/scripts/fill.js --selector "#name" --value "John Doe" --close false
node dist/scripts/fill.js --selector "#email" --value "john@example.com" --close false

# 4. Capture pre-submission state
node dist/scripts/screenshot.js --output pre-submission.png --close false

# 5. Submit form and monitor for errors
node dist/scripts/click.js --selector "button[type=submit]" --wait-for ".error-message,.success-message"

# 6. Check for validation errors
node dist/scripts/console.js --duration 3000 --types error,warn
```

### Workflow 3: Performance Issue Investigation

When pages are slow or unresponsive:

```bash
# 1. Get baseline performance metrics
node dist/scripts/performance.js --url https://slow-page.com --output baseline-perf.json

# 2. Monitor network requests
node dist/scripts/network.js --url https://slow-page.com --duration 10000 --output network-analysis.json

# 3. Capture performance trace
node dist/scripts/performance.js --url https://slow-page.com --trace slow-page-trace.json

# 4. Analyze resource loading
node dist/scripts/performance.js --url https://slow-page.com --resources true | jq '.resources.resourcesByType'

# 5. Check for large resources
node dist/scripts/evaluate.js --script "
  const resources = performance.getEntriesByType('resource');
  return resources
    .filter(r => r.transferSize > 1000000) // > 1MB
    .map(r => ({
      name: r.name,
      size: r.transferSize,
      duration: r.duration
    }))
    .sort((a, b) => b.size - a.size);
"
```

## Common Scenarios

### Scenario 1: Element Not Found

**Problem:** Script fails with "Element not found" error.

**Debugging Steps:**

```bash
# 1. Get page snapshot to find correct selector
node dist/scripts/snapshot.js --url https://example.com | jq '.elements[]'

# 2. Check if element is loaded dynamically
node dist/scripts/navigate.js --url https://example.com --close false
node dist/scripts/console.js --duration 5000 --types log

# 3. Wait for element with longer timeout
node dist/scripts/click.js --selector ".dynamic-button" --wait-timeout 10000

# 4. Check element visibility
node dist/scripts/evaluate.js --script "
  const element = document.querySelector('.dynamic-button');
  return element ? {
    exists: true,
    visible: element.offsetParent !== null,
    display: window.getComputedStyle(element).display,
    opacity: window.getComputedStyle(element).opacity
  } : { exists: false };
"
```

### Scenario 2: Console Errors

**Problem:** JavaScript errors preventing functionality.

**Debugging Steps:**

```bash
# 1. Monitor console for all errors
node dist/scripts/console.js --url https://example.com --duration 10000 --types error

# 2. Get detailed error information
node dist/scripts/evaluate.js --script "
  // Set up global error handler
  window.errors = [];
  window.addEventListener('error', (e) => {
    window.errors.push({
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack
    });
  });

  // Trigger some interactions to catch errors
  setTimeout(() => {
    document.querySelector('.problematic-element')?.click();
  }, 1000);

  return window.errors;
"

# 3. Check for unhandled promise rejections
node dist/scripts/evaluate.js --script "
  window.rejections = [];
  window.addEventListener('unhandledrejection', (e) => {
    window.rejections.push({
      reason: e.reason,
      promise: e.promise
    });
  });

  return window.rejections;
"
```

### Scenario 3: Network Issues

**Problem:** API calls failing or slow loading.

**Debugging Steps:**

```bash
# 1. Monitor all network requests
node dist/scripts/network.js --url https://example.com --duration 15000 --output all-requests.json

# 2. Focus on failed requests
node dist/scripts/network.js --url https://example.com --duration 10000 | jq '.requests[] | select(.failed)'

# 3. Check API response times
node dist/scripts/network.js --url https://example.com --types xhr,fetch | jq '
  .requests[]
  | select(.resourceType == "xhr" or .resourceType == "fetch")
  | {url: .url, status: .status, duration: .timing.duration}
  | select(.duration > 2000)'
"

# 4. Test API endpoints directly
node dist/scripts/evaluate.js --script "
  fetch('/api/endpoint')
    .then(response => {
      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      };
    })
    .catch(error => ({error: error.message}));
"
```

## Advanced Techniques

### Custom Selectors and Strategies

```bash
# Complex CSS selectors
node dist/scripts/click.js --selector "form#contact-form button[type=submit]:not([disabled])"

# Text-based selection
node dist/scripts/click.js --selector "text=Submit Form"

# XPath for complex conditions
node dist/scripts/click.js --selector "xpath=//button[contains(@class, 'btn') and contains(text(), 'Submit')]"

# Multiple selector fallbacks
node dist/scripts/evaluate.js --script "
  const selectors = [
    '#submit-button',
    '.submit-btn',
    'button[type=submit]',
    'form button'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element && element.offsetParent !== null) {
      return { found: true, selector: selector };
    }
  }
  return { found: false };
"
```

### Conditional Testing

```bash
# Test element states
node dist/scripts/evaluate.js --script "
  const button = document.querySelector('#submit-btn');
  if (!button) return { error: 'Button not found' };

  return {
    exists: true,
    disabled: button.disabled,
    visible: button.offsetParent !== null,
    text: button.textContent,
    className: button.className
  };
"

# Wait for conditions
node dist/scripts/evaluate.js --script "
  return new Promise((resolve) => {
    const checkCondition = () => {
      const loader = document.querySelector('.loading');
      if (!loader || loader.offsetParent === null) {
        resolve({ loaded: true });
      } else {
        setTimeout(checkCondition, 100);
      }
    };
    checkCondition();
  });
"
```

### Data Extraction

```bash
# Extract table data
node dist/scripts/evaluate.js --script "
  const table = document.querySelector('table');
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll('tr'));
  return rows.map(row => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return cells.map(cell => cell.textContent.trim());
  });
"

# Extract form data
node dist/scripts/evaluate.js --script "
  const form = document.querySelector('form');
  if (!form) return null;

  const formData = new FormData(form);
  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = value;
  }
  return data;
"

# Extract link information
node dist/scripts/evaluate.js --script "
  const links = Array.from(document.querySelectorAll('a[href]'));
  return links.map(link => ({
    text: link.textContent.trim(),
    href: link.href,
    external: link.hostname !== window.location.hostname,
    download: link.hasAttribute('download')
  }));
"
```

## Performance Analysis

### Core Web Vitals Debugging

```bash
# Get detailed LCP information
node dist/scripts/evaluate.js --script "
  return new Promise((resolve) => {
    let lcp = 0;
    let lcpElement = null;

    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      lcp = lastEntry.renderTime || lastEntry.loadTime;
      lcpElement = lastEntry.element;
    }).observe({ entryTypes: ['largest-contentful-paint'], buffered: true });

    setTimeout(() => {
      resolve({
        lcp: lcp,
        element: lcpElement ? {
          tagName: lcpElement.tagName,
          src: lcpElement.src || lcpElement.currentSrc,
          className: lcpElement.className
        } : null
      });
    }, 2000);
  });
"

# Analyze layout shifts
node dist/scripts/evaluate.js --script "
  return new Promise((resolve) => {
    const shifts = [];

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          shifts.push({
            value: entry.value,
            sources: entry.sources?.map(s => ({
              node: s.node?.tagName,
              className: s.node?.className
            }))
          });
        }
      }
    }).observe({ entryTypes: ['layout-shift'], buffered: true });

    setTimeout(() => {
      resolve({
        cls: shifts.reduce((sum, shift) => sum + shift.value, 0),
        shifts: shifts
      });
    }, 3000);
  });
"
```

### Memory Usage Analysis

```bash
# Monitor memory consumption
node dist/scripts/evaluate.js --script "
  const measureMemory = () => {
    if (performance.memory) {
      return {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      };
    }
    return null;
  };

  // Take baseline
  const baseline = measureMemory();

  // Simulate user interactions that might leak memory
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.textContent = 'Test ' + i;
    document.body.appendChild(div);
  }

  // Force garbage collection if available
  if (window.gc) window.gc();

  const after = measureMemory();

  return { baseline, after };
"

# Check for memory leaks in single-page applications
node dist/scripts/evaluate.js --script "
  // Navigate between pages and check memory
  const navigate = (path) => {
    return new Promise(resolve => {
      window.history.pushState({}, '', path);
      setTimeout(resolve, 1000);
    });
  };

  const measure = () => performance.memory ? performance.memory.usedJSHeapSize : 0;

  const measurements = [];
  const pages = ['/page1', '/page2', '/page3'];

  for (const page of pages) {
    await navigate(page);
    measurements.push({ page, memory: measure() });
  }

  return measurements;
"
```

## Network Debugging

### Request Analysis

```bash
# Find slowest requests
node dist/scripts/network.js --url https://example.com --duration 10000 | jq '
  .requests[]
  | {url: .url, duration: .timing.duration, size: .size.total}
  | sort_by(.duration)
  | reverse
  | .[0:5]'

# Find failed requests
node dist/scripts/network.js --url https://example.com --duration 10000 | jq '
  .requests[]
  | select(.failed)
  | {url: .url, error: .errorText, status: .status}'

# Analyze API endpoints
node dist/scripts/network.js --url https://example.com --types xhr,fetch | jq '
  .requests[]
  | select(.url | test("/api/"))
  | {method: .method, url: .url, status: .status, duration: .timing.duration}'
```

### Custom Request Monitoring

```bash
# Intercept and modify requests
node dist/scripts/evaluate.js --script "
  // Override fetch to monitor calls
  const originalFetch = window.fetch;
  const fetchCalls = [];

  window.fetch = async function(...args) {
    const start = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      const end = performance.now();

      fetchCalls.push({
        url: args[0],
        method: args[1]?.method || 'GET',
        status: response.status,
        duration: end - start,
        success: response.ok
      });

      return response;
    } catch (error) {
      const end = performance.now();

      fetchCalls.push({
        url: args[0],
        method: args[1]?.method || 'GET',
        error: error.message,
        duration: end - start,
        success: false
      });

      throw error;
    }
  };

  return { message: 'Fetch monitoring enabled', callCount: fetchCalls.length };
"

// Later, get the results
node dist/scripts/evaluate.js --script "
  // Trigger some actions that make API calls
  document.querySelector('#load-data')?.click();

  // Wait a bit for requests to complete
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(window.fetchCalls || []);
    }, 2000);
  });
"
```

## JavaScript Debugging

### Error Handling

```bash
# Comprehensive error monitoring
node dist/scripts/evaluate.js --script "
  const errors = [];

  // Monitor different error types
  window.addEventListener('error', (e) => {
    errors.push({
      type: 'javascript',
      message: e.message,
      line: e.lineno,
      column: e.colno,
      file: e.filename,
      stack: e.error?.stack,
      timestamp: Date.now()
    });
  });

  window.addEventListener('unhandledrejection', (e) => {
    errors.push({
      type: 'promise',
      reason: e.reason?.toString() || 'Unknown',
      timestamp: Date.now()
    });
  });

  // Monitor resource loading errors
  window.addEventListener('error', (e) => {
    if (e.target !== window) {
      errors.push({
        type: 'resource',
        element: e.target.tagName,
        source: e.target.src || e.target.href,
        timestamp: Date.now()
      });
    }
  }, true);

  return { message: 'Error monitoring enabled' };
"

// Trigger interactions and collect errors
node dist/scripts/evaluate.js --script "
  // Simulate problematic interactions
  setTimeout(() => {
    try {
      document.querySelector('#non-existent').click();
    } catch (e) {
      // Error will be caught by global handler
    }

    // Trigger a promise rejection
    Promise.reject(new Error('Test rejection'));
  }, 1000);

  return new Promise(resolve => {
    setTimeout(() => {
      resolve(window.errors || []);
    }, 2000);
  });
"
```

### Function Tracing

```bash
# Monitor function calls
node dist/scripts/evaluate.js --script "
  const functionCalls = [];

  function traceFunction(obj, funcName) {
    const original = obj[funcName];
    obj[funcName] = function(...args) {
      const start = performance.now();
      const result = original.apply(this, args);
      const end = performance.now();

      functionCalls.push({
        function: funcName,
        args: args.length,
        duration: end - start,
        timestamp: start
      });

      return result;
    };
  }

  // Trace common DOM methods
  ['querySelector', 'querySelectorAll', 'addEventListener'].forEach(func => {
    traceFunction(document, func);
  });

  return { message: 'Function tracing enabled' };
"

// Execute actions and check traces
node dist/scripts/evaluate.js --script "
  // Perform some DOM operations
  document.querySelector('body');
  document.querySelectorAll('div');

  return window.functionCalls || [];
"
```

## Best Practices

1. **Always use specific selectors** - Prefer IDs over classes, classes over tags
2. **Wait for dynamic content** - Use appropriate wait strategies for AJAX-loaded content
3. **Monitor performance** - Regularly check Core Web Vitals during development
4. **Capture evidence** - Take screenshots when debugging visual issues
5. **Clean up sessions** - Close browser sessions when done to free resources
6. **Handle errors gracefully** - Check success status of all operations
7. **Use timeouts appropriately** - Set realistic timeouts for page loads and operations
8. **Test across browsers** - Verify functionality in different browser engines when needed
