# BugBrief AI Privacy Policy

Last updated: May 22, 2026

BugBrief AI helps users create developer-ready bug reports from the browser page they choose to capture. This policy explains what information the extension collects, how it is used, and how users can control it.

## Information We Collect

When a user clicks **Capture Bug** and generates a report, BugBrief AI may collect:

- A screenshot of the visible portion of the active browser tab.
- The active page URL.
- The active page title.
- The capture timestamp.
- Browser details when available.
- The user's written notes about what they were trying to do, what happened instead, and any extra context they provide.
- Generated bug report content.

BugBrief AI does not collect this information in the background. Capture starts only after the user presses **Capture Bug**.

## How We Use Information

We use the captured screenshot, page details, and user notes only to generate a structured bug report for the user.

The Chrome extension sends report-generation requests to the configured BugBrief backend. The backend may send the request content to an AI provider to produce the bug report. AI provider API keys are stored only on the backend and are never included in the Chrome extension.

## Local Storage

Generated reports are saved locally in the user's browser with `chrome.storage.local` so the user can view recent report history. This local history remains on the user's device unless the user removes the extension, clears extension data, or the product adds a deletion control in a future release.

## Backend And AI Provider Processing

The backend processes submitted screenshot and report context to generate a bug report. Do not submit passwords, payment card numbers, authentication tokens, private health information, or other sensitive secrets in screenshots or notes.

We do not sell user data. We do not use captured page content, screenshots, browsing activity, or report notes for advertising, retargeting, or unrelated monetization.

## Data Sharing

BugBrief AI shares submitted report-generation data only as needed to provide or improve the report-generation feature, including:

- Processing by the BugBrief backend.
- Processing by an AI provider configured by the BugBrief backend.
- Security, abuse prevention, legal compliance, or business transfer cases where required.

## Human Access

Humans are not intended to read user-submitted report content during normal product operation. Limited access may occur only with user consent for support, for security or abuse investigation, to comply with applicable law, or using aggregated/anonymized information for internal operations.

## Security

Production deployments should use HTTPS for all communication between the Chrome extension, backend, and AI provider. Backend secrets, including AI provider API keys, must remain server-side.

## User Controls

Users control when capture occurs by pressing **Capture Bug**. Users can remove locally stored history by removing the extension or clearing extension data in Chrome. Users may also avoid submitting sensitive pages or redact page content before capture.

## Contact

For privacy questions or deletion requests related to backend-processed data, contact:

Use the support contact listed on the BugBrief AI Chrome Web Store listing.
