# Security Policy

## Supported versions

Only the latest 0.x release of each `@webmcp-schemas/*` package receives security fixes.

## Reporting a vulnerability

Please report vulnerabilities privately using GitHub private vulnerability reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue for security problems.

This is a solo-maintained project. I will acknowledge a report within a few days and respond on a best-effort basis; there is no formal SLA.

## Scope

- `@webmcp-schemas/schemas` is data (JSON Schema files and types), with no runtime logic.
- `@webmcp-schemas/runtime` validates tool input from agents against the canonical schemas before calling your handler.
- `@webmcp-schemas/lint` may launch a browser (Playwright/Chromium) and load the URL you give it in `live` mode. Only point it at pages you trust.

Vulnerabilities in WebMCP itself or in `@mcp-b/webmcp-polyfill` should be reported to those projects.
