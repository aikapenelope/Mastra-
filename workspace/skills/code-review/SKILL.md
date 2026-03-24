---
name: code-review
description: Reviews code for quality, security, performance, and best practices. Generates actionable feedback with specific fixes.
version: 1.0.0
tags:
  - development
  - code-quality
  - security
---

# Code Review Skill

## When to Activate
Activate this skill when asked to review code, analyze a PR, audit a codebase, or check code quality.

## Review Process

1. **Read the code** completely before making any comments.
2. **Understand the context**: What does this code do? What problem does it solve?
3. **Check these categories** in order of priority:

### Critical (must fix)
- Security vulnerabilities (SQL injection, XSS, auth bypass, secrets in code)
- Data loss risks (missing error handling, unchecked deletes)
- Race conditions and concurrency bugs

### Important (should fix)
- Performance issues (N+1 queries, unnecessary re-renders, memory leaks)
- Error handling gaps (unhandled promises, missing try/catch)
- Type safety issues (any types, missing null checks)

### Suggestions (nice to have)
- Code readability (naming, structure, comments)
- DRY violations (duplicated logic)
- Missing tests for critical paths

## Output Format

For each issue found:
```
[CRITICAL/IMPORTANT/SUGGESTION] <file>:<line>
Problem: <what's wrong>
Fix: <specific code change>
```

## Rules
- Be specific. Show the exact line and the exact fix.
- Don't nitpick formatting if there's a linter configured.
- Acknowledge what's done well before listing issues.
- If the code is good, say so. Don't invent problems.
- Prioritize: 3 critical fixes > 20 style suggestions.
