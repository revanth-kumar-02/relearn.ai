import { supabase } from './supabase';
import { User } from '../types';

export interface FriendRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  requester?: {
    id: string;
    name: string;
    username: string;
    profilePicture: string;
  };
  receiver?: {
    id: string;
    name: string;
    username: string;
    profilePicture: string;
  };
}

export const friendService = {
  async getFriends(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:requester_id(id, name, username, profilePicture),
        receiver:receiver_id(id, name, username, profilePicture)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;
    
    return data.map(f => {
      const friend = f.requester_id === userId ? f.receiver : f.requester;
      return {
        ...friend,
        friendshipId: f.id,
        since: f.created_at
      };
    });
  },

  async getPendingRequests(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:requester_id(id, name, username, profilePicture)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data;
  },

  async sendFriendRequest(requesterId: string, username: string) {
    // 1. Find user by username
    const { data: targetUser, error: findError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (findError || !targetUser) throw new Error('User not found');
    if (targetUser.id === requesterId) throw new Error("You can't add yourself");

    // 2. Create request
    const { error } = await supabase
      .from('friendships')
      .insert({
        requester_id: requesterId,
        receiver_id: targetUser.id,
        status: 'pending'
      });

    if (error) {
      if (error.code === '23505') throw new Error('Request already exists');
      throw error;
    }
  },

  async acceptFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  },

  async rejectFriendRequest(requestId: string) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (error) throw error;
  },

  async removeFriend(friendshipId: string) {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
  },

  async searchUsers(query: string, currentUserId: string) {
    if (!query || query.length < 1) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, username, profilePicture')
      .ilike('username', `%${query}%`)
      .neq('id', currentUserId)
      .limit(5);

    if (error) throw error;
    return data;
  },

  subscribeToFriendships(userId: string, callback: () => void) {
    return supabase
      .channel(`friends_${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships',
        filter: `requester_id=eq.${userId}`
      }, callback)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'friendships',
        filter: `receiver_id=eq.${userId}`
      }, callback)
      .subscribe();
  }
};
