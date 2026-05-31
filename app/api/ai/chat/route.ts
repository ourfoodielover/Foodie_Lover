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
- For ADD_TO_CART, variantName should be "" (empty string) for single-price items.`;
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
      maxOutputTokens: 800,
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
  // Gemini uses 'user' and 'model' roles (not 'assistant')
  // Map our AIChatMessage history → Gemini Content[]
  const geminiHistory = history.slice(-6).map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  console.log('[Foodie AI] Gemini model: gemini-2.5-flash');
  console.log('[Foodie AI] History turns sent to Gemini:', geminiHistory.length);

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
      // Strip markdown code fences if present (some models still add them)
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (jsonErr) {
      console.error('[Foodie AI] JSON parse failed:', jsonErr, '| Raw:', raw);
      return NextResponse.json({
        reply:   "I got a response but couldn't read it properly. Please try again!",
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
