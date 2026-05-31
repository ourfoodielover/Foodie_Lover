// POST /api/ai/chat — Foodie AI Ordering Assistant
//
// Receives the customer's message, the current cart, and a snapshot of the menu.
// Returns a natural-language reply PLUS an array of cart actions the frontend
// should execute.
//
// Action types supported:
//   ADD_TO_CART      { itemId, itemName, variantName?, variantPrice, quantity }
//   REMOVE_FROM_CART { itemId, variantName? }
//   UPDATE_QUANTITY  { itemId, variantName?, quantity }
//   SHOW_CART        {}
//   CLEAR_CART       {}
//   OPEN_CHECKOUT    {}
//
// Rules enforced via the system prompt:
//   - Only reference menu items that actually exist
//   - Never invent prices
//   - Ask for variant selection when an item has variants and none was specified
//   - Respect availability (available: false → skip)

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic   = 'force-dynamic';
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
  key:          string;   // `${itemId}__${variantName}`
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
  history?: ChatMessage[];  // prior turns for multi-turn context
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

// ─── System prompt builder ────────────────────────────────────────────────────

function buildSystemPrompt(menu: MenuItem[], cart: CartItem[]): string {
  const restaurantName = process.env.RESTAURANT_NAME ?? 'Foodie Lover';

  // Build compact menu representation
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
Your job is to help customers find food, add items to their cart, and navigate to checkout.

## MENU (id | name | category | pricing)
${menuLines}

## CUSTOMER'S CURRENT CART
${cartLines}
${cart.length > 0 ? `Cart total: ₹${cartTotal}` : ''}

## RULES — follow these exactly
1. ONLY reference menu items that appear in the MENU section above.
2. NEVER invent items, categories, or prices.
3. If an item has VARIANTS (e.g. Half/Full), and the customer didn't specify one, ASK which variant they want before adding.
4. If a customer asks to add an item that has variants and they DID specify a matching variant name, add it immediately.
5. When recommending items, include the item name, variant if relevant, and price.
6. Be warm, concise, and helpful. Respond in the same language the customer uses.
7. Never modify the database — only return actions for the frontend to execute.

## RESPONSE FORMAT
You MUST respond with valid JSON only — no prose before or after. Schema:
{
  "reply": "<natural language reply to show the customer>",
  "actions": [
    // zero or more actions:
    { "type": "ADD_TO_CART",      "itemId": "...", "itemName": "...", "variantName": "...", "variantPrice": 000, "quantity": 1 },
    { "type": "REMOVE_FROM_CART", "itemId": "...", "variantName": "..." },
    { "type": "UPDATE_QUANTITY",  "itemId": "...", "variantName": "...", "quantity": 2 },
    { "type": "SHOW_CART" },
    { "type": "CLEAR_CART" },
    { "type": "OPEN_CHECKOUT" }
  ]
}

Only include actions that match what the customer explicitly requested or agreed to.
If you are asking a clarifying question (e.g. variant selection), return an empty actions array.`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { reply: 'AI assistant is not configured yet. Please ask staff for help.', actions: [] },
      { status: 200 },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message, cart = [], menu = [], history = [] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
  }

  const client = new OpenAI({ apiKey });

  // Build message array: system + history + new user message
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(menu, cart) },
    // Include up to 6 prior turns for context
    ...history.slice(-6).map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message.trim() },
  ];

  try {
    const completion = await client.chat.completions.create({
      model:       'gpt-4o-mini',   // fast & cheap; switch to gpt-4o for higher accuracy
      messages,
      temperature: 0.4,
      max_tokens:  600,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';

    let parsed: AssistantResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If model returns non-JSON despite format enforcement, return gracefully
      console.error('[ai/chat] Failed to parse model JSON:', raw);
      return NextResponse.json({
        reply:   "I'm having trouble processing that. Could you try again?",
        actions: [],
      });
    }

    // Validate and sanitise actions before returning to frontend
    const safeActions: CartAction[] = (parsed.actions ?? []).filter(
      (a): a is CartAction => typeof a.type === 'string',
    );

    return NextResponse.json({
      reply:   parsed.reply ?? '',
      actions: safeActions,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/chat] OpenAI error:', msg);

    // Return graceful degradation — don't break the ordering flow
    return NextResponse.json({
      reply:   "I'm temporarily unavailable. You can still browse the menu and add items directly!",
      actions: [],
    });
  }
}
