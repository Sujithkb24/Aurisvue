import { handleSpeechTranscript } from './services/transcriptHandler.js';

export default function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Speech transcript handler
    socket.on('speech_transcript', async ({ text, timestamp }) => {
      const result = await handleSpeechTranscript(text);
      socket.emit('isl_response', result);
    });

    // WebRTC signaling: join room
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      socket.to(roomId).emit('user_joined', socket.id);
    });

    // WebRTC signaling: offer
    socket.on('offer', ({ offer, roomId }) => {
      socket.to(roomId).emit('offer', { offer, sender: socket.id });
    });

    // WebRTC signaling: answer
    socket.on('answer', ({ answer, roomId }) => {
      socket.to(roomId).emit('answer', { answer, sender: socket.id });
    });

    // WebRTC signaling: ICE candidate
    socket.on('ice_candidate', ({ candidate, roomId }) => {
      socket.to(roomId).emit('ice_candidate', { candidate, sender: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
