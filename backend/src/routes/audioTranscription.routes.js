import express from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import { transcribeWithGoogle } from '../services/speechText.js';
import { handleSpeechTranscript } from '../services/transcriptHandler.js';

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/', upload.single('audio'), async (req, res) => {
  const { file } = req;
  const { predominantLang } = req.body;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No audio file provided' });
  }

  try {
    const transcript = await transcribeWithGoogle(file.path, predominantLang);
    const result = await handleSpeechTranscript(transcript, predominantLang);
    await fs.unlink(file.path); // cleanup
    res.json(result);
  } catch (err) {
    await fs.unlink(file.path);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
