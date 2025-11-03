# Browser Debugger Scripts

CLI scripts for browser debugging and automation using Playwright.

## Installation

```bash
# Quick install
cd plugins/browser-devtools/skills
./scripts/install.sh

# Manual install
npm install
npm run install-browsers
```

## Scripts Reference

### navigate.js

Navigate to URLs for debugging.

```bash
node dist/scripts/navigate.js --url https://example.com [--options]
```

**Options:**

- `--url` (required) - URL to navigate to
- `--wait-until` - Wait strategy: `load`, `domcontentloaded`, `networkidle` (default: `networkidle`)
- `--timeout` - Navigation timeout in milliseconds (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open after navigation
- `--browser chromium|firefox|webkit` - Browser engine (default: `chromium`)

**Example:**

```bash
node dist/scripts/navigate.js --url https://example.com --wait-until domcontentloaded
```

### screenshot.js

Capture screenshots for visual debugging.

```bash
node dist/scripts/screenshot.js --output screenshot.png [--options]
```

**Options:**

- `--url` - URL to navigate to (optional if using selector only)
- `--output` - Output file path (auto-generates if not provided)
- `--selector` - CSS selector for element screenshot
- `--full-page true` - Capture full page screenshot
- `--format png|jpeg` - Image format (default: `png`)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Full page screenshot
node dist/scripts/screenshot.js --url https://example.com --full-page true

# Element screenshot
node dist/scripts/screenshot.js --url https://example.com --selector ".header" --output header.png
```

### snapshot.js

DOM inspection and element discovery.

```bash
node dist/scripts/snapshot.js [--options]
```

**Options:**

- `--url` - URL to analyze (optional, uses current page if in session)
- `--output` - Save snapshot to JSON file
- `--timeout` - Page load timeout (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Example:**

```bash
# Get interactive elements
node dist/scripts/snapshot.js --url https://example.com

# Save to file
node dist/scripts/snapshot.js --url https://example.com --output page-elements.json
```

### evaluate.js

Execute JavaScript for debugging and analysis.

```bash
node dist/scripts/evaluate.js --script "document.title" [--options]
```

**Options:**

- `--script` (required) - JavaScript code to execute
- `--url` - URL to navigate to first (optional)
- `--timeout` - Script execution timeout (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Get page title
node dist/scripts/evaluate.js --script "document.title"

# Count elements
node dist/scripts/evaluate.js --url https://example.com --script "document.querySelectorAll('button').length"

# Complex analysis
node dist/scripts/evaluate.js --script "
  const errors = document.querySelectorAll('.error');
  return errors.map(el => el.textContent);
"
```

### click.js

Element interaction for testing UI behavior.

```bash
node dist/scripts/click.js --selector ".button" [--options]
```

**Options:**

- `--selector` (required) - CSS selector for element to click
- `--url` - URL to navigate to first (optional)
- `--wait-for` - CSS selector to wait for after click
- `--wait-timeout` - Wait timeout in milliseconds (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Click button
node dist/scripts/click.js --url https://example.com --selector ".submit-btn"

# Click and wait for result
node dist/scripts/click.js --selector "#submit" --wait-for ".success-message"
```

### fill.js

Form testing and input validation.

```bash
node dist/scripts/fill.js --selector "#input" --value "text" [--options]
```

**Options:**

- `--selector` (required) - CSS selector for input element
- `--value` (required) - Value to fill
- `--url` - URL to navigate to first (optional)
- `--clear true` - Clear field before filling
- `--wait-timeout` - Element wait timeout (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Fill text input
node dist/scripts/fill.js --selector "#email" --value "user@example.com"

# Clear and fill
node dist/scripts/fill.js --selector "#search" --value "query" --clear true
```

### console.js

Console log monitoring and error tracking.

```bash
node dist/scripts/console.js --url https://example.com [--options]
```

**Options:**

- `--url` (required) - URL to monitor
- `--types` - Comma-separated message types: `log,error,warn,info,debug` (default: all)
- `--duration` - Monitoring duration in milliseconds (default: 5000)
- `--timeout` - Page load timeout (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Monitor all console messages for 10 seconds
node dist/scripts/console.js --url https://example.com --duration 10000

# Monitor only errors and warnings
node dist/scripts/console.js --url https://example.com --types error,warn
```

### network.js

Network request debugging and performance analysis.

```bash
node dist/scripts/network.js --url https://example.com [--options]
```

**Options:**

- `--url` (required) - URL to monitor
- `--types` - Comma-separated resource types: `xhr,fetch,stylesheet,script,image` (default: all)
- `--duration` - Monitoring duration in milliseconds (default: 5000)
- `--output` - Save network data to JSON file
- `--timeout` - Page load timeout (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Monitor API calls
node dist/scripts/network.js --url https://example.com --types xhr,fetch

# Save network data
node dist/scripts/network.js --url https://example.com --output network-data.json
```

### performance.js

Performance metrics and Core Web Vitals.

```bash
node dist/scripts/performance.js --url https://example.com [--options]
```

**Options:**

- `--url` (required) - URL to analyze
- `--trace` - Path to save performance trace file
- `--resources true` - Include detailed resource timing
- `--timeout` - Page load timeout (default: 30000)
- `--headless false` - Show browser window
- `--close false` - Keep browser open
- `--browser chromium|firefox|webkit` - Browser engine

**Examples:**

```bash
# Get Core Web Vitals
node dist/scripts/performance.js --url https://example.com

# Record performance trace
node dist/scripts/performance.js --url https://example.com --trace performance-trace.json

# Include resource analysis
node dist/scripts/performance.js --url https://example.com --resources true
```

## Common Options

All scripts support these common options:

| Option              | Description                    | Default           |
| ------------------- | ------------------------------ | ----------------- | -------------- | ---------- |
| `--headless false`  | Show browser window            | `true` (headless) |
| `--close false`     | Keep browser open for chaining | `true` (close)    |
| `--timeout 30000`   | Timeout in milliseconds        | `30000`           |
| `--browser chromium | firefox                        | webkit`           | Browser engine | `chromium` |

## Output Format

All scripts output JSON to stdout:

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

Errors go to stderr:

```json
{
  "success": false,
  "error": "Element not found: .missing-element",
  "stack": "Error: Element not found..."
}
```

## Session Management

Use `--close false` to chain commands:

```bash
# Navigate and keep browser open
node dist/scripts/navigate.js --url https://example.com --close false

# Continue with same page
node dist/scripts/snapshot.js --close false
node dist/scripts/console.js --duration 3000

# End session
node dist/scripts/navigate.js --url about:blank
```

## Error Handling

Common error patterns and solutions:

**Element not found:**

```bash
# Find correct selector
node dist/scripts/snapshot.js --url https://example.com | jq '.elements[] | {selector, text}'
```

**Timeout errors:**

```bash
# Increase timeout
node dist/scripts/navigate.js --url https://slow-site.com --timeout 60000
```

**Browser issues:**

```bash
# Reinstall browsers
npm run install-browsers
```

## Integration Examples

### Bash Scripting

```bash
#!/bin/bash
# Quick health check
URL="https://example.com"

echo "Checking $URL..."
node dist/scripts/navigate.js --url "$URL" --close false
LCP=$(node dist/scripts/performance.js --url "$URL" | jq -r '.vitals.LCP')

if (( $(echo "$LCP < 2500" | bc -l) )); then
  echo "✅ LCP good: ${LCP}ms"
else
  echo "❌ LCP slow: ${LCP}ms"
fi
```

### JavaScript/Node.js

```javascript
import { execSync } from "child_process";

function runCommand(command) {
  return JSON.parse(execSync(command, { encoding: "utf8" }));
}

// Get page info
const page = runCommand(
  "node dist/scripts/navigate.js --url https://example.com --close false",
);
console.log("Page title:", page.title);

// Get performance metrics
const perf = runCommand("node dist/scripts/performance.js");
console.log("LCP:", perf.vitals.LCP);
```

## Troubleshooting

**Installation issues:**

- Run `./scripts/install.sh` for full setup
- Check Node.js version: `node --version` (requires 18+)

**Browser issues:**

- Reinstall: `npm run install-browsers`
- Try different browser: `--browser firefox`

**Script issues:**

- Check script syntax: `npm run build`
- Verify URL accessibility
- Increase timeout for slow pages
