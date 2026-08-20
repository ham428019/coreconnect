import { env } from '../../config/env';

const HF_API_URL = 'https://router.huggingface.co/v1/chat/completions';

export async function chatWithHF(systemPrompt: string, userMessage: string): Promise<string | null> {
  if (!env.HF_API_KEY) return null;

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
        temperature: 0.7,
        top_p: 0.95,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    const cleaned = String(text).replace(/^\s+|\s+$/g, '');
    return cleaned || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}