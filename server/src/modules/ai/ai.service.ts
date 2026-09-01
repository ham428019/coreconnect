import { env } from '../../config/env';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type AIServiceResult =
  | { ok: true; content: string }
  | { ok: false; code: 'not_configured' | 'timeout' | 'provider_error' | 'invalid_response'; message: string; status?: number };

export interface HFOptions {
  provider?: 'openrouter' | 'groq' | 'hf';
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

async function openrouterChat(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<AIServiceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://coreconnect.com',
        'X-Title': 'CoreConnect',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '').then(t => t.slice(0, 500));
      console.error(`[ai/openrouter] OpenRouter request failed (${res.status}) for model ${model}: ${body}`);
      if (res.status === 401 || res.status === 403) {
        return { ok: false, code: 'provider_error', status: res.status, message: 'The AI service credentials are invalid. Please contact CoreConnect support.' };
      }
      if (res.status === 429) {
        return { ok: false, code: 'provider_error', status: res.status, message: 'The AI service is busy right now. Please try again in a moment.' };
      }
      return { ok: false, code: 'provider_error', status: res.status, message: 'The AI service is temporarily unavailable. Please try again.' };
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    const cleaned = text ? String(text).trim() : '';
    if (cleaned) return { ok: true, content: cleaned };
    return { ok: false, code: 'invalid_response', message: 'The AI service returned an empty response. Please try again.' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[ai/openrouter] OpenRouter request timed out for model ${model}.`);
      return { ok: false, code: 'timeout', message: 'The AI service took too long to respond. Please try again.' };
    }
    console.error(`[ai/openrouter] OpenRouter request failed for model ${model}:`, error);
    return { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function groqChat(
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<AIServiceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '').then(t => t.slice(0, 500));
      console.error(`[ai/groq] Groq request failed (${res.status}) for model ${model}: ${body}`);
      if (res.status === 401 || res.status === 403) {
        return { ok: false, code: 'provider_error', status: res.status, message: 'The AI service credentials are invalid. Please contact CoreConnect support.' };
      }
      if (res.status === 429) {
        return { ok: false, code: 'provider_error', status: res.status, message: 'The AI service is busy right now. Please try again in a moment.' };
      }
      return { ok: false, code: 'provider_error', status: res.status, message: 'The AI service is temporarily unavailable. Please try again.' };
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    const cleaned = text ? String(text).trim() : '';
    if (cleaned) return { ok: true, content: cleaned };
    return { ok: false, code: 'invalid_response', message: 'The AI service returned an empty response. Please try again.' };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[ai/groq] Groq request timed out for model ${model}.`);
      return { ok: false, code: 'timeout', message: 'The AI service took too long to respond. Please try again.' };
    }
    console.error(`[ai/groq] Groq request failed for model ${model}:`, error);
    return { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function hfChat(
  models: string[],
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number,
): Promise<AIServiceResult> {
  let lastError: AIServiceResult = { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. Please try again.' };

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
          max_tokens: maxTokens,
          temperature,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '').then(t => t.slice(0, 500));
        console.error(`[ai/hf] HuggingFace request failed (${res.status}) for model ${model}: ${body}`);
        if (res.status === 401 || res.status === 403 || res.status === 402) {
          lastError = { ok: false, code: 'provider_error', status: res.status, message: 'The AI service credentials need attention. Please contact CoreConnect support.' };
          break;
        }
        if (res.status === 429) {
          lastError = { ok: false, code: 'provider_error', status: res.status, message: 'The AI service is busy right now. Please try again.' };
          continue;
        }
        lastError = { ok: false, code: 'provider_error', status: res.status, message: 'The AI service is temporarily unavailable. Please try again.' };
        continue;
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      const cleaned = text ? String(text).trim() : '';
      if (cleaned) return { ok: true, content: cleaned };
      lastError = { ok: false, code: 'invalid_response', message: 'The AI service returned an empty response. Please try again.' };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`[ai/hf] HuggingFace request timed out for model ${model}.`);
        lastError = { ok: false, code: 'timeout', message: 'The AI service took too long to respond. Please try again.' };
      } else {
        console.error(`[ai/hf] HuggingFace request failed for model ${model}:`, error);
        lastError = { ok: false, code: 'provider_error', message: 'The AI service is temporarily unavailable. Please try again.' };
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return lastError;
}

export async function chatWithHF(
  systemPrompt: string,
  userMessage: string,
  options?: HFOptions,
): Promise<AIServiceResult> {
  const maxTokens = options?.maxTokens ?? 500;
  const temperature = options?.temperature ?? 0.7;

  const openrouterConfigured = Boolean(env.OPENROUTER_API_KEY);
  const groqConfigured = Boolean(env.GROQ_API_KEY);
  const hfConfigured = Boolean(env.HF_API_KEY);

  if (!openrouterConfigured && !groqConfigured && !hfConfigured) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'No AI provider is configured. Please contact CoreConnect support.',
    };
  }

  const requestProvider = options?.provider;

  if (requestProvider === 'openrouter' && openrouterConfigured) {
    return openrouterChat(options!.model ?? env.OPENROUTER_SUMMARIZE_MODEL, systemPrompt, userMessage, maxTokens, temperature);
  }
  if (requestProvider === 'groq' && groqConfigured) {
    return groqChat(options!.model ?? 'llama-3.1-8b-instant', systemPrompt, userMessage, maxTokens, temperature);
  }
  if (requestProvider === 'hf' && hfConfigured) {
    const hfModels = [env.HF_MODEL, env.HF_FALLBACK_MODEL].filter(Boolean);
    return hfChat(hfModels, systemPrompt, userMessage, maxTokens, temperature);
  }

  // Priority chain: OpenRouter → Groq → HF
  if (openrouterConfigured) {
    const result = await openrouterChat(options?.model ?? env.OPENROUTER_SUMMARIZE_MODEL, systemPrompt, userMessage, maxTokens, temperature);
    if (result.ok) return result;
    if (groqConfigured) {
      const groqResult = await groqChat('llama-3.1-8b-instant', systemPrompt, userMessage, maxTokens, temperature);
      if (groqResult.ok) return groqResult;
    }
    if (hfConfigured) {
      const hfModels = [env.HF_MODEL, env.HF_FALLBACK_MODEL].filter(Boolean);
      return hfChat(hfModels, systemPrompt, userMessage, maxTokens, temperature);
    }
    return result;
  }

  if (groqConfigured) {
    const result = await groqChat(options?.model ?? 'llama-3.1-8b-instant', systemPrompt, userMessage, maxTokens, temperature);
    if (result.ok) return result;
    if (hfConfigured) {
      const hfModels = [env.HF_MODEL, env.HF_FALLBACK_MODEL].filter(Boolean);
      return hfChat(hfModels, systemPrompt, userMessage, maxTokens, temperature);
    }
    return result;
  }

  const hfModels = [env.HF_MODEL, env.HF_FALLBACK_MODEL].filter(Boolean);
  return hfChat(hfModels, systemPrompt, userMessage, maxTokens, temperature);
}
