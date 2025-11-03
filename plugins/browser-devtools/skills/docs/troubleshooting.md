# Troubleshooting Guide

Common issues and solutions for the browser-devtools skill.

## Installation Issues

### "Node.js not found" or "Node version too old"

**Symptoms:**
- `node: command not found`
- `Node.js 18+ is required. Current version: 14.x.x`

**Solutions:**
```bash
# Install Node.js 18+ using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Or download from https://nodejs.org
```

### "Permission denied" on scripts

**Symptoms:**
- `./scripts/install.sh: Permission denied`
- Scripts won't execute

**Solutions:**
```bash
chmod +x scripts/install.sh
chmod +x scripts/*.sh
```

### Browser installation failures

**Symptoms:**
- `Error: Executable doesn't exist`
- Playwright browsers not found

**Solutions:**
```bash
# Reinstall browsers
npm run install-browsers

# Or install manually
npx playwright install chromium firefox webkit

# Check system dependencies (Linux)
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libasound2t64
```

## Runtime Issues

### "Element not found" errors

**Symptoms:**
```json
{
  "success": false,
  "error": "Element not found: .missing-element"
}
```

**Solutions:**

1. **Verify element exists:**
```bash
node dist/scripts/snapshot.js --url https://example.com | jq '.elements[] | {selector, text}'
```

2. **Wait for dynamic content:**
```bash
node dist/scripts/click.js --selector ".dynamic-btn" --wait-timeout 10000
```

3. **Check element visibility:**
```bash
node dist/scripts/evaluate.js --script "
  const el = document.querySelector('.target');
  return el ? {
    exists: true,
    visible: el.offsetParent !== null,
    display: window.getComputedStyle(el).display
  } : { exists: false };
"
```

4. **Use alternative selectors:**
```bash
# Try different selector strategies
node dist/scripts/click.js --selector "text=Submit Button"
node dist/scripts/click.js --selector "xpath=//button[contains(text(), 'Submit')]"
```

### Timeout errors

**Symptoms:**
```json
{
  "success": false,
  "error": "Timeout 30000ms exceeded"
}
```

**Solutions:**

1. **Increase timeout:**
```bash
node dist/scripts/navigate.js --url https://slow-site.com --timeout 60000
```

2. **Check network connectivity:**
```bash
curl -I https://example.com
```

3. **Use appropriate wait strategy:**
```bash
node dist/scripts/navigate.js --url https://example.com --wait-until domcontentloaded
```

4. **Verify page is actually loading:**
```bash
node dist/scripts/navigate.js --url https://example.com --headless false
```

### Browser crashes or hangs

**Symptoms:**
- Scripts hang indefinitely
- Browser process exits unexpectedly
- "Browser closed" errors

**Solutions:**

1. **Check system resources:**
```bash
# Check memory usage
free -h
# Check disk space
df -h
```

2. **Use headful mode to see what's happening:**
```bash
node dist/scripts/navigate.js --url https://example.com --headless false
```

3. **Restart browser session:**
```bash
# Force new session
node dist/scripts/navigate.js --url https://example.com --close true
```

4. **Try different browser:**
```bash
node dist/scripts/navigate.js --url https://example.com --browser firefox
```

### Permission issues on file output

**Symptoms:**
```json
{
  "success": false,
  "error": "EACCES: permission denied, open '/path/to/file'"
}
```

**Solutions:**

1. **Create necessary directories:**
```bash
mkdir -p docs/screenshots
mkdir -p docs/traces
mkdir -p docs/reports
chmod 755 docs docs/screenshots docs/traces docs/reports
```

2. **Check write permissions:**
```bash
ls -la docs/
```

3. **Use absolute paths:**
```bash
node dist/scripts/screenshot.js --output /tmp/screenshot.png
```

### Network-related issues

**Symptoms:**
- DNS resolution failures
- SSL certificate errors
- Connection timeouts

**Solutions:**

1. **Check DNS resolution:**
```bash
nslookup example.com
dig example.com
```

