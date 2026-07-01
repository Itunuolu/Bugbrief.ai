# BugBrief AI

BugBrief AI is a focused MVP for turning a visible browser bug into a developer-ready report. The Chrome extension captures the active tab screenshot, URL, title, timestamp, and browser details, then sends that context plus user notes to a backend. The backend either calls an AI provider with an environment variable key or returns a realistic mock report when no key is configured. Users can download the final report as a PDF that includes the captured screenshot.

## Project Structure

```text
bugbrief-ai/
  extension/
    manifest.json
    package.json
    .env.example
    vite.config.ts
    tsconfig.json
    public/
      icons/
    src/
      main.tsx
      App.tsx
      sidepanel/
      popup/
      background/
      components/
      lib/
      styles/
  server/
    package.json
    tsconfig.json
    src/
      index.ts
      routes/
      lib/
    .env.example
  PRIVACY.md
  README.md
```

## Requirements

- Node.js 20 or newer
- npm
- Chrome 114 or newer for the Side Panel API

## Install Dependencies

```bash
cd bugbrief-ai
npm install
```

## Run The Backend

```bash
cd bugbrief-ai/server
cp .env.example .env
npm run dev
```

The server defaults to `http://localhost:8787`.

Health check:

```bash
curl http://localhost:8787/health
```

## Environment Variables

The extension never stores or sends an AI provider key directly from the browser. Configure keys only on the backend:

```bash
PORT=8787
AI_PROVIDER_API_KEY=your_key_here
AI_PROVIDER_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
AI_PROVIDER_MODEL=gemini-2.5-flash
```

If `AI_PROVIDER_API_KEY` is empty, the backend runs in mock mode and still returns a structured report.

The extension backend URL is configured at build time:

```bash
VITE_BUGBRIEF_API_URL=https://bugbrief-ai.netlify.app
```

Development builds default to `http://localhost:8787`. Production builds should set `VITE_BUGBRIEF_API_URL` to the deployed HTTPS backend before submitting to the Chrome Web Store. This project is configured to use `https://bugbrief-ai.netlify.app`.

## Chrome Permissions

The extension declares `activeTab` and `<all_urls>` host permission so the side panel can capture the currently visible tab even after Chrome's temporary action-click grant expires. BugBrief only captures when you press Capture Bug.

The extension also includes a visible disclosure near Capture Bug explaining that the screenshot, page URL, page title, timestamp, browser details, and user notes are sent to the configured backend to generate the report.

## Production Icons

Chrome extension icons are included in `extension/public/icons` and referenced from `manifest.json`:

- `icon-16.png`
- `icon-32.png`
- `icon-48.png`
- `icon-128.png`

Vite copies these into `extension/dist/icons` during build.

## Privacy Policy

A draft privacy policy is included at `PRIVACY.md`. Before Chrome Web Store submission, publish it on an HTTPS page you control, such as:

```text
https://bugbrief-ai.netlify.app/privacy/
```

Then add that hosted URL in the Chrome Web Store Developer Dashboard privacy fields. Update the contact email and any backend retention details before publishing. The contact email can be any email address you control; it does not have to use a custom domain.

## Deploy Backend And Privacy Page To Netlify

This repo includes a Netlify deployment workspace in `netlify-app`.

Netlify will host:

- `GET /health`
- `POST /api/generate-bug-report`
- `/privacy/`

Install dependencies:

```bash
npm install
```

Log in to Netlify:

```bash
npx netlify login
```

Create or link a Netlify site for this workspace:

```bash
npx netlify init --filter @bugbrief-ai/netlify
```

Deploy to production:

```bash
npm run deploy:netlify:prod
```

If you want real AI output instead of mock mode, set `AI_PROVIDER_API_KEY` in the Netlify dashboard under Site configuration > Environment variables. For Google AI Studio, the value is the key itself, not the AI Studio URL. You can also set it with the CLI after the site is linked:

```bash
npx netlify env:set AI_PROVIDER_API_KEY your_key_here --filter @bugbrief-ai/netlify
```

