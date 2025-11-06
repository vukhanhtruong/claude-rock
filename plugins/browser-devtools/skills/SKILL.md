---
name: browser-devtools
description: Browser debugging and automation skill using Playwright. Use for debugging web applications, monitoring network traffic, capturing screenshots, DOM inspection, performance analysis, and testing UI interactions during development.
license: Apache-2.0
---

# Browser Debugger

Modern browser debugging and automation skill for developers using Playwright. Programmatic browser control for debugging, testing, and analyzing web applications during development.

## Decision tree

Here the decison tree when user want to inspect the console log, apply the same pattern for other prompt.

```
User task → Is URL provided?
    ├─ Yes → Detect if it reachable.
    │         ├─ Success → Implement Reconnaissance-then-action (RTA)
    |         |              1. Navigate to provided URL.
    |         |              2. Inspect console log
    |         |              3. Identify the errors
    |         |              4. Execute actions with discovered issues
    │         └─ Fails → End
    │
    └─ No → Is the development server already running?
              ├─ No → End
              │
              └─ Yes → Ask user if they want to test development server?
                        ├─ Yes →  Reconnaissance-then-action (RTA)
                        ├─ No → End
```

## Quick Start

### Installation

```bash
cd plugins/browser-devtools/skills
./scripts/install.sh
```

### Test Installation

```bash
node dist/scripts/navigate.js --url https://example.com
# Output: {"success": true, "url": "https://example.com", "title": "Example Domain"}
```

## Available Scripts

All scripts are in `plugins/browser-devtools/skills/scripts/` (compiled to `dist/scripts/`)

### Core Debugging Scripts

- `navigate.js` - Navigate to URLs for debugging
- `screenshot.js` - Capture screenshots for visual debugging
- `snapshot.js` - DOM inspection and element discovery
- `evaluate.js` - Execute JavaScript for debugging and analysis
- `click.js` - Element interaction for testing UI behavior
- `fill.js` - Form testing and input validation

### Developer Monitoring Tools

- `console.js` - Console log monitoring and error tracking
- `network.js` - Network request debugging and performance analysis
- `performance.js` - Performance metrics and Core Web Vitals

## Usage Patterns

### Single Command

```bash
node dist/scripts/screenshot.js --url https://example.com --output ./docs/screenshots/page.png
```

### Chain Commands (reuse browser session)

```bash
# Keep browser open with --close false
node dist/scripts/navigate.js --url https://example.com/login --close false
node dist/scripts/fill.js --selector "#email" --value "user@example.com" --close false
node dist/scripts/fill.js --selector "#password" --value "secret" --close false
node dist/scripts/click.js --selector "button[type=submit]"
```

### Parse JSON Output

```bash
# Extract specific fields with jq
node dist/scripts/performance.js --url https://example.com | jq '.vitals.LCP'

# Save to file
node dist/scripts/network.js --url https://example.com --output /tmp/requests.json
```

## Common Debugging Workflows

### Visual Debugging

```bash
# Capture full page screenshot
node dist/scripts/screenshot.js --url https://example.com --full-page true

# Capture specific element
node dist/scripts/screenshot.js --url https://example.com --selector ".header" --output header.png
```

### DOM Inspection

```bash
# Get all interactive elements
node dist/scripts/snapshot.js --url https://example.com | jq '.elements[] | {tagName, text, selector}'
```

### JavaScript Debugging

```bash
# Execute custom JavaScript
node dist/scripts/evaluate.js --url https://example.com --script "document.querySelectorAll('.error').length"
```

### Form Testing

```bash
# Test form submission
node dist/scripts/fill.js --url https://example.com --selector "#search" --value "query" --close false
node dist/scripts/click.js --selector "button[type=submit]"
```

### Console Monitoring

```bash
# Monitor errors for 10 seconds
node dist/scripts/console.js --url https://example.com --types error,warn --duration 10000
```

### Network Analysis

```bash
# Track API calls
node dist/scripts/network.js --url https://example.com --types xhr,fetch --duration 5000
```

### Performance Analysis

```bash
# Get Core Web Vitals
node dist/scripts/performance.js --url https://example.com

# Record performance trace
node dist/scripts/performance.js --url https://example.com --trace trace.json
```

## Script Options

All scripts support common options:

- `--headless false` - Show browser window (default: true)
- `--close false` - Keep browser open for chaining commands (default: true)
- `--timeout 30000` - Set timeout in milliseconds
- `--browser chromium|firefox|webkit` - Choose browser engine (default: chromium)

