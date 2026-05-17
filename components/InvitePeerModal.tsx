import React, { useState, useEffect, useRef } from 'react';
import Icon from './common/Icon';
import { searchUsers } from '../services/dataService';
import { User, Plan } from '../types';

interface InvitePeerModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onInvite: (userIdOrEmail: string) => void;
}

const InvitePeerModal: React.FC<InvitePeerModalProps> = ({ isOpen, onClose, plan, onInvite }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const users = await searchUsers(query.trim());
        setResults(users);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleInvite = (identifier: string) => {
    const currentMembers = plan.teamMembers || [];
    if (currentMembers.includes(identifier)) {
      return; // Already in team
    }
    onInvite(identifier);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-light dark:bg-surface-dark rounded-3xl w-full max-w-[420px] shadow-2xl animate-scale-in border border-border-light dark:border-border-dark flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-border-light dark:border-border-dark flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Icon name="person_add" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-primary-light dark:text-text-primary-dark">Invite Peer</h3>
              <p className="text-xs text-text-secondary-light">Add someone to your learning plan</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-secondary-light hover:text-text-primary-light transition-colors">
            <Icon name="close" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-light" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium"
            />
            {isSearching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-2">
            {query.trim().length > 0 && query.trim().length < 2 && (
              <p className="text-xs text-center text-text-secondary-light py-4">Keep typing to search...</p>
            )}
            
            {!isSearching && query.trim().length >= 2 && results.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark mb-1">No users found</p>
                <p className="text-xs text-text-secondary-light mb-4">You can still invite them via email</p>
                <button 
                  onClick={() => handleInvite(query.trim())}
                  className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                >
                  Invite "{query.trim()}" directly
                </button>
              </div>
            )}

            {results.map(user => {
              const isAlreadyMember = (plan.teamMembers || []).includes(user.id) || (plan.teamMembers || []).includes(user.email);
              return (
                <button
                  key={user.id}
                  disabled={isAlreadyMember}
                  onClick={() => handleInvite(user.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark truncate">{user.name}</p>
                      <p className="text-xs text-text-secondary-light truncate">{user.email}</p>
                    </div>
                  </div>
                  <div className="pl-2">
                    {isAlreadyMember ? (
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-100 px-2 py-1 rounded">Added</span>
                    ) : (
                      <Icon name="person_add" className="text-text-secondary-light group-hover:text-indigo-500 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvitePeerModal;
