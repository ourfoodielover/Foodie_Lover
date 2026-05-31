// POST /api/ai/chat — Foodie AI Ordering Assistant (Google Gemini Flash)
//
// Request:  { message, cart, menu, history? }
// Response: { reply, actions }
//
// Action types: ADD_TO_CART | REMOVE_FROM_CART | UPDATE_QUANTITY |
//               SHOW_CART | CLEAR_CART | OPEN_CHECKOUT
//
// GEMINI_API_KEY must be set in Vercel env vars (or .env.local for dev).

import { NextRequest, NextResponse } from 'next/server';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

export const dynamic     = 'force-dynamic';
export const maxDuration = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

interface MenuVariant { name: string; price: number }
interface MenuItem {
  id:         string;
  name:       string;
  category?:  string;
  price:      number;
  desc?:      string;
  badge?:     string;
  available?: boolean;
  variants?:  MenuVariant[];
}

interface CartItem {
  key:          string;
  itemId:       string;
  itemName:     string;
  variantName:  string;
  variantPrice: number;
  qty:          number;
}

interface ChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message:  string;
  cart:     CartItem[];
  menu:     MenuItem[];
  history?: ChatMessage[];
}

interface CartAction {
  type:          'ADD_TO_CART' | 'REMOVE_FROM_CART' | 'UPDATE_QUANTITY' | 'SHOW_CART' | 'CLEAR_CART' | 'OPEN_CHECKOUT';
  itemId?:       string;
  itemName?:     string;
  variantName?:  string;
  variantPrice?: number;
  quantity?:     number;
}

interface AssistantResponse {
  reply:   string;
  actions: CartAction[];
}

// ─── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(menu: MenuItem[], cart: CartItem[]): string {
  const restaurantName = process.env.RESTAURANT_NAME ?? 'Foodie Lover';

  const menuLines = menu
    .filter(m => m.available !== false)
    .map(m => {
      const varStr = m.variants && m.variants.length > 0
        ? m.variants.map(v => `${v.name}=₹${v.price}`).join(', ')
        : `₹${m.price}`;
      const badgeStr = m.badge ? ` [${m.badge}]` : '';
      const descStr  = m.desc ? ` — ${m.desc.slice(0, 60)}` : '';
      return `- ${m.id} | ${m.name}${badgeStr} | ${m.category ?? 'General'} | ${varStr}${descStr}`;
    })
    .join('\n');

  const cartLines = cart.length === 0
    ? '(empty)'
    : cart.map(c =>
        `- ${c.itemName}${c.variantName ? ` (${c.variantName})` : ''} ×${c.qty} @ ₹${c.variantPrice}`,
      ).join('\n');

  const cartTotal = cart.reduce((s, c) => s + c.variantPrice * c.qty, 0);

  return `You are the AI ordering assistant for ${restaurantName}, an Indian restaurant.
Help customers find food, add items to their cart, and navigate to checkout.

## MENU (id | name | category | pricing)
${menuLines}

## CUSTOMER'S CURRENT CART
${cartLines}
${cart.length > 0 ? `Cart total: ₹${cartTotal}` : ''}

## STRICT RULES
1. ONLY use items that appear in the MENU above. Never invent items or prices.
2. If an item has VARIANTS and the customer did not specify one, ASK which variant they want — do NOT add to cart yet.
3. If the customer specifies a matching variant name (e.g. "Full", "Half"), add it immediately.
4. For recommendations, include item name, variant (if applicable), and price.
5. Respond in the same language as the customer.
6. Be warm, concise, and helpful.

## RESPONSE FORMAT
You MUST respond with valid JSON only. No prose before or after. Schema:
{
  "reply": "<natural-language reply to show the customer>",
  "actions": [
    { "type": "ADD_TO_CART",      "itemId": "...", "itemName": "...", "variantName": "...", "variantPrice": 0, "quantity": 1 },
    { "type": "REMOVE_FROM_CART", "itemId": "...", "variantName": "..." },
    { "type": "UPDATE_QUANTITY",  "itemId": "...", "variantName": "...", "quantity": 2 },
    { "type": "SHOW_CART" },
    { "type": "CLEAR_CART" },
    { "type": "OPEN_CHECKOUT" }
  ]
}

- Include only actions the customer explicitly requested or agreed to.
- When asking a clarifying question, return "actions": [].
- For ADD_TO_CART, variantName should be "" (empty string) for single-price items.
- CRITICAL: Every single response MUST be valid JSON. Never output plain text. Always wrap in {"reply":...,"actions":[...]}.`;
}

