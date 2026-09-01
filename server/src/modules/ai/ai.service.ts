import { env } from '../../config/env';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

export type AIServiceResult =
  | { ok: true; content: string }
  | { ok: false; code: 'not_configured' | 'timeout' | 'provider_error' | 'invalid_response'; message: string; status?: number };

export interface HFOptions {
  maxTokens?: number;
  temperature?: number;
}

export async function chatWithHF(
  systemPrompt: string,
  userMessage: string,
  options?: HFOptions,
): Promise<AIServiceResult> {
  if (!env.HF_API_KEY) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'The AI service is not configured. Please contact CoreConnect support.',
    };
  }

  const models = [...new Set([env.HF_MODEL, env.HF_FALLBACK_MODEL].filter(Boolean))];
  let lastError: AIServiceResult = { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. Please try again in a moment.' };

  for (const model of models) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: options?.maxTokens ?? 300,
          temperature: options?.temperature ?? 0.1,
          top_p: 0.9,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const providerMessage = (await res.text()).slice(0, 500);
        console.error(`[ai] Hugging Face request failed (${res.status}) for model ${model}: ${providerMessage}`);
        const message = res.status === 401 || res.status === 403
          ? 'The AI service credentials need attention. Please contact CoreConnect support.'
          : res.status === 402
            ? 'The AI provider has no available credits. A catalog-grounded summary is shown instead.'
            : res.status === 429
              ? 'The AI service is busy right now. A catalog-grounded summary is shown instead.'
              : 'The AI service is temporarily unavailable. A catalog-grounded summary is shown instead.';
        lastError = { ok: false, code: 'provider_error', status: res.status, message };
        if (res.status === 401 || res.status === 403 || res.status === 402) break;
        continue;
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      const cleaned = text ? String(text).trim() : '';
      if (cleaned) return { ok: true, content: cleaned };
      lastError = { ok: false, code: 'invalid_response', message: 'The AI service returned an empty response. A catalog-grounded summary is shown instead.' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[ai] Hugging Face request timed out for model ${model}.`);
        lastError = { ok: false, code: 'timeout', message: 'The AI service took too long to respond. A catalog-grounded summary is shown instead.' };
      } else {
        console.error(`[ai] Hugging Face request failed for model ${model}:`, error);
        lastError = { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. A catalog-grounded summary is shown instead.' };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return lastError;
}