2. **Ignore SSL errors for testing:**
```bash
# The skill already ignores HTTPS errors by default
# But you can verify with:
node dist/scripts/navigate.js --url https://expired.badssl.com
```

3. **Check firewall/proxy settings:**
```bash
# Test basic connectivity
curl -v https://example.com

# Check if running behind proxy
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

## Script-Specific Issues

### navigate.js

**Page loads but content is missing:**
```bash
# Try different wait strategies
node dist/scripts/navigate.js --url https://example.com --wait-until load
node dist/scripts/navigate.js --url https://example.com --wait-until domcontentloaded

# Wait longer for dynamic content
node dist/scripts/navigate.js --url https://example.com --timeout 60000
```

**Redirect issues:**
```bash
# Check final URL after redirects
node dist/scripts/navigate.js --url https://bit.ly/example | jq '.url'
```

### screenshot.js

**Blank screenshots:**
```bash
# Wait for content to load
node dist/scripts/screenshot.js --url https://example.com --full-page true

# Check element visibility
node dist/scripts/evaluate.js --url https://example.com --script "
  const el = document.querySelector('body');
  return el ? window.getComputedStyle(el).height : 'no body';
"
```

**Element screenshots fail:**
```bash
# Verify element exists and is visible
node dist/scripts/snapshot.js --url https://example.com | jq '.elements[] | select(.selector == ".target")'

# Try full page instead
node dist/scripts/screenshot.js --url https://example.com --full-page true
```

### click.js

**Click not working:**
```bash
# Check if element is clickable
node dist/scripts/evaluate.js --url https://example.com --script "
  const el = document.querySelector('.target');
  if (!el) return 'Element not found';
  return {
    visible: el.offsetParent !== null,
    enabled: !el.disabled,
    pointerEvents: window.getComputedStyle(el).pointerEvents
  };
"

# Try scrolling to element first
node dist/scripts/evaluate.js --url https://example.com --script "
  document.querySelector('.target')?.scrollIntoView();
"

# Use force click (not recommended, but available)
node dist/scripts/evaluate.js --url https://example.com --script "
  document.querySelector('.target')?.click();
"
```

### fill.js

**Value not being set:**
```bash
# Check element type and properties
node dist/scripts/evaluate.js --url https://example.com --script "
  const el = document.querySelector('#target');
  if (!el) return 'Element not found';
  return {
    tagName: el.tagName,
    type: el.type,
    disabled: el.disabled,
    readOnly: el.readOnly,
    maxLength: el.maxLength
  };
"

# Clear field first
node dist/scripts/fill.js --selector "#target" --value "" --clear true
node dist/scripts/fill.js --selector "#target" --value "new value"
```

### console.js

**Not capturing console messages:**
```bash
# Verify console is being used
node dist/scripts/evaluate.js --url https://example.com --script "
  console.log('Test message');
  console.error('Test error');
  console.warn('Test warning');
  return 'Console test completed';
"

# Monitor for longer duration
node dist/scripts/console.js --url https://example.com --duration 10000
```

### network.js

**Missing network requests:**
```bash
# Check if requests are being made
node dist/scripts/evaluate.js --url https://example.com --script "
  // Trigger some network activity
  fetch('/api/test')
    .then(r => r.text())
    .then(console.log);
  return 'Fetch triggered';
"

# Monitor all request types
node dist/scripts/network.js --url https://example.com --duration 10000

# Check specific resource types
node dist/scripts/network.js --url https://example.com --types xhr,fetch,script,stylesheet
```

### performance.js

**Performance metrics missing:**
```bash
# Try with resources enabled
node dist/scripts/performance.js --url https://example.com --resources true

# Check if performance APIs are available
node dist/scripts/evaluate.js --url https://example.com --script "
  return {
    performance: !!performance,
    memory: !!performance.memory,
    navigation: !!performance.getEntriesByType('navigation').length,
    resources: !!performance.getEntriesByType('resource').length
  };
"

# Try different browser
node dist/scripts/performance.js --url https://example.com --browser firefox
```

## Debugging Techniques

### Enable verbose logging

```bash
# Run with visible browser to see what's happening
node dist/scripts/navigate.js --url https://example.com --headless false

