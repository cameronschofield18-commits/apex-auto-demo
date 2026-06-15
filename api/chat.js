import Anthropic from '@anthropic-ai/sdk';
import { readFile } from 'fs/promises';
import path from 'path';

const MODEL = 'claude-opus-4-8';
const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;
const HISTORY_SENT = 12;

let inventoryCache = null;
async function getInventory() {
  if (!inventoryCache) {
    const file = path.join(process.cwd(), 'public', 'data', 'inventory.json');
    inventoryCache = JSON.parse(await readFile(file, 'utf8')).vehicles;
  }
  return inventoryCache;
}

const CAPTURE_LEAD = {
  name: 'capture_lead',
  description: 'Record a sales lead. Call this as soon as the visitor has provided their name AND at least one contact method (phone or email). Do not call before you have both.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      contact: { type: 'string', description: 'Phone number or email exactly as given' },
      vehicle_id: { type: 'string', description: 'Inventory id of the vehicle discussed, if any' },
      timeline: { type: 'string', description: "Buying timeline if mentioned, e.g. 'this week'" },
      note: { type: 'string', description: 'One-line summary of what they want' }
    },
    required: ['name', 'contact']
  }
};

const FOLLOWUPS_FORMAT = {
  type: 'json_schema',
  schema: {
    type: 'object',
    properties: {
      sms: { type: 'string', description: 'Instant SMS, under 320 chars, personalized to name + vehicle + timeline' },
      email_subject: { type: 'string' },
      email_body: { type: 'string', description: 'Instant email, 3-5 sentences, signs off as the Apex sales team' },
      drip: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'integer', enum: [1, 3, 7] },
            channel: { type: 'string', enum: ['sms', 'email'] },
            subject: { type: 'string', description: 'Email subject; empty string for sms' },
            text: { type: 'string' }
          },
          required: ['day', 'channel', 'subject', 'text'],
          additionalProperties: false
        }
      }
    },
    required: ['sms', 'email_subject', 'email_body', 'drip'],
    additionalProperties: false
  }
};

async function draftFollowups(client, vehicles, lead) {
  const v = lead.vehicle_id && vehicles.find(x => x.id === lead.vehicle_id);
  const car = v ? `${v.year} ${v.make} ${v.model} ${v.trim} at $${v.price.toLocaleString('en-US')}` : 'the vehicle they asked about';
  const prompt = `Write a follow-up sequence for a new Apex Auto Group sales lead.
Lead name: ${lead.name}
Vehicle: ${car}
Timeline: ${lead.timeline || 'not specified'}
Their note: ${lead.note || 'general interest'}

Produce: an instant SMS (short, warm, references the car by name, asks to book a time), an instant email (subject + 3-5 sentence body, signs off "The Apex Auto Group Team"), and a drip of EXACTLY three messages: day 1 sms, day 3 email, day 7 sms. Each drip message escalates gently and stays friendly, never pushy. No emojis. Never invent facts beyond the vehicle and price given. For sms items the subject is an empty string.`;
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    output_config: { format: FOLLOWUPS_FORMAT },
    messages: [{ role: 'user', content: prompt }]
  });
  const text = resp.content.filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}

function systemPrompt(vehicles, vehicleContext) {
  const focus = vehicleContext && vehicles.find(v => v.id === vehicleContext);
  return `You are the online sales assistant for Apex Auto Group, a premium and exotic pre-owned dealership. You are sharp, friendly, and human. No emojis. Keep replies to 2-4 short sentences.

Rules:
- Answer ONLY from the inventory data below. Never invent vehicles, prices, specs, or availability. If asked about a car we do not have, say so and suggest the closest match from inventory.
- All 10 vehicles in the inventory are currently available.
- Prices are firm and transparent: the listed price is the price.
- When a visitor shows buying interest (asks about availability, test drives, financing, trade-ins, or a specific car), naturally work toward getting their name and a phone number or email so a salesperson can follow up. Never be pushy; one ask at a time.
- Once you have BOTH a name AND a contact method, call the capture_lead tool, then confirm warmly that someone will reach out within a minute.
- If asked about anything unrelated to the dealership or its cars, politely steer back.
${focus ? `\nThe visitor is currently viewing this vehicle: ${focus.year} ${focus.make} ${focus.model} ${focus.trim} (id: ${focus.id}).` : ''}

<inventory>
${JSON.stringify(vehicles)}
</inventory>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });

  const { messages, vehicleContext } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES)
    return res.status(400).json({ error: 'bad_request' });
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') ||
        typeof m.content !== 'string' || m.content.length === 0 || m.content.length > MAX_CHARS)
      return res.status(400).json({ error: 'bad_request' });
  }

  try {
    const vehicles = await getInventory();
    const client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const history = messages.slice(-HISTORY_SENT);

    const params = {
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt(vehicles, vehicleContext),
      tools: [CAPTURE_LEAD],
      cache_control: { type: 'ephemeral' },
      messages: history
    };
    const first = await client.messages.create(params);

    const toolUse = first.content.find(b => b.type === 'tool_use' && b.name === 'capture_lead');
    if (!toolUse) {
      const reply = first.content.filter(b => b.type === 'text').map(b => b.text).join('');
      return res.status(200).json({ reply });
    }

    // one tool round: confirm the capture, get Claude's confirmation text
    const second = await client.messages.create({
      ...params,
      messages: [
        ...history,
        { role: 'assistant', content: first.content },
        { role: 'user', content: [{
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: 'Lead recorded. Confirm to the visitor that someone will reach out within a minute.'
        }] }
      ]
    });
    const reply = second.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let followups = null;
    try {
      followups = await draftFollowups(client, vehicles, toolUse.input);
    } catch (e) {
      console.error('followup draft failed:', e?.message ?? e); // capture still succeeds
    }
    return res.status(200).json({ reply, lead: toolUse.input, followups });
  } catch (err) {
    console.error('chat handler error:', err?.status ?? '', err?.message ?? err);
    return res.status(502).json({ error: 'unavailable' });
  }
}
