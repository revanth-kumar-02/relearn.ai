import { supabase } from './supabase';
import { StudyRoom, RoomMember, RoomMessage } from '../types';

export const roomService = {
  // Generate a random 6-character room code
  generateRoomCode: () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  },

  // Create a new study room
  createRoom: async (name: string, hostId: string, userName: string) => {
    try {
      const roomCode = roomService.generateRoomCode();
      
      // 1. Create the room
      const { data: room, error: roomError } = await supabase
        .from('study_rooms')
        .insert({
          name: name || 'Study Room',
          host_id: hostId,
          room_code: roomCode,
          max_members: 8,
          is_active: true,
          settings: { break: 5, timer: 25, longBreak: 15 }
        })
        .select()
        .single();

      if (roomError) {
        console.error('Room Insert Error:', roomError);
        throw new Error(`Failed to create room record: ${roomError.message}`);
      }

      if (!room) throw new Error('No room data returned after creation');

      // 2. Join the room as the host
      const { error: memberError } = await supabase
        .from('room_members')
        .insert({
          room_id: room.id,
          user_id: hostId,
          user_name: userName || 'Host',
          status: 'idle',
          last_active_at: new Date().toISOString()
        });

      if (memberError) {
        console.error('Member Insert Error:', memberError);
        // We still return the room even if joining fails, 
        // as the user can try to join manually or we can handle it in the UI
      }

      return room as StudyRoom;
    } catch (err: any) {
      console.error('Room Creation Exception:', err);
      throw err;
    }
  },

  // Join a room using a code
  joinRoomByCode: async (code: string, userId: string, userName: string) => {
    // 1. Find the room
    const { data: room, error: roomError } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('room_code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (roomError) throw new Error('Room not found or inactive');

    // 2. Join the room
    const { data: member, error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId,
        user_name: userName,
        status: 'idle'
      })
      .select()
      .single();

    if (memberError) {
      if (memberError.code === '23505') {
        // User already in room, just return the room
        return room as StudyRoom;
      }
      throw memberError;
    }

    return room as StudyRoom;
  },

  // Leave a study room
  leaveRoom: async (roomId: string, userId: string) => {
    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Update member status
  updateStatus: async (roomId: string, userId: string, status: 'studying' | 'break' | 'idle', currentTask?: string) => {
    const { error } = await supabase
      .from('room_members')
      .update({
        status,
        current_task: currentTask,
        last_active_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Get all members in a room
  getRoomMembers: async (roomId: string) => {
    const { data, error } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data as RoomMember[];
  },

  // Send a chat message
  sendMessage: async (roomId: string, userId: string, userName: string, content: string) => {
    const { error } = await supabase
      .from('room_messages')
      .insert({
        room_id: roomId,
        user_id: userId,
        user_name: userName,
        content
      });

    if (error) throw error;
  },

  // Get recent messages
  getRecentMessages: async (roomId: string, limit = 50) => {
    const { data, error } = await supabase
      .from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data as RoomMessage[]).reverse();
  },

  // Get active rooms for a user
  getMyRooms: async (userId: string) => {
    const { data, error } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('host_id', userId)
      .eq('is_active', true);
    
    if (error) throw error;
    return data as StudyRoom[];
  },

  // Get a specific room
  getRoom: async (roomId: string) => {
    const { data, error } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (error) throw error;
    return data as StudyRoom;
  },

  // Delete a study room (only by host)
  deleteRoom: async (roomId: string) => {
    const { error } = await supabase
      .from('study_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
  },

  // Ping activity to keep 'Active Now' status
  pingActivity: async (roomId: string, userId: string) => {
    const { error } = await supabase
      .from('room_members')
      .update({
        last_active_at: new Date().toISOString()
      })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Real-time subscription helper
  subscribeToRoom: (
    roomId: string, 
    onMemberUpdate: (payload: any) => void, 
    onMessage: (payload: any) => void
  ) => {
    const channel = supabase.channel(`room:${roomId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` }, 
        onMemberUpdate
      )
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` }, 
        onMessage
      )
      .subscribe();

    return channel;
  }
};
