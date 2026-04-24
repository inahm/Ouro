/**
 * Cloudflare Pages Function — natural language → bounded JSON for the third-act micro-terminal.
 *
 * Requires env OPENAI_API_KEY. Optional: OPENAI_BASE_URL (default https://api.openai.com),
 * OPENAI_MODEL (default gpt-4o-mini).
 *
 * Note: Cursor’s “Composer 2” model is only available in the editor; this endpoint uses
 * the OpenAI API from your Cloudflare project secrets (server-side, key never in the page).
 */
const ALLOWED_ACCENTS = new Set([
  '#FF1B00',
  '#0d8f4a',
  '#1e3a5f',
  '#1e40af',
  '#1d4ed8',
  '#3b82f6',
  '#60a5fa',
  '#0ea5e9',
  '#06b6d4',
  '#f4c025',
  '#fbbf24',
  '#facc15',
  '#fde047',
  '#fde68a',
  '#fef3c7',
  '#fff7ed',
  '#fef9c3',
  '#8b5cf6',
  '#e8ddd4',
  '#000000',
  '#2d6a4f',
  '#e63946',
  '#457b9d',
]);

const ALLOWED_TYPE = new Set(['grotesk', 'sans', 'serif', 'mono']);
const ALLOWED_SOUND = new Set(['default', 'calm', 'pulse', 'bright', 'hiphop']);
const ALLOWED_FLOW = new Set(['default', 'calm', 'chaos']);
const ALLOWED_FX = new Set(['none', 'glitter']);

function safeJson(s) {
  try {
    return JSON.parse(s);
  } catch (_) {
    return null;
  }
}

function clampPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  var accent = typeof raw.accent === 'string' ? raw.accent.trim() : '#FF1B00';
  if (!ALLOWED_ACCENTS.has(accent)) accent = '#FF1B00';
  var typeface = typeof raw.typeface === 'string' ? raw.typeface.toLowerCase() : 'grotesk';
  if (!ALLOWED_TYPE.has(typeface)) typeface = 'grotesk';
  var sound = typeof raw.sound === 'string' ? raw.sound.toLowerCase() : 'default';
  if (!ALLOWED_SOUND.has(sound)) sound = 'default';
  var flow = typeof raw.flow === 'string' ? raw.flow.toLowerCase() : 'default';
  if (!ALLOWED_FLOW.has(flow)) flow = 'default';
  var fx = typeof raw.fx === 'string' ? raw.fx.toLowerCase() : 'none';
  if (!ALLOWED_FX.has(fx)) fx = 'none';
  var summary =
    typeof raw.summary === 'string'
      ? raw.summary.trim().slice(0, 160)
      : 'Applied your mood to this act.';
  return { accent, typeface, sound, flow, fx, summary };
}

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' },
    });
  }
  if (request.method !== 'POST') {
    return j({ ok: false, error: 'method' }, 405);
  }
  var body;
  try {
    body = await request.json();
  } catch (_) {
    return j({ ok: false, error: 'invalid_json' }, 400);
  }
  var prompt = String((body && body.prompt) || '')
    .trim()
    .slice(0, 500);
  if (!prompt) return j({ ok: false, error: 'empty_prompt' }, 400);

  if (!env.OPENAI_API_KEY) {
    return j({ ok: false, error: 'no_openai_key', message: 'Set OPENAI_API_KEY in the Cloudflare project' }, 503);
  }

  var base = (env.OPENAI_BASE_URL || 'https://api.openai.com').replace(/\/$/, '');
  var model = env.OPENAI_MODEL || 'gpt-4o-mini';
  var system = [
    'You are a small prompt engine. Users type natural language to style ONE screen at once.',
    'Always interpret the FULL sentence together. Chain adjectives are normal (color + mood + vibe).',
    'You MUST return JSON with all keys: accent, typeface, sound, flow, fx, summary.',
    'accent: string hex, EXACTLY one of: ' + Array.from(ALLOWED_ACCENTS).join(', ') + '.',
    'typeface: grotesk (default display), sans (open/friendly/soft), serif (elegant/calm/editorial), mono (code/tech).',
    'sound: default, calm, pulse, bright, hiphop — bright for happy, joyful, sunny mood, upbeat, celebratory; calm for slow, soft, sad, night; pulse for energy, fast, club; hiphop for rap/hip-hop/trap/beats.',
    'flow: default, calm, chaos — calm for still/gentle; chaos for wild/storm; default for neutral.',
    'fx: none or glitter for sparkles/shine/glamour.',
    'Examples: "sunny and yellow and happy" → accent #facc15 or #fbbf24, typeface sans, sound bright, flow default, fx none.',
    '"dark blue rainy calm" → #1e40af, serif, calm, flow calm, fx none.',
    'Pick the closest allowlisted hex; never invent a hex outside the list.',
    'summary: one short line describing the vibe you applied (max 120 chars).',
    'Reply with JSON only, no markdown.',
  ].join(' ');

  var res;
  try {
    res = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + env.OPENAI_API_KEY,
      },
      body: JSON.stringify({
        model: model,
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 220,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch (e) {
    return j({ ok: false, error: 'upstream', message: String(e) }, 502);
  }

  if (!res.ok) {
    var t = await res.text();
    return j(
      { ok: false, error: 'openai', status: res.status, message: t.slice(0, 200) },
      502
    );
  }

  var data;
  try {
    data = await res.json();
  } catch (e) {
    return j({ ok: false, error: 'bad_response' }, 502);
  }
  var text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  var parsed = safeJson(text);
  if (!parsed) {
    return j({ ok: false, error: 'unparseable_model' }, 502);
  }
  var out = clampPayload(parsed);
  if (!out) return j({ ok: false, error: 'bad_payload' }, 502);
  return j({ ok: true, ...out });
}

function j(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