// ─── Robust JSON extractor ───────────────────────────────────────────────────
// Gemini may return:
//   1. Pure JSON                          → parse directly
//   2. ```json\n{...}\n```               → strip fences
//   3. Some text, then ```json\n{...}``` → find first { last }
//   4. {... with trailing text            → find first { last }
//
function extractJSON(raw: string): AssistantResponse {
  // Pass 1: direct parse (fast path for well-behaved responses)
  try { return JSON.parse(raw); } catch { /* fall through */ }

  // Pass 2: strip leading/trailing whitespace + markdown fences anywhere in string
  const stripped = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  try { return JSON.parse(stripped); } catch { /* fall through */ }

  // Pass 3: find the outermost JSON object { ... }
  const firstBrace = raw.indexOf('{');
  const lastBrace  = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const slice = raw.slice(firstBrace, lastBrace + 1);
    try { return JSON.parse(slice); } catch { /* fall through */ }
  }

  // Pass 4: truncated JSON repair — response was cut off before closing braces.
  // Close any open strings, arrays, and objects so JSON.parse has a chance.
  if (firstBrace !== -1) {
    try {
      const repaired = repairTruncatedJSON(raw.slice(firstBrace));
      return JSON.parse(repaired);
    } catch { /* fall through */ }
  }

  // All attempts failed — throw with the raw text for diagnostics
  throw new Error(`Cannot parse JSON from: ${raw.slice(0, 200)}`);
}

