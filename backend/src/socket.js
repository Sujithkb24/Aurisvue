import { handleSpeechTranscript } from './services/transcriptHandler.js';

export default function registerSocketHandlers(io) {
  // Keep track of users in rooms
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Store user information
    let currentRoomId = null;

    // Speech transcript handler
    socket.on('speech_transcript', async ({ text, timestamp }) => {
      const result = await handleSpeechTranscript(text);
      socket.emit('isl_response', result);
    });

    // WebRTC signaling: join room
    socket.on('join_room', (roomId) => {
  console.log(`User ${socket.id} joining room: ${roomId}`);
  
  // Leave previous room if any
  if (currentRoomId) {
    socket.leave(currentRoomId);
    
    // Update room participants
    if (rooms.has(currentRoomId)) {
      const roomUsers = rooms.get(currentRoomId);
      roomUsers.delete(socket.id);
      
      if (roomUsers.size === 0) {
        rooms.delete(currentRoomId);
      } else {
        // Notify others that user left
        socket.to(currentRoomId).emit('user_left', { userId: socket.id });
      }
    }
  }
  
  // Join new room
  socket.join(roomId);
  currentRoomId = roomId;
  
  // Update room participants
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(socket.id);
  
  // Get existing users in room
  const roomUsers = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);
  
  // Notify new user about existing participants
  socket.emit('room_users', { users: roomUsers });
  
  // Notify others that a new user joined
  socket.to(roomId).emit('user_joined', { userId: socket.id });
  
  // IMPORTANT: Confirm room join to client
  socket.emit('room_joined', { roomId });
});

    // WebRTC signaling: leave room
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      
      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId);
        roomUsers.delete(socket.id);
        
        if (roomUsers.size === 0) {
          rooms.delete(roomId);
        } else {
          // Notify others that user left
          socket.to(roomId).emit('user_left', { userId: socket.id });
        }
      }
      
      currentRoomId = null;
    });

  socket.on('teacher_speech', (data) => {
  console.log('Teacher speech received on server:', {
    sessionId: data.sessionId,
    text: data.text?.substring(0, 30) + (data.text?.length > 30 ? '...' : ''),
    isFinal: data.isFinal,
    room: data.room
  });
  
  if (!data.sessionId) {
    console.log('No sessionId provided in teacher_speech');
    return;
  }
  
  // Primary room format - this is what students join
  const sessionRoom = `session-${data.sessionId}`;
  
  // Broadcast to session room
  socket.to(sessionRoom).emit('teacher_speech', {
    text: data.text,
    isFinal: data.isFinal,
    timestamp: new Date().toISOString()
  });
  
  // Also broadcast to class code room if provided (fallback)
  if (data.room && data.room !== sessionRoom) {
    socket.to(data.room).emit('teacher_speech', {
      text: data.text,
      isFinal: data.isFinal,
      timestamp: new Date().toISOString()
    });
  }
  
  console.log(`Teacher speech broadcast to room ${sessionRoom}`);
  
  // Log room participants for debugging
  const roomParticipants = rooms.get(sessionRoom);
  console.log(`Room ${sessionRoom} has ${roomParticipants?.size || 0} participants`);
});
    
    // Student transcript handler
    socket.on('student_transcript', (data) => {
      if (!data.sessionId) return;
      
      // Find the teacher in the room and send only to them
      // This requires tracking who the teacher is for each session
      // For simplicity, broadcasting to the whole room
      socket.to(data.sessionId).emit('student_transcript', data);
      
      console.log(`Student transcript sent for session ${data.sessionId}:`, 
        data.text.substring(0, 30) + (data.text.length > 30 ? '...' : ''));
    });
    
    // WebRTC signaling: video call offer
    socket.on('video_offer', ({ offer, roomId, target }) => {
      if (target) {
        // Direct to specific user
        socket.to(target).emit('video_offer', { 
          offer, 
          sender: socket.id 
        });
      } else {
        // Broadcast to all in room
        socket.to(roomId).emit('video_offer', { 
          offer, 
          sender: socket.id 
        });
      }
    });

    // WebRTC signaling: video call answer
    socket.on('video_answer', ({ answer, roomId, target }) => {
      socket.to(target).emit('video_answer', { 
        answer, 
        sender: socket.id 
      });
    });

    // WebRTC signaling: screen sharing offer
    socket.on('screen_offer', ({ offer, roomId, target }) => {
      if (target) {
        // Direct to specific user
        socket.to(target).emit('screen_offer', { 
          offer, 
          sender: socket.id 
        });
      } else {
        // Broadcast to all in room
        socket.to(roomId).emit('screen_offer', { 
          offer, 
          sender: socket.id 
        });
      }
    });

    // WebRTC signaling: screen sharing answer
    socket.on('screen_answer', ({ answer, roomId, target }) => {
      socket.to(target).emit('screen_answer', { 
        answer, 
        sender: socket.id 
      });
    });

    // WebRTC signaling: ICE candidate
    socket.on('ice_candidate', ({ candidate, roomId, target }) => {
      if (target) {
        socket.to(target).emit('ice_candidate', { 
          candidate, 
          sender: socket.id 
        });
      } else {
        socket.to(roomId).emit('ice_candidate', { 
          candidate, 
          sender: socket.id 
        });
      }
    });

    // WebRTC: toggle media state (mute/unmute, video on/off)
    socket.on('toggle_media', ({ type, enabled, roomId }) => {
      socket.to(roomId).emit('user_toggle_media', {
        userId: socket.id,
        type, // 'audio' or 'video'
        enabled
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Update room if user was in one
      if (currentRoomId && rooms.has(currentRoomId)) {
        const roomUsers = rooms.get(currentRoomId);
        roomUsers.delete(socket.id);
        
        if (roomUsers.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          // Notify others that user left
          socket.to(currentRoomId).emit('user_left', { userId: socket.id });
        }
      }
    });
  });
}