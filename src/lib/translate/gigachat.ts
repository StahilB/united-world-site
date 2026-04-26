import { randomUUID } from "node:crypto";

/**
 * Простой переводчик HTML через GigaChat.
 * Использует те же креды что маскот.
 */

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getGigachatToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const authKey = process.env.GIGACHAT_AUTHORIZATION_KEY;
  const scope = process.env.GIGACHAT_OAUTH_SCOPE || "GIGACHAT_API_PERS";
  if (!authKey) throw new Error("GIGACHAT_AUTHORIZATION_KEY not set");

  const rqUid = randomUUID();
  const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authKey}`,
      RqUID: rqUid,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `scope=${scope}`,
  });
  if (!res.ok) {
    throw new Error(`GigaChat OAuth ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_at?: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: data.expires_at || Date.now() + 28 * 60_000,
  };
  return data.access_token;
}

export async function translateGigaChat(ruHtml: string): Promise<string> {
  const token = await getGigachatToken();
  const model = process.env.MASCOT_GIGACHAT_MODEL || "GigaChat";

  const systemPrompt = `Ты профессиональный переводчик. Переведи русский HTML-контент на английский язык. ВАЖНО:
- Сохрани все HTML-теги как есть (не меняй структуру).
- Переведи только текст внутри тегов.
- Стиль перевода: формальный, для аналитического центра по международным отношениям.
- Не добавляй комментарии. Не оборачивай в \`\`\`. Возвращай только готовый HTML.`;

  const res = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ruHtml },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    throw new Error(`GigaChat chat ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content || "";
  return content.trim();
}
