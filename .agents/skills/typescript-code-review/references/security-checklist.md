# Security Checklist for TypeScript

Types are erased at runtime; they do not protect against hostile input.

1. **Validate at every trust boundary.** Request bodies, query strings, env vars, files, and third-party API responses need schema validation that rejects unknown properties. A cast is not validation.
2. **Prevent prototype pollution.** Avoid recursive merges of untrusted objects. Use `Map` or `Object.create(null)` for user-keyed lookups; reject `__proto__`, `constructor`, `prototype` keys. Consider `node --disable-proto=delete`.
3. **No secrets in source or logs.** Flag hardcoded keys/tokens. Redact auth headers when logging requests. Load secrets from env and fail fast if missing.
4. **Avoid injection sinks.** No `eval`/`new Function`, unsanitized `innerHTML`/`dangerouslySetInnerHTML`, string-built SQL or shell commands. Use parameterized queries and `execFile` with argument arrays.
5. **Keep dependencies audited.** Run `npm audit`, pin via lockfile, review new packages and install scripts.

Sources:
- https://www.nodejs-security.com/blog/input-validation-best-practices-for-nodejs
- https://www.nodejs-security.com/blog/understanding-and-preventing-prototype-pollution-in-nodejs
- https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution
