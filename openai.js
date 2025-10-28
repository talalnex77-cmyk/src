import fetch from 'node-fetch';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

if (!process.env.OPENAI_API_KEY) {
  console.warn('Warning: OPENAI_API_KEY not set. OpenAI calls will fail until you set it.');
}

export async function generateReply({ system='', messages=[] , max_tokens=1000 }) {
  const body = {
    model: MODEL,
    input: messages
  };
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body),
    timeout: 120000
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  // The Responses API may return an array of output items; join text outputs.
  const outputs = [];
  try {
    if (Array.isArray(data.output)) {
      for (const o of data.output) {
        if (typeof o.content === 'string') outputs.push(o.content);
        else if (Array.isArray(o.content)) {
          for (const c of o.content) {
            if (c.type === 'output_text' && c.text) outputs.push(c.text);
            else if (c.type === 'message' && c.text) outputs.push(c.text);
          }
        }
      }
    } else if (data.output_text) {
      outputs.push(data.output_text);
    } else if (data.output?.[0]?.content) {
      outputs.push(String(data.output[0].content));
    }
  } catch (e) {
    // fallback
  }
  return outputs.join('\n').trim();
}