# Add debugging output to scripts
node dist/scripts/evaluate.js --script "
  console.log('Debug: Current URL', window.location.href);
  console.log('Debug: Page title', document.title);
  console.log('Debug: Ready state', document.readyState);
  return 'Debug info logged';
"
```

### Use browser devtools

```bash
# Open browser with devtools
node dist/scripts/navigate.js --url https://example.com --headless false

# Then manually open devtools in the browser window
# (Ctrl+Shift+I or Cmd+Opt+I)
```

### Check browser logs

```bash
# Get browser console logs
node dist/scripts/console.js --url https://example.com --duration 5000 --types error,warn,log

# Get detailed browser console output
node dist/scripts/evaluate.js --script "
  const logs = [];
  const originalLog = console.log;
  console.log = function(...args) {
    logs.push(args.join(' '));
    originalLog.apply(console, args);
  };
  return logs;
"
```

## Platform-Specific Issues

### Linux/WSL

**Missing system libraries:**
```bash
# Install required system packages
sudo apt-get update
sudo apt-get install -y \
  libnss3 libnspr4 libasound2t64 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1

# For WSL, also install X11 forwarding if using headful mode
sudo apt-get install -y x11-apps
export DISPLAY=:0
```

**Display issues with headful mode:**
```bash
# Use headless mode on servers
node dist/scripts/navigate.js --url https://example.com --headless true

# Or set up X11 forwarding
ssh -X user@server
```

### macOS

**Permission issues:**
```bash
# Give Terminal/Shell permission to control computer
# System Preferences > Security & Privacy > Privacy > Accessibility
# Add your Terminal app
```

**Browser installation issues:**
```bash
# Install browsers manually
npx playwright install --with-deps
```

### Windows

**Path issues:**
```bash
# Use PowerShell or Git Bash
# Or use WSL for better compatibility

# Check PATH
echo $PATH
```

**Permission issues:**
```bash
# Run as administrator if needed
# Or adjust folder permissions
icacls "C:/path/to/folder" /grant Users:(OI)(CI)F
```

## Performance Issues

### Scripts running slowly

**Solutions:**
```bash
# Use less verbose output
node dist/scripts/navigate.js --url https://example.com 2>/dev/null

# Reduce timeouts
node dist/scripts/navigate.js --url https://fast-site.com --timeout 10000

# Use specific wait strategies
node dist/scripts/navigate.js --url https://example.com --wait-until domcontentloaded
```

### Memory issues

**Solutions:**
```bash
# Monitor memory usage
node dist/scripts/evaluate.js --script "
  if (performance.memory) {
    console.log('Memory:', {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    });
  }
"

# Close sessions when done
node dist/scripts/navigate.js --url https://example.com --close true
```

## Getting Help

### Check logs

```bash
# Run with verbose output
node dist/scripts/navigate.js --url https://example.com 2>&1 | tee debug.log

# Check npm logs
npm ls
npm audit
```

### Verify installation

```bash
# Check Node.js version
node --version

# Check npm packages
npm list

# Test basic Playwright functionality
npx playwright --version
npx playwright install --dry-run
```

### Report issues

When reporting issues, include:

1. **Operating system and version**
2. **Node.js version** (`node --version`)
3. **Browser versions** (`npx playwright --version`)
4. **Exact command that failed**
5. **Full error output**
6. **Expected vs actual behavior**

```bash
# Gather system info
echo "OS: $(uname -a)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Playwright: $(npx playwright --version)"
```

## Common Pitfalls

1. **Forgetting to close sessions** - Always close sessions when done to free resources
2. **Using incorrect selectors** - Use snapshot.js to find correct selectors
3. **Not waiting for dynamic content** - Increase timeouts or use wait strategies
4. **Ignoring SSL errors** - The skill handles this automatically
5. **Running out of disk space** - Clean up old screenshots and traces regularly
6. **Headless vs headful confusion** - Use `--headless false` to see what's happening
7. **Cross-browser differences** - Test in different browsers if encountering issues
8. **Network timeouts** - Check network connectivity and adjust timeouts
