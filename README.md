<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AnimationScope — Animation Storyboard & Budget App

An animated storyboard + budgeting tool for scoping 3D animation projects: scenes, hours, assets, revisions, and an investment summary, originally built with Google AI Studio.

## Public Demo Build

This branch is configured as a **public, read-mostly demo** (`DEMO_MODE = true` in `src/App.tsx`) meant to be shared as a link so people can explore the UI:

- Scene titles, descriptions, camera moves, tags, hours, costs, assets, and project details are fully editable.
- The 5 sample scene images are fixed and cannot be replaced (no upload).
- **Spreadsheet export, PDF export, Save Project, the AI "Generate" scoping tool, and the platform/Google Drive link are disabled.**
- Nothing is persisted to `localStorage` — refreshing or closing the tab always resets the app back to the original sample project.

To turn this back into the full, unrestricted app (e.g. to run your own private instance), set `DEMO_MODE = false` near the top of `src/App.tsx` and provide a `GEMINI_API_KEY` (see below) so the AI generator works.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. (Only needed with `DEMO_MODE = false`) Set `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

This is a static Vite + React app with no backend, so it deploys to Vercel with zero configuration:

1. Import the GitHub repo into Vercel.
2. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output directory `dist` (defaults, no need to change).
3. No environment variables are required for the demo build.
4. Deploy — Vercel will give you a shareable `*.vercel.app` link.
