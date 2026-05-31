// POST /api/ai/chat — Foodie AI Ordering Assistant
//
// Returns { reply, actions } — frontend executes actions against cart state.
// OPENAI_API_KEY must be set in Vercel env vars (or .env.local for dev).
//
// Action types: ADD_TO_CART | REMOVE_FROM_CART | UPDATE_QUANTITY |
//               SHOW_CART | CLEAR_CART | OPEN_CHECKOUT

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic    = 'force-dynamic';
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
    : cart.map(c => `- ${c.itemName}${c.variantName ? ` (${c.variantName})` : ''} ×${c.qty} @ ₹${c.variantPrice}`).join('\n');

  const cartTotal = cart.reduce((s, c) => s + c.variantPrice * c.qty, 0);

  return `You are the AI ordering assistant for ${restaurantName}, an Indian restaurant.
Help customers find food, add items to cart, and navigate to checkout.

## MENU (id | name | category | pricing)
${menuLines}

## CUSTOMER'S CURRENT CART
${cartLines}
${cart.length > 0 ? `Cart total: ₹${cartTotal}` : ''}

## RULES
1. ONLY use items from the MENU above. Never invent items or prices.
2. If an item has VARIANTS and the customer didn't specify one, ASK before adding.
3. If the customer specifies a variant (e.g. "Full"), add it immediately.
4. For recommendations include name, variant, price.
5. Respond in the same language as the customer.
6. Be warm and concise.

## RESPONSE FORMAT — valid JSON only, no prose outside JSON
{
  "reply": "<reply to show the customer>",
  "actions": [
    { "type": "ADD_TO_CART",      "itemId": "...", "itemName": "...", "variantName": "...", "variantPrice": 000, "quantity": 1 },
    { "type": "REMOVE_FROM_CART", "itemId": "...", "variantName": "..." },
    { "type": "UPDATE_QUANTITY",  "itemId": "...", "variantName": "...", "quantity": 2 },
    { "type": "SHOW_CART" },
    { "type": "CLEAR_CART" },
    { "type": "OPEN_CHECKOUT" }
  ]
}

Return empty actions array when asking a clarifying question.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── Step 1: API key check ─────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;

  console.log('[Foodie AI] OPENAI_API_KEY exists:', !!apiKey);
  console.log('[Foodie AI] Key prefix:', apiKey ? apiKey.slice(0, 7) + '...' : 'NOT SET');
  console.log('[Foodie AI] NODE_ENV:', process.env.NODE_ENV);

  if (!apiKey) {
    console.warn('[Foodie AI] OPENAI_API_KEY is not set — returning unconfigured message');
    return NextResponse.json(
      { reply: 'AI assistant is not configured yet. Please set OPENAI_API_KEY in your environment variables.', actions: [] },
      { status: 200 },
    );
  }

  // ── Step 2: Parse body ────────────────────────────────────────────────────
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

  // ── Step 3: Build OpenAI client + messages ────────────────────────────────
  const client = new OpenAI({ apiKey });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(menu, cart) },
    ...history.slice(-6).map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message.trim() },
  ];

  const requestPayload = {
    model:           'gpt-4o-mini',
    messages,
    temperature:     0.4,
    max_tokens:      600,
    response_format: { type: 'json_object' as const },
  };

  console.log('[Foodie AI] Calling OpenAI model:', requestPayload.model);
  console.log('[Foodie AI] Total messages in context:', messages.length);
  console.log('[Foodie AI] System prompt length (chars):', messages[0].content?.toString().length ?? 0);

  // ── Step 4: Call OpenAI ───────────────────────────────────────────────────
  try {
    const completion = await client.chat.completions.create(requestPayload);

    console.log('[Foodie AI] ✅ OpenAI responded. Usage:', JSON.stringify(completion.usage));
    console.log('[Foodie AI] Finish reason:', completion.choices[0]?.finish_reason);

    const raw = completion.choices[0]?.message?.content ?? '{}';
    console.log('[Foodie AI] Raw response:', raw.slice(0, 300));

    let parsed: AssistantResponse;
    try {
      parsed = JSON.parse(raw);
    } catch (jsonErr) {
      console.error('[Foodie AI] JSON parse failed:', jsonErr, '| Raw:', raw);
      return NextResponse.json({
        reply:   "I got a response but couldn't read it. Please try again!",
        actions: [],
      });
    }

    const safeActions: CartAction[] = (parsed.actions ?? []).filter(
      (a): a is CartAction => typeof a.type === 'string',
    );

    console.log('[Foodie AI] Actions to execute:', JSON.stringify(safeActions));

    return NextResponse.json({
      reply:   parsed.reply ?? '',
      actions: safeActions,
    });

  } catch (err: unknown) {
    // ── FULL diagnostic catch — expose exact error details ──────────────────
    console.error('========== FOODIE AI ERROR ==========');
    console.error(err);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;

    if (anyErr?.status)   console.error('[Foodie AI] HTTP status:', anyErr.status);
    if (anyErr?.message)  console.error('[Foodie AI] Message:', anyErr.message);
    if (anyErr?.error)    console.error('[Foodie AI] Error object:', JSON.stringify(anyErr.error));
    if (anyErr?.response) console.error('[Foodie AI] Response:', anyErr.response);
    if (anyErr?.code)     console.error('[Foodie AI] Code:', anyErr.code);
    if (anyErr?.type)     console.error('[Foodie AI] Type:', anyErr.type);

    const errorMsg = anyErr?.message ?? String(err);
    const statusCode: number = typeof anyErr?.status === 'number' ? anyErr.status : 500;

    // Expose debug error in reply so it's visible without Vercel log access
    return NextResponse.json({
      reply:   `⚠️ AI Error [${statusCode}]: ${errorMsg}`,
      actions: [],
    }, { status: 200 }); // 200 so frontend shows the message, not a silent failure
  }
}
