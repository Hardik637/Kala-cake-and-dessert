---
name: bug-fixer
description: Sub-agent skill for automated error triage, reproducible testing, schema integrity, and zero-downtime hotfixes.
---

# Bug Fixer Sub-Agent Skill

Use this skill when diagnosing broken buttons, 401/400/500 API errors, database locks, or UI glitches.

## 4-Step Diagnostic Procedure
1. **Reproduce & Log**:
   - Inspect server output for recent HTTP requests, methods, and status codes.
   - Run a short Node.js HTTP request script replicating the exact user action.
2. **Isolate Layer**:
   - If HTTP 401: Token missing, invalid, or expired. Check `adminAuth.js` or `auth.js`.
   - If HTTP 400: Payload validation failed. Check required fields, types, and defaults in controllers.
   - If HTTP 500: Database constraint or syntax error. Inspect SQLite error message in logs.
3. **Apply Targeted Fix**:
   - Never perform destructive changes to the database.
   - Use safe transactions and fallback defaults.
4. **Compile & Verify**:
   - Run `npm.cmd --prefix client run build` to verify React/Vite builds.
   - Execute integration tests against the running server.
