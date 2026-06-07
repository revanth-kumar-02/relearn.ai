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

  async getSentRequests(userId: string) {
    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        receiver:receiver_id(id, name, username, profilePicture)
      `)
      .eq('requester_id', userId)
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

    // 3. Get requester's name
    const { data: reqUser } = await supabase
      .from('users')
      .select('name')
      .eq('id', requesterId)
      .single();
    const name = reqUser?.name || 'Someone';

    // 4. Create notification for the receiver
    await supabase
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        userId: targetUser.id,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${name} sent you a friend request.`,
        time: new Date().toISOString(),
        read: false
      });
  },

  async acceptFriendRequest(requestId: string) {
    // 1. Fetch request details to know requester & receiver
    const { data: request, error: fetchError } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id, receiver:receiver_id(name)')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) throw fetchError || new Error('Request not found');

    // 2. Update request status to accepted
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;

    // 3. Notify the requester that the request was accepted
    const receiverName = (request.receiver as any)?.name || 'Someone';
    await supabase
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        userId: request.requester_id,
        type: 'friend_request',
        title: 'Friend Request Accepted',
        message: `Your friend request was accepted.`,
        time: new Date().toISOString(),
        read: false
      });
  },

  async rejectFriendRequest(requestId: string) {
    // 1. Fetch request details
    const { data: request } = await supabase
      .from('friendships')
      .select('requester_id, receiver_id, receiver:receiver_id(name)')
      .eq('id', requestId)
      .maybeSingle();

    // 2. Delete request row
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (error) throw error;

    // 3. Notify the requester that the request was declined
    if (request) {
      await supabase
        .from('notifications')
        .insert({
          id: crypto.randomUUID(),
          userId: request.requester_id,
          type: 'friend_request',
          title: 'Friend Request Declined',
          message: `Your friend request was declined.`,
          time: new Date().toISOString(),
          read: false
        });
    }
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
