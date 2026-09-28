import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', hasKey: Boolean(apiKey) });
});

// Calculate Shannon entropy in bits from candidate probabilities: H = - sum(p * log2(p))
function calculateEntropy(probs: number[]): number {
  let entropy = 0;
  for (const p of probs) {
    if (p > 1e-9) {
      entropy -= p * Math.log2(p);
    }
  }
  return Math.max(0, entropy);
}

// Clean model error message to human readable text
function formatErrorMessage(err: any): string {
  if (!err) return 'Unknown error occurred.';
  if (typeof err === 'string') return err;
  if (err.message) {
    try {
      const parsed = JSON.parse(err.message);
      if (parsed?.error?.message) {
        return parsed.error.message.split('\n')[0] || parsed.error.message;
      }
    } catch {
      // not JSON string
    }
    return err.message;
  }
  return String(err);
}

// Resilient multi-tier model pool with high quotas:
// Priority order:
// 1. If gemini-2.5-flash is within quota, use native responseLogprobs
// 2. Otherwise immediately fallback to active high-quota models with fresh daily limits:
//    gemini-3.5-flash-lite, gemini-3.6-flash, gemini-3.7-flash, gemini-3.1-flash-lite, gemini-flash-lite-latest
const HIGH_QUOTA_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
];

app.post('/api/analyze-tokens', async (req: Request, res: Response) => {
  try {
    const { prompt, maxTokens = 10, temperature = 1.0, topK = 40 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    if (!apiKey) {
      res.status(400).json({ error: 'Gemini API key is not configured.' });
      return;
    }

    const start = Date.now();
    const tokenLimit = Math.min(Math.max(Number(maxTokens) || 10, 1), 64);
    const parsedTemp = Math.max(0.0, Math.min(2.0, typeof temperature === 'number' ? temperature : Number(temperature) || 1.0));
    const parsedTopK = Math.max(1, Math.min(100, typeof topK === 'number' ? topK : Number(topK) || 40));

    // ATTEMPT 1: Try native responseLogprobs on gemini-2.5-flash
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseLogprobs: true,
          logprobs: 5,
          maxOutputTokens: tokenLimit,
          temperature: parsedTemp,
          topK: parsedTopK,
        },
      });

      const candidate = response.candidates?.[0];
      const logprobsResult = candidate?.logprobsResult;
      const fullResponseText = response.text || '';

      if (logprobsResult && logprobsResult.topCandidates && logprobsResult.topCandidates.length > 0) {
        const topCandidatesSteps = logprobsResult.topCandidates;
        const chosenCandidates = logprobsResult.chosenCandidates || [];

        const steps = topCandidatesSteps.map((step, idx) => {
          const chosen = chosenCandidates[idx];
          const selectedToken = chosen?.token ?? step.candidates?.[0]?.token ?? '';
          const selectedLogProb =
            typeof chosen?.logProbability === 'number'
              ? chosen.logProbability
              : typeof step.candidates?.[0]?.logProbability === 'number'
              ? step.candidates[0].logProbability
              : 0;
          const selectedProbability = Math.exp(selectedLogProb);

          const topCandidates = (step.candidates || []).map((c) => {
            const logProb = typeof c.logProbability === 'number' ? c.logProbability : -99;
            const p = Math.exp(logProb);
            return {
              token: c.token ?? '',
              tokenId: c.tokenId,
              logProbability: logProb,
              probability: Math.min(1.0, Math.max(0.0, p)),
            };
          });

          const candProbs = topCandidates.map((c) => c.probability);
          const entropy = calculateEntropy(candProbs);

          return {
            stepIndex: idx + 1,
            selectedToken,
            selectedLogProb,
            selectedProbability: Math.min(1.0, Math.max(0.0, selectedProbability)),
            entropy,
            topCandidates,
          };
        });

        res.json({
          prompt,
          fullResponseText,
          modelUsed: 'gemini-2.5-flash',
          durationMs: Date.now() - start,
          steps,
          isRealLogprobApi: true,
        });
        return;
      }
    } catch (flashErr: any) {
      console.warn(
        'gemini-2.5-flash native logprob unavailable, switching to high-quota pool...',
        flashErr?.status || flashErr?.message
      );
    }

    // ATTEMPT 2: Fallback across high-quota models with fresh capacity
    let lastError: any = null;

    for (const model of HIGH_QUOTA_MODELS) {
      try {
        const hqResponse = await ai.models.generateContent({
          model,
          contents: `Text: "${prompt}"\nTask: Output JSON with:
1. "fullResponseText": continuation text for next ${tokenLimit} tokens.
2. "steps": array of ${tokenLimit} objects each containing:
   - "stepIndex" (integer starting at 1)
   - "selectedToken" (the exact token string)
   - "selectedProbability" (float between 0.001 and 0.999)
   - "topCandidates": array of 3-5 alternative tokens with "token" and "probability" (floats summing approx to 1).`,
          config: {
            responseMimeType: 'application/json',
            temperature: parsedTemp,
            topK: parsedTopK,
          },
        });

        const rawText = hqResponse.text || '{}';
        const parsed = JSON.parse(rawText);
        const stepsArray = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.steps) ? parsed.steps : null);

        if (stepsArray && stepsArray.length > 0) {
          const steps = stepsArray.map((s: any, idx: number) => {
            const topCandidates = (s.topCandidates || []).map((cand: any) => {
              const p = Math.max(0.00001, Math.min(1.0, Number(cand.probability) || 0.1));
              return {
                token: String(cand.token ?? ''),
                logProbability: Math.log(p),
                probability: p,
              };
            });

            const selP = Math.max(0.00001, Math.min(1.0, Number(s.selectedProbability) || 0.5));
            const candProbs = topCandidates.map((c: any) => c.probability);
            const entropy = typeof s.entropy === 'number' ? s.entropy : calculateEntropy(candProbs);

            return {
              stepIndex: idx + 1,
              selectedToken: String(s.selectedToken ?? ''),
              selectedLogProb: Math.log(selP),
              selectedProbability: selP,
              entropy,
              topCandidates,
            };
          });

          res.json({
            prompt,
            fullResponseText: parsed.fullResponseText || steps.map((s: any) => s.selectedToken).join(''),
            modelUsed: model,
            durationMs: Date.now() - start,
            steps,
            isRealLogprobApi: false,
          });
          return;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed (${err?.status || err?.message}), trying next...`);
      }
    }

    throw lastError || new Error('All model attempts failed');
  } catch (error: any) {
    const errorMsg = formatErrorMessage(error);
    console.error('Error in /api/analyze-tokens:', errorMsg);
    res.status(500).json({
      error: errorMsg,
      status: error?.status || 500,
    });
  }
});

async function startServer() {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
