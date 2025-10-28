import Jimp from 'jimp';
import fetch from 'node-fetch';
import { THEMES } from './themes.js';

const SIZES = {
  instagram: { post: [1080,1080], story: [1080,1920], cover: [1080,1920] },
  tiktok:    { cover: [1080,1920] },
  youtube:   { thumbnail: [1280,720] },
};

const FONT_TITLE = Jimp.FONT_SANS_64_WHITE;
const FONT_SUB   = Jimp.FONT_SANS_32_WHITE;

async function generateAIBackground({ prompt, width, height }) {
  const provider = (process.env.IMAGE_API_PROVIDER || '').toLowerCase();
  const key = process.env.IMAGE_API_KEY;
  if (!provider || !key) return null;

  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'content-type':'application/json', 'authorization':`Bearer ${key}` },
        body: JSON.stringify({ prompt, size: `${width}x${height}` })
      });
      const data = await res.json();
      const b64 = data?.data?.[0]?.b64_json;
      if (!b64) return null;
      const buf = Buffer.from(b64, 'base64');
      return await Jimp.read(buf);
    }
    return null;
  } catch {
    return null;
  }
}

export async function makeDesign({ platform, type, title, subtitle, themeName='noir' }) {
  const sizes = SIZES[platform]?.[type];
  if (!sizes) throw new Error('Bad platform/type');
  const [W,H] = sizes;

  const theme = THEMES[themeName] || THEMES.noir;

  let bg = await generateAIBackground({
    prompt: `Background for ${platform} ${type}, modern gradient, soft texture, high contrast area for text`,
    width: W, height: H
  });

  if (!bg) {
    // Create gradient or solid background based on theme
    if (theme.bgGradient) {
      bg = new Jimp(W, H);
      const hex = (c) => Jimp.cssColorToHex(c);
      const c1 = hex(theme.bgGradient[0]);
      const c2 = hex(theme.bgGradient[1]);
      for (let y=0; y<H; y++) {
        const ratio = y/H;
        const mixed = Jimp.interpolateColor(c1, c2, ratio);
        for (let x=0; x<W; x++) bg.setPixelColor(mixed, x, y);
      }
    } else {
      bg = new Jimp(W, H, theme.bg || '#111318');
    }
  } else {
    bg.cover(W, H);
  }

  if (theme.overlay) {
    // parse rgba
    const parts = theme.overlay.replace(/[rgba() ]/g,'').split(',').map(Number);
    const [r,g,b,a=0.2] = parts;
    const overlay = new Jimp(W, H, Jimp.rgbaToInt(r,g,b, Math.round(a*255)));
    bg.composite(overlay, 0, 0);
  }

  const img = bg;

  const fontTitle = await Jimp.loadFont(FONT_TITLE);
  const fontSub   = await Jimp.loadFont(FONT_SUB);

  const margin = Math.round(W * 0.08);
  const maxWidth = W - margin*2;

  const titleText = (title||'').trim();
  const subText   = (subtitle||'').trim();

  if (titleText) {
    img.print(
      fontTitle,
      margin, margin,
      { text: titleText, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
      maxWidth, H
    );
  }

  if (subText) {
    img.print(
      fontSub,
      margin, margin + Math.round(H*0.18),
      { text: subText, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT, alignmentY: Jimp.VERTICAL_ALIGN_TOP },
      maxWidth, H
    );
  }

  const wm = '© Private Bot';
  img.print(
    await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE),
    margin, H - margin - 24,
    { text: wm, alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT, alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM },
    maxWidth, 24
  );

  const buffer = await img.quality(90).getBufferAsync(Jimp.MIME_JPEG);
  return { buffer, mime: 'image/jpeg', width: W, height: H };
}
