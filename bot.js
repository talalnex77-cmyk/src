import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { generateReply } from './lib/openai.js';
import { isOwner } from './lib/security.js';

const {
  BOT_TOKEN,
  OWNER_ID,
} = process.env;

if (!BOT_TOKEN) throw new Error('BOT_TOKEN missing');
if (!OWNER_ID) console.warn('OWNER_ID not set — owner-only checks will be skipped');

export const bot = new Telegraf(BOT_TOKEN);

// owner-only middleware
bot.use(async (ctx, next) => {
  // allow chats only from owner in private chats; if OWNER_ID missing allow all
  if (OWNER_ID && ctx.chat?.type === 'private' && !isOwner(ctx, OWNER_ID)) {
    return ctx.reply('هذا البوت خاص، ما عندك صلاحية الوصول.');
  }
  return next();
});

bot.start((ctx) => {
  ctx.reply('مرحبًا — البوت الآن شغال. ارسل أي رسالة لأحاول أرد عليها باستخدام نموذج GPT.');
});

bot.on('text', async (ctx) => {
  try {
    await ctx.sendChatAction('typing');
    const userText = ctx.message.text;
    // Build messages array for Responses API: keep user language by passing prompt as-is.
    const messages = [
      { role: 'system', content: 'You are a helpful assistant that replies in the same language as the user.' },
      { role: 'user', content: userText }
    ];
    const reply = await generateReply({ messages });
    if (!reply) return ctx.reply('ما قدرت أجيب رد. جرب مره ثانية.');
    await ctx.reply(reply);
  } catch (err) {
    console.error('Error in text handler', err);
    await ctx.reply('صار خطأ داخلي أثناء الاتصال بالنموذج: ' + String(err.message).slice(0,200));
  }
});

export async function notifyOwnerCapture({ text, photoUrl }) {
  if (!process.env.OWNER_ID) return;
  const chatId = process.env.OWNER_ID;
  try {
    if (text) await bot.telegram.sendMessage(chatId, text);
    if (photoUrl) await bot.telegram.sendPhoto(chatId, photoUrl);
  } catch (e) {
    console.error('notifyOwnerCapture failed', e);
  }
}

export async function launchBot() {
  await bot.launch();
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
