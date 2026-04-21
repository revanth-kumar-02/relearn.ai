import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessageStreaming } from '../services/gemini/chatbotService';
import { useAuth } from '../contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import { useData } from '../contexts/DataContext';
import { getVideoLanguageLabel } from '../services/youtubeService';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { videoLanguage } = useData();
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: `Hi ${user?.name.split(' ')[0] || ''}! I'm your ReLearn.ai study assistant. How can I help you with your learning journey today?` }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingIndexRef = useRef<number>(-1);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);

    // Add user message and an empty bot message placeholder
    setMessages(prev => {
      const updated = [...prev, { role: 'user' as const, text: userMessage }, { role: 'bot' as const, text: '' }];
      streamingIndexRef.current = updated.length - 1;
      return updated;
    });

    try {
      const history = messages.slice(1).map(m => ({
        role: m.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: m.text }]
      }));

      const userContext = user ? `
        Name: ${user.name}
        Level: ${user.academicLevel}
        Goals: ${user.learningGoals?.join(', ')}
        Strong Subjects: ${user.strongSubjects?.join(', ')}
        Weak Subjects: ${user.weakSubjects?.join(', ')}
        Preferred Study Time: ${user.preferredStudyTime}
      ` : undefined;

      await sendChatMessageStreaming(
        userMessage,
        history,
        (accumulatedText) => {
          // Update the bot message in-place as chunks arrive
          setMessages(prev => {
            const updated = [...prev];
            const idx = streamingIndexRef.current;
            if (idx >= 0 && idx < updated.length) {
              updated[idx] = { ...updated[idx], text: accumulatedText };
            }
            return updated;
          });
        },
        getVideoLanguageLabel(videoLanguage),
        userContext
      );
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        const idx = streamingIndexRef.current;
        if (idx >= 0 && idx < updated.length) {
          updated[idx] = { ...updated[idx], text: "Sorry, I encountered an error. Please try again." };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      streamingIndexRef.current = -1;
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[70] md:hidden animate-fade-in"
          onClick={onClose}
        ></div>
      )}

      {/* Chat Panel */}
      <div 
        className={`fixed z-[80] bg-surface-light dark:bg-surface-dark shadow-2xl border-l border-border-light dark:border-border-dark transition-transform duration-500 ease-in-out
          bottom-0 right-0 w-full h-[80vh] rounded-t-3xl md:h-screen md:w-[400px] md:rounded-none
          ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-y-0 md:translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center justify-between bg-indigo-600 text-white md:rounded-none rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <div>
              <h3 className="font-bold text-sm">Study Assistant</h3>
              <p className="text-[10px] opacity-80 uppercase tracking-widest">
                {isStreaming ? (
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                    Typing...
                  </span>
                ) : 'Always Online'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(100%-130px)] no-scrollbar">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
            >
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-gray-100 dark:bg-gray-800 text-text-primary-light dark:text-text-primary-dark rounded-tl-none'
              }`}>
                {msg.role === 'bot' ? (
                  msg.text ? (
                    <div className="prose-content leading-relaxed markdown-body">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    /* Streaming placeholder — show typing dots while text is empty */
                    <div className="flex gap-1 py-1">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  )
                ) : (
                  msg.text
                )}
                {/* Streaming cursor indicator */}
                {isStreaming && i === streamingIndexRef.current && msg.text && (
                  <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-text-bottom" />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form 
          onSubmit={handleSend}
          className="p-4 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark absolute bottom-0 w-full"
        >
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isStreaming ? "Wait for response..." : "Ask me anything..."}
              disabled={isStreaming}
              className="w-full p-3 pr-12 rounded-xl bg-gray-50 dark:bg-background-dark border border-border-light dark:border-border-dark outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-sm disabled:opacity-50"
            />
            <button 
              type="submit"
              disabled={isStreaming}
              className="absolute right-2 p-2 text-indigo-600 hover:scale-110 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default ChatBot;
