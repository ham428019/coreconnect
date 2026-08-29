import { env } from '../../config/env';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

export type AIServiceResult =
  | { ok: true; content: string }
  | { ok: false; code: 'not_configured' | 'timeout' | 'provider_error' | 'invalid_response'; message: string; status?: number };

export async function chatWithHF(systemPrompt: string, userMessage: string): Promise<AIServiceResult> {
  if (!env.HF_API_KEY) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'The AI service is not configured. Please contact CoreConnect support.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.HF_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.1,
        top_p: 0.9,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const providerMessage = (await res.text()).slice(0, 500);
      console.error(`[ai] Hugging Face request failed (${res.status}) for model ${env.HF_MODEL}: ${providerMessage}`);
      return {
        ok: false,
        code: 'provider_error',
        status: res.status,
        message: res.status === 401 || res.status === 403
          ? 'The AI service credentials need attention. Please contact CoreConnect support.'
          : 'The AI service is temporarily unavailable. Please try again in a moment.',
      };
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return { ok: false, code: 'invalid_response', message: 'The AI service returned an empty response. Please try again.' };
    }

    const cleaned = String(text).replace(/^\s+|\s+$/g, '');
    return cleaned
      ? { ok: true, content: cleaned }
      : { ok: false, code: 'invalid_response', message: 'The AI service returned an empty response. Please try again.' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[ai] Hugging Face request timed out for model ${env.HF_MODEL}.`);
      return { ok: false, code: 'timeout', message: 'The AI service took too long to respond. Please try again.' };
    }
    console.error('[ai] Hugging Face request failed:', error);
    return { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. Please try again in a moment.' };
  } finally {
    clearTimeout(timeout);
  }
}
