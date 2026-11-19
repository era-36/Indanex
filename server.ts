import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);

// Load Firebase projectId safely for verifyIdToken (needs no IAM)
let firebaseProjectId = process.env.FIREBASE_PROJECT_ID || '';
try {
  const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(cfgPath)) {
    const rawCfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8')) as { projectId?: string };
    if (rawCfg.projectId && rawCfg.projectId !== 'remixed-project-id') {
      firebaseProjectId = rawCfg.projectId;
    }
  }
} catch {
  // Ignore missing config at startup; handled at verification time
}

function getAdminAuth() {
  if (!firebaseProjectId) return null;
  const adminApp = getApps().length
    ? getApp()
    : initializeApp({ projectId: firebaseProjectId });
  return getAuth(adminApp);
}

// In-memory sliding-window rate limiter (30 requests per minute per IP)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const maxRequests = 30;
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

const VALID_DOMAINS = new Set([
  'qc_failure',
  'inventory_shortage',
  'batch_rejection',
  'supplier_delivery',
  'component_defect',
  'production_delay',
  'machine_utilization',
  'delivery_forecast',
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'selaqui-industrial-intelligence',
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/enquiries', (req, res) => {
    const body = req.body as Record<string, unknown>;
    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : '';
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const segment = typeof body.segment === 'string' ? body.segment.trim() : '';

    if (contactName.length < 2 || companyName.length < 2 || !email.includes('@')) {
      res.status(400).json({ error: 'Valid contactName, companyName, and email are required.' });
      return;
    }
    if (!['pharma', 'chemicals', 'food', 'electronics', 'engineering'].includes(segment)) {
      res.status(400).json({ error: 'Invalid industrial segment selected.' });
      return;
    }

    res.status(201).json({
      accepted: true,
      message: 'Enquiry validated and logged for Selaqui onboarding team.',
      receivedAt: new Date().toISOString(),
    });
  });

  app.post('/api/ai/analyze', async (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Rate limit exceeded. Please wait up to 60 seconds before requesting another analysis.',
      });
      return;
    }

    // Verify Firebase ID token if provided (required for non-sandbox authenticated calls)
    const authHeader = req.headers.authorization;
    const body = req.body as {
      domain?: string;
      sandboxMode?: boolean;
      companyName?: string;
      segment?: string;
      baseline?: {
        hasSufficientData?: boolean;
        sampleSize?: number;
        minimumRequiredRecords?: number;
        dataPeriod?: string;
        headlineSummary?: string;
        supportingMetrics?: { label: string; value: string }[];
        contributingFactors?: string[];
      };
      contextRecords?: unknown[];
    };

    if (!body.sandboxMode) {
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication token required for tenant operational analysis.' });
        return;
      }
      const token = authHeader.slice('Bearer '.length).trim();
      const adminAuth = getAdminAuth();
      if (!adminAuth) {
        res.status(500).json({ error: 'Server token verifier is not configured.' });
        return;
      }
      try {
        await adminAuth.verifyIdToken(token);
      } catch {
        res.status(401).json({ error: 'Invalid or expired Firebase ID token.' });
        return;
      }
    }

    const domain = typeof body.domain === 'string' ? body.domain : '';
    if (!VALID_DOMAINS.has(domain)) {
      res.status(400).json({ error: 'Invalid prediction analysis domain.' });
      return;
    }

    const sampleSize = Number(body.baseline?.sampleSize ?? 0);
    const minRequired = Number(body.baseline?.minimumRequiredRecords ?? 3);
    if (!body.baseline?.hasSufficientData || sampleSize < minRequired) {
      res.json({
        domain,
        status: 'insufficient_data',
        headline: `Insufficient historical records (${sampleSize}/${minRequired} minimum) for ${domain.replace('_', ' ')} analysis.`,
        rootCauseHypotheses: [],
        contributingFactors: body.baseline?.contributingFactors ?? [],
        recommendedActions: [
          `Log at least ${minRequired} operational records in this module before requesting AI operational analysis.`,
        ],
        dataLimitationsAndUncertainty:
          'Predictive risk modeling and root-cause correlation require sufficient historical company records. No accuracy percentage or synthetic history has been generated.',
        humanApprovalNotice:
          'All QC releases, production schedules, and compliance sign-offs remain strictly under authorized human personnel.',
        dataPeriod: body.baseline?.dataPeriod || 'Insufficient records',
        sampleSize,
        generatedAt: new Date().toISOString(),
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in server secrets. Configure it in Settings > Secrets to run AI operational analysis.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
        timeout: 25000,
      },
    });

    const promptPayload = {
      companyName: body.companyName || 'Industrial Plant',
      industrySegment: body.segment || 'manufacturing',
      analysisDomain: domain,
      dataPeriod: body.baseline?.dataPeriod || 'Current operational dataset',
      sampleSize,
      statisticalBaseline: body.baseline?.headlineSummary || '',
      supportingMetrics: body.baseline?.supportingMetrics || [],
      observedFactors: body.baseline?.contributingFactors || [],
      recentRecordsSample: Array.isArray(body.contextRecords)
        ? body.contextRecords.slice(0, 15)
        : [],
    };

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Gemini operational analysis timed out after 25 seconds.')), 25000);
      });

      const response = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: `Analyze this industrial company's actual operational metrics and records for domain "${domain}":\n${JSON.stringify(promptPayload, null, 2)}`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              'You are an Industrial Operations Intelligence Analyst serving manufacturing companies in Selaqui, Dehradun, India. ' +
              'Strictly ground every insight in the provided JSON numbers and records. ' +
              'Never invent accuracy percentages, confidence percentages, fake supplier ratings, or historical figures not present in the input. ' +
              'Explicitly note statistical uncertainty and small-sample caveats. ' +
              'Never claim AI output constitutes formal QC approval, automatic schedule alteration, or statutory regulatory compliance.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: {
                  type: Type.STRING,
                  description: 'Concise 1-sentence operational finding grounded strictly in the provided metrics.',
                },
                rootCauseHypotheses: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 concrete root-cause hypotheses tied directly to the observed records.',
                },
                contributingFactors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 key contributing operational factors from the data.',
                },
                recommendedActions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: '2 to 4 actionable operational steps for managers/engineers to review.',
                },
                dataLimitationsAndUncertainty: {
                  type: Type.STRING,
                  description: 'Clear statement of sample size limits, missing variables, and why this is not a validated ML accuracy score.',
                },
              },
              required: [
                'headline',
                'rootCauseHypotheses',
                'contributingFactors',
                'recommendedActions',
                'dataLimitationsAndUncertainty',
              ],
            },
          },
        }),
        timeoutPromise,
      ]);

      const parsed = JSON.parse((response.text || '{}').trim()) as {
        headline?: string;
        rootCauseHypotheses?: string[];
        contributingFactors?: string[];
        recommendedActions?: string[];
        dataLimitationsAndUncertainty?: string;
      };

      res.json({
        domain,
        status: 'analyzed',
        headline: parsed.headline || body.baseline?.headlineSummary || 'Operational analysis complete.',
        rootCauseHypotheses: parsed.rootCauseHypotheses || [],
        contributingFactors: parsed.contributingFactors || body.baseline?.contributingFactors || [],
        recommendedActions: parsed.recommendedActions || [],
        dataLimitationsAndUncertainty:
          parsed.dataLimitationsAndUncertainty ||
          'Gemini operational reasoning is grounded on observed records and does not represent a validated statistical ML accuracy claim.',
        humanApprovalNotice:
          'Human-in-the-Loop Mandate: AI insights support decision-making only. Formal QC releases, schedule revisions, and compliance approvals require authorized personnel.',
        dataPeriod: body.baseline?.dataPeriod || 'Current period',
        sampleSize,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Gemini API error:', msg);
      res.status(502).json({
        error: `Gemini operational analysis failed: ${msg}`,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Selaqui Industrial Intelligence server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
