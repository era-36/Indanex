# Selaqui Industrial Intelligence

Industrial Operations Intelligence, AI Analytics, and Decision Support platform tailored for manufacturing enterprises in **Selaqui, Dehradun, Uttarakhand, India**.

## Supported Industry Segments
1. **Pharmaceuticals & Healthcare** — API/excipient procurement, QC laboratory testing, material quarantine/release workflows, GMP documentation.
2. **Chemicals & Specialty Chemicals** — Chemical inventory optimization, shortage forecasting, batch planning, MSDS/EHS safety controls.
3. **Food Processing & Nutraceuticals** — Incoming botanical/ingredient acceptance, batch inspection, rejection & rework analysis.
4. **Electrical, Electronics & Consumer Manufacturing** — Component procurement, AQL inspection, supplier delay tracking, assembly interruption mitigation.
5. **Engineering, Machinery & Industrial Equipment** — Production scheduling, machine capacity & downtime analytics, rework, delivery forecasting.

## Architecture & Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend & Server-Side AI**: Node.js Express (`server.ts`) + Vercel Serverless API (`/api/ai/analyze.ts`) using `@google/genai` (`gemini-4-hydrogen`)
- **Database & Auth**: Firebase Authentication (Google Sign-In) & Cloud Firestore with Zero-Trust `firestore.rules`
- **Multi-Tenant Isolation**: All operational collections are tenant-scoped under `/companies/{companyId}/...` and enforced server-side in `firestore.rules`.

## Local Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (see `.env.example`):
   - `GEMINI_API_KEY` (server-side only; never exposed to browser bundles)
   - `APP_URL`
3. Start development server on port `3000`:
   ```bash
   npm run dev
   ```
4. Run unit tests & security rule audits:
   ```bash
   npx --yes tsx --test src/utils/analyticsEngine.test.ts
   npx eslint firestore.rules
   npm run lint
   npm run build
   ```

## Security Model
- Zero-trust Firestore rules (`firestore.rules`) enforce:
  - Verified email identity (`request.auth.token.email_verified == true`) for all writes
  - Strict tenant isolation via `/companies/{companyId}/members/{uid}`
  - 4-role RBAC (`super_admin`, `company_admin`, `department_manager`, `operator`)
  - Operator submissions cannot self-approve QC batch releases or override closed/completed records
  - Append-only immutable `audit_logs`
- Gemini API calls execute strictly on the server (`/api/ai/analyze`), with Firebase ID token verification and sliding-window rate limiting.
- AI insights are clearly separated from formal human QC release, schedule approval, and regulatory compliance sign-off.