This project is intended to deploy to:

```text
https://bugbrief-ai.netlify.app
```

Use that URL as the extension backend:

```powershell
$env:VITE_BUGBRIEF_API_URL="https://bugbrief-ai.netlify.app"
npm.cmd --workspace extension run build
```

The Chrome Web Store privacy policy URL will be:

```text
https://bugbrief-ai.netlify.app/privacy/
```

The backend health check will be:

```text
https://bugbrief-ai.netlify.app/health
```

## Run The Extension In Development

```bash
cd bugbrief-ai/extension
npm run dev
```

Vite serves the React UI for local UI iteration. Chrome extension APIs such as screenshot capture only work after loading the built extension in Chrome.

## Build The Extension

```bash
cd bugbrief-ai/extension
npm run build
```

The unpacked extension output is created at:

```text
bugbrief-ai/extension/dist
```

For a production Chrome Web Store build with an explicit backend URL:

```bash
cd bugbrief-ai
VITE_BUGBRIEF_API_URL=https://bugbrief-ai.netlify.app npm --workspace extension run build
```

PowerShell:

```powershell
cd "C:\Users\Admin\Documents\BugBrief Ai\bugbrief-ai"
$env:VITE_BUGBRIEF_API_URL="https://bugbrief-ai.netlify.app"
npm.cmd --workspace extension run build
```

Package the built extension for upload:

```powershell
Compress-Archive -Path extension\dist\* -DestinationPath bugbrief-ai-chrome-store.zip -Force
```

## Load The Extension In Chrome

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Click Load unpacked.
4. Select `bugbrief-ai/extension/dist`.
5. Open any normal webpage.
6. Click the BugBrief AI extension icon.
7. Click Open BugBrief if the popup appears.
8. In the side panel, click Capture Bug.

## Test The Full Workflow

1. Start the backend with `npm run dev` from `bugbrief-ai/server`.
2. Build and load the extension from `bugbrief-ai/extension/dist`.
3. Open a webpage where you want to capture a bug.
4. Open BugBrief AI from the extension icon.
5. Click Capture Bug.
6. Fill in:
   - What were you trying to do?
   - What happened instead?
   - Extra notes, if useful
7. Click Generate Bug Report.
8. Confirm the generated report appears.
9. Click Download PDF and confirm the PDF includes the captured screenshot.
10. Confirm the report appears in Local history.

## Backend API

### `GET /health`

Returns basic server status and whether mock mode is active.

### `POST /api/generate-bug-report`

Request body:

```json
{
  "url": "https://example.com",
  "pageTitle": "Example",
  "timestamp": "2026-05-22T12:00:00.000Z",
  "browser": "Chrome 125.0.0.0",
  "screenshotBase64": "iVBORw0KGgo...",
  "userGoal": "Submit the checkout form",
  "actualProblem": "The button spins forever",
  "extraNotes": "Happened twice on staging"
}
```

Response body:

```json
{
  "title": "Checkout form: button spins forever",
  "summary": "Developer-ready summary",
  "environment": {
    "url": "https://example.com",
    "pageTitle": "Example",
    "browser": "Chrome 125.0.0.0",
    "timestamp": "2026-05-22T12:00:00.000Z"
  },
  "stepsToReproduce": ["Likely steps — needs confirmation.", "..."],
  "expectedResult": "The checkout form submits successfully.",
  "actualResult": "The button spins forever.",
  "severity": "High",
  "evidence": "Screenshot captured from the affected page.",
  "suggestedLabels": ["bug", "needs-triage"],
  "notesAssumptions": ["Steps are inferred from user notes."],
  "markdown": "# Checkout form..."
}
```

## Future TODOs

- Add a settings view for backend URL configuration.
- Add Jira, Linear, and GitHub issue export integrations.
- Add team templates for severity, labels, and report sections.
- Add optional redaction tools before screenshots are sent.
- Add full-page screenshot support.
- Add video or interaction recording.
- Add authentication and team workspaces when the product scope requires it.
