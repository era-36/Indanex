import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

interface VercelRequest extends IncomingMessage {
  body?: Record<string, unknown>;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
    return;
  }

  const body = req.body || {};
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' }, timeout: 25000 },
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze industrial operational metrics:\n${JSON.stringify(body)}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            rootCauseHypotheses: { type: Type.ARRAY, items: { type: Type.STRING } },
            contributingFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            dataLimitationsAndUncertainty: { type: Type.STRING },
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
    });
    res.status(200).json(JSON.parse((response.text || '{}').trim()));
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : 'Upstream Gemini error',
    });
  }
}
