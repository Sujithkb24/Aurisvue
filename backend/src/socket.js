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