## Output Format

All scripts output structured JSON:

```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Domain",
  "sessionId": "session_1234567890_abc123",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "...": "script-specific data"
}
```

Errors are output with consistent format:

```json
{
  "success": false,
  "error": "Element not found: .missing-element",
  "stack": "Error: Element not found..."
}
```

## Finding Elements

Use `snapshot.js` to discover selectors:

```bash
node dist/scripts/snapshot.js --url https://example.com | jq '.elements[] | {tagName, text, selector, visible}'
```

## Debugging Sessions

Browser sessions persist between commands when using `--close false`:

```bash
# Start session
node dist/scripts/navigate.js --url https://app.example.com --close false

# Continue debugging...
node dist/scripts/snapshot.js  # Uses same page
node dist/scripts/console.js --duration 5000

# End session
node dist/scripts/navigate.js --url about:blank  # Or close browser manually
```

## Performance Monitoring

### Core Web Vitals

```bash
node dist/scripts/performance.js --url https://example.com | jq '.vitals'
```

### Network Performance

```bash
node dist/scripts/network.js --url https://example.com | jq '.monitoring.averageResponseTime'
```

### Resource Analysis

```bash
node dist/scripts/performance.js --url https://example.com --resources true | jq '.resources.resourcesByType'
```

## Error Handling and Troubleshooting

### Common Issues

**"Browser not installed"**

- Run: `npm run install-browsers`

**"Element not found"**

- Get snapshot first: `node dist/scripts/snapshot.js --url <url>`
- Check element visibility and selector accuracy

**"Script timeout"**

- Increase timeout: `--timeout 60000`
- Check network connectivity and page load times

**"Permission denied"**

- Make install script executable: `chmod +x scripts/install.sh`

### Debug Mode

```bash
# Run with visible browser for debugging
node dist/scripts/navigate.js --url https://example.com --headless false
```

### Session Issues

Browser sessions can become stale. Start a new session if you see unexpected behavior:

```bash
# Force new session
node dist/scripts/navigate.js --url https://example.com --close true
```

## Advanced Usage

### Custom Selectors

```bash
# CSS selectors
node dist/scripts/click.js --selector "#main .button.primary"

# XPath
node dist/scripts/click.js --selector "xpath=//button[contains(text(), 'Submit')]"

# Text selectors
node dist/scripts/click.js --selector "text=Click me"
```

### Wait Strategies

```bash
# Wait for specific element after click
node dist/scripts/click.js --selector "#submit" --wait-for ".success-message"
```

### JavaScript Evaluation

```bash
# Complex debugging scripts
node dist/scripts/evaluate.js --url https://example.com --script "
  const errors = document.querySelectorAll('.error');
  return Array.from(errors).map(el => ({
    message: el.textContent,
    visible: el.offsetParent !== null
  }));
"
```

## Cross-Browser Testing

```bash
# Test in Firefox
node dist/scripts/navigate.js --url https://example.com --browser firefox

# Test in WebKit (Safari)
node dist/scripts/navigate.js --url https://example.com --browser webkit
```

## Best Practices

- **Compliance Decision tree**: The decision tree must be followed strictly.
- **Use specific selectors**: Prefer IDs and classes over generic tags
- **Wait for elements**: Use appropriate wait strategies for dynamic content
- **Clean up sessions**: Close sessions when done to free resources
- **Monitor performance**: Regularly check Core Web Vitals during development
- **Validate forms**: Test form inputs and validation systematically

## Integration with Development Workflow

### Pre-commit Testing

```bash
# Quick smoke test
node dist/scripts/navigate.js --url http://localhost:3000 && \
node dist/scripts/performance.js --url http://localhost:3000 | jq '.vitals.LCP'
```

### CI/CD Integration

```bash
# Performance regression testing
node dist/scripts/performance.js --url $APP_URL | jq '.vitals.LCP' | \
  awk '{print $1 < 2500 ? "PASS" : "FAIL"}'
```

### API Testing

```bash
# Monitor API calls during user flow
node dist/scripts/network.js --url $APP_URL --types xhr,fetch --duration 10000 | \
  jq '.requests | map(select(.status >= 400)) | length'
```

## References

- [Playwright Documentation](https://playwright.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Core Web Vitals](https://web.dev/vitals/)
- [MDN Web Docs](https://developer.mozilla.org/)
