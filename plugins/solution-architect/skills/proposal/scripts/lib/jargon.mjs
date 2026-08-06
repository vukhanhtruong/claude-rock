// Deny-list for the non-tech jargon scan. Deliberately small: it catches the
// habitual offenders; the fresh-eyes review catches the rest. Terms are
// matched whole-word, case-insensitive; frontmatter jargon_allow overrides
// per term when the client themselves uses it.
export const JARGON = [
  'api', 'backend', 'frontend', 'middleware', 'kubernetes', 'docker',
  'microservice', 'microservices', 'ci/cd', 'oauth', 'sql', 'nosql',
  'webhook', 'endpoint', 'orm', 'latency', 'schema', 'refactor', 'devops',
];
