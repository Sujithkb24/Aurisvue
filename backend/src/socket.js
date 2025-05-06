import { handleSpeechTranscript } from './services/transcriptHandler.js';

export default function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Listen for audio transcript text
    socket.on('speech_transcript', async ({ text, timestamp }) => {
      const result = await handleSpeechTranscript(text);
      socket.emit('isl_response', result); // Send back to frontend
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
