# Browser Devtools

Use natural language prompts to debug and automate web browsers with Playwright.

## How to Use

### Basic Navigation

- "Navigate to https://example.com and tell me the page title"
- "Open my local app at http://localhost:3000"
- "Check if my website is accessible"
- "Show me what https://github.com/vukhanhtruong/claude-rock looks like"

### Screenshots

- "Take a screenshot of the entire page at https://example.com"
- "Capture just the header section of my local app"
- "Screenshot the login form and save it as login-page.png"
- "Take a full page screenshot of my dashboard"

### Finding Elements

- "Show me all the buttons on this page"
- "What interactive elements are on https://example.com?"
- "Find all input fields and forms on the page"
- "List all links and their text content"
- "Show me the CSS selectors for all buttons"

### Console Debugging

- "Check for JavaScript errors on my page"
- "Monitor the console for warnings and errors for 10 seconds"
- "Show me all console messages while I interact with the site"
- "Are there any 404 errors or missing resources?"
- "Watch the console for network failures"

### Network Monitoring

- "Show me all API calls being made by this page"
- "Monitor network requests for the next 5 seconds"
- "Are there any failed requests or slow loading resources?"
- "Track all XHR and fetch requests"
- "Show me the largest resources loading on the page"

### Performance Analysis

- "Check the Core Web Vitals for my site"
- "What's the LCP (Largest Contentful Paint) for this page?"
- "Is my site performing well? Give me the performance metrics"
- "Run a performance audit and show me the results"
- "Compare performance between my staging and production sites"

### Form Testing

- "Fill out the login form with test credentials"
- "Enter 'test@example.com' in the email field and 'password123' in the password field"
- "Submit the contact form and see what happens"
- "Test the search functionality by entering 'query' and clicking search"
- "Fill out all required fields in the registration form"

### Element Interaction

- "Click the submit button"
- "Click on the menu toggle"
- "Click the 'Add to Cart' button and wait for the result"
- "Interact with the dropdown menu"
- "Click on the first link in the navigation"

### JavaScript Execution

- "Run `document.title` to get the page title"
- "Execute `document.querySelectorAll('.error').length` to count errors"
- "Check if there are any console errors with JavaScript"
- "Run `localStorage.clear()` to clear storage"
- "Execute `window.scrollTo(0, document.body.scrollHeight)` to scroll to bottom"

### Debugging Workflows

- "I'm getting a JavaScript error on my site. Can you find it?"
- "My form isn't submitting properly. Can you test it?"
- "The page loads slowly. Can you analyze the performance?"
- "Some API calls are failing. Monitor the network for me"
- "I need to test my responsive design. Take screenshots at different sizes"

### Development Testing

- "Test my local development server at localhost:3000"
- "Check if my staging environment is working"
- "Monitor my app for errors while I use it"
- "Take before and after screenshots of my changes"
- "Verify that my new feature is working correctly"

## Example Conversations

### Debugging Console Errors

```
User: "My React app is showing errors at http://localhost:3000. Can you check the console?"
Claude: [Analyzes console output] "I found 3 JavaScript errors related to missing props..."
```

### Form Testing

```
User: "Test my login form here https://www.saucedemo.com/, use standard_user and secret_sauce"
Claude: "I'll navigate to your login page. What's the URL and what credentials should I use?"
User: ""
Claude: [Navigates, fills form, submits] "The form submitted successfully and redirected to dashboard"
```

### Performance Issues

```
User: "run performance test this URL https://myapp.com"
Claude: [Analyzes performance] "Your LCP is 4.2 seconds which is slow. The main bottleneck is..."
```

## Tips for Best Results

- **Be specific about URLs** - Provide the full URL including http:// or https://
- **Describe what you're testing** - Explain what you expect to happen
- **Mention local vs production** - Specify if you're testing localhost or a live site
- **Provide credentials when needed** - For form testing, give test usernames/passwords
- **Describe the problem** - Explain what issue you're trying to diagnose
- **Ask for specific metrics** - Request particular performance data or error types

## Common Scenarios

### "My site is broken" workflow:

1. "Check if https://mysite.com loads"
2. "Look for JavaScript errors in the console"
3. "Monitor network requests for failures"
4. "Take a screenshot to see what's visible"

### "Test my new feature" workflow:

1. "Navigate to http://localhost:3000/new-feature"
2. "Click the [button/element] to activate it"
3. "Watch the console for any errors"
4. "Verify the expected result appears"

### "Performance investigation" workflow:

1. "Analyze performance metrics for https://mysite.com"
2. "Show me the largest resources loading"
3. "Check Core Web Vitals"
4. "Identify the main bottlenecks"

Just describe what you want to do in plain language, and I'll handle the browser automation for you!

