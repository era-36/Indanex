# GitHub & Vercel Deployment Guide

## 1. GitHub Repository Setup
Create a repository named `selaqui-industrial-intelligence` with default branch `main`:

```bash
git init -b main
git add .
git commit -m "Initial commit: Selaqui Industrial Intelligence platform"
git remote add origin https://github.com/<your-org>/selaqui-industrial-intelligence.git
git push -u origin main
```

Verify `.gitignore` excludes `node_modules/`, `.env`, `dist/`, and any private service account credentials before pushing.

## 2. Firebase Configuration & Security Rules
1. Ensure `firebase-applet-config.json` references your provisioned Firebase project and Firestore database ID.
2. Deploy security rules and composite indexes:
   ```bash
   npx eslint firestore.rules
   firebase deploy --only firestore:rules,firestore:indexes
   ```
3. Review `security_spec.md` and `firebase-blueprint.json` before promoting to production.

## 3. Vercel Deployment
1. Import the `selaqui-industrial-intelligence` GitHub repository in Vercel.
2. Framework preset: **Vite** (`vercel.json` is pre-configured).
3. Build command: `npm run build` | Output directory: `dist`.
4. Add Environment Variables in Vercel Project Settings:
   - `GEMINI_API_KEY`: Your Google Gemini API key (server-side only).
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID.
5. Deploy from `main`. All `/api/*` routes map to serverless functions and client routes fall back to `/index.html`.