// Closes open strings/arrays/objects in a truncated JSON string
function repairTruncatedJSON(s: string): string {
  const stack: string[] = [];
  let inString = false;
  let escaped  = false;

  for (const ch of s) {
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  let repaired = s.trimEnd();
  // Close open string first if we're inside one
  if (inString) repaired += '"';
  // Close any open arrays/objects in reverse order
  while (stack.length > 0) repaired += stack.pop();
  return repaired;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── API key check ─────────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('[Foodie AI] GEMINI_API_KEY exists:', !!apiKey);
  console.log('[Foodie AI] Key prefix:', apiKey ? apiKey.slice(0, 8) + '...' : 'NOT SET');
  console.log('[Foodie AI] NODE_ENV:', process.env.NODE_ENV);

  if (!apiKey) {
    console.warn('[Foodie AI] GEMINI_API_KEY is not set');
    return NextResponse.json(
      { reply: 'AI assistant is not configured yet. Please set GEMINI_API_KEY in your environment variables.', actions: [] },
      { status: 200 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: RequestBody;
  try {
    body = await req.json();
  } catch (parseErr) {
    console.error('[Foodie AI] Failed to parse request body:', parseErr);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { message, cart = [], menu = [], history = [] } = body;

  console.log('[Foodie AI] User message:', message);
  console.log('[Foodie AI] Menu count:', menu.length);
  console.log('[Foodie AI] Cart count:', cart.length);
  console.log('[Foodie AI] History turns:', history.length);

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
  }

  // ── Build Gemini client ───────────────────────────────────────────────────
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: buildSystemPrompt(menu, cart),
    generationConfig: {
      temperature:     0.4,
      maxOutputTokens: 2048,  // 800 was too low for multi-item recommendations
      responseMimeType: 'application/json',   // forces JSON-only output
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });

  // ── Build chat history for multi-turn ─────────────────────────────────────
  //
  // Frontend sends: history = [...priorTurns, currentUserMsg]
  // The current user message is ALSO sent separately as `message`.
  // Gemini's startChat({ history }) requires COMPLETED turns only —
  // the new user message must NOT be in history (it's sent via sendMessage).
  //
  // Required Gemini history shape:
  //   [ user, model, user, model, ... ]  ← ends with 'model', starts with 'user'
  //
  // Steps:
  //   1. Pop the last entry — it IS the current user message (duplicate of `message`)
  //   2. Trim any leading 'model' entries (history must start with 'user')
  //   3. Ensure even count so we always have complete user/model pairs
  //   4. Take last 6 entries (3 pairs) to stay within context limits
  //   5. Re-wrap assistant text as JSON so Gemini stays in JSON mode

  let priorTurns = history.slice(); // copy

  // Step 1: remove last entry (= current user message, sent separately via sendMessage)
  if (priorTurns.length > 0 && priorTurns[priorTurns.length - 1].role === 'user') {
    priorTurns = priorTurns.slice(0, -1);
  }

  // Step 2: trim any leading 'model' entries (Gemini requires first role = 'user')
  while (priorTurns.length > 0 && priorTurns[0].role === 'assistant') {
    priorTurns = priorTurns.slice(1);
  }

  // Step 3: ensure even count — drop unpaired tail entry if needed
  if (priorTurns.length % 2 !== 0) {
    priorTurns = priorTurns.slice(0, -1);
  }

  // Step 4: keep last 6 entries (= 3 complete user/model pairs)
  priorTurns = priorTurns.slice(-6);

  // Step 5: map to Gemini format, re-wrapping assistant replies as JSON
  const geminiHistory = priorTurns.map(m => {
    if (m.role === 'assistant') {
      // Re-wrap as JSON so Gemini sees consistent JSON in prior turns
      return { role: 'model' as const, parts: [{ text: JSON.stringify({ reply: m.content, actions: [] }) }] };
    }
    return { role: 'user' as const, parts: [{ text: m.content }] };
  });

  console.log('[Foodie AI] Gemini model: gemini-2.5-flash');
  console.log('[Foodie AI] Prior turns (before current msg):', priorTurns.length);
  console.log('[Foodie AI] geminiHistory payload:\n' + JSON.stringify(
    geminiHistory.map(m => ({ role: m.role, text: m.parts[0].text.slice(0, 80) })),
    null, 2,
  ));

  // ── Call Gemini ───────────────────────────────────────────────────────────
  try {
    const chat = model.startChat({ history: geminiHistory });
    const result = await chat.sendMessage(message.trim());
    const raw = result.response.text();

    console.log('[Foodie AI] ✅ Gemini responded');
    console.log('[Foodie AI] Raw response:', raw.slice(0, 400));

    // Parse JSON response
    let parsed: AssistantResponse;
    try {
      parsed = extractJSON(raw);
    } catch (jsonErr) {
      // Surface the raw response so the root cause is visible in the chat UI
      console.error('[Foodie AI] JSON parse failed:', jsonErr);
      console.error('[Foodie AI] Full raw response:', raw);
      return NextResponse.json({
        reply:   `⚠️ Gemini returned non-JSON. Raw: ${raw.slice(0, 300)}`,
        actions: [],
      });
    }

    const safeActions: CartAction[] = (parsed.actions ?? []).filter(
      (a): a is CartAction => typeof a.type === 'string',
    );

    console.log('[Foodie AI] Actions:', JSON.stringify(safeActions));

    return NextResponse.json({
      reply:   parsed.reply ?? '',
      actions: safeActions,
    });

  } catch (err: unknown) {
    // ── Full diagnostic error — visible in chat UI + Vercel logs ─────────────
    console.error('========== FOODIE AI GEMINI ERROR ==========');
    console.error(err);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;

    if (anyErr?.status)   console.error('[Foodie AI] HTTP status:', anyErr.status);
    if (anyErr?.message)  console.error('[Foodie AI] Message:', anyErr.message);
    if (anyErr?.errorDetails) console.error('[Foodie AI] Error details:', JSON.stringify(anyErr.errorDetails));
    if (anyErr?.code)     console.error('[Foodie AI] Code:', anyErr.code);

    const errorMsg   = anyErr?.message ?? String(err);
    const statusCode = typeof anyErr?.status === 'number' ? anyErr.status : 500;

    return NextResponse.json({
      reply:   `⚠️ AI Error [${statusCode}]: ${errorMsg}`,
      actions: [],
    }, { status: 200 });
  }
}
