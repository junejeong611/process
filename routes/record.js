const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const recordAndTranscribe = require('../utils/voicerecord');

const router = express.Router();
const upload = multer(); // memory storage by default

// Ensure the temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fsSync.existsSync(tempDir)) {
  fsSync.mkdirSync(tempDir, { recursive: true });
}

router.post('/', upload.single('audio'), async (req, res) => {
  console.log('🔊 /voicerecord hit');

  const id = Date.now();
  const inputPath = path.join(__dirname, `../temp/input-${id}.webm`);
  const outputPath = path.join(__dirname, `../temp/output-${id}.wav`);

  try {
    // Save the uploaded buffer to a temp file
    await fs.writeFile(inputPath, req.file.buffer);
    // Log the file size for debugging
    const stats = await fs.stat(inputPath);
    console.log('Saved input file size:', stats.size);

    // Convert to WAV using ffmpeg
    await new Promise((resolve, reject) => {
      const command = `ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -f wav "${outputPath}"`;
      exec(command, (err, stdout, stderr) => {
        if (err) {
          console.error('❌ ffmpeg error:', stderr);
          return reject(err);
        }
        resolve();
      });
    });

    const wavBuffer = await fs.readFile(outputPath);
    const transcript = await recordAndTranscribe(wavBuffer);

    console.log('✅ Transcription complete:', transcript);
    res.json({ transcript });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Transcription failed', details: err.message });
  } finally {
    // Clean up temp files
    try { await fs.unlink(inputPath); } catch {}
    try { await fs.unlink(outputPath); } catch {}
  }
});

module.exports = router;
