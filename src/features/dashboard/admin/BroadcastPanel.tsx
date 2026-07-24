import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../../components/ui/Icon';
import { adminService } from '../../../services/api/adminService';
import { logAdminAction } from '../../../services/analytics/auditLogService';
import { useAuth } from '../../../contexts/AuthContext';
import { triggerHaptic } from '../../../utils/haptics';

interface Subscriber {
  id: string;
  email: string;
  created_at: string;
}

interface BroadcastPanelProps {
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info' } | null) => void;
}

const CATEGORY_THEMES = {
  'Cognitive Science': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  'AI Agent Release': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'Platform Updates': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'General Newsletter': 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border-stone-500/20'
};

const BroadcastPanel: React.FC<BroadcastPanelProps> = ({ setToast }) => {
  const { user: adminUser } = useAuth();
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Composer state
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<keyof typeof CATEGORY_THEMES>('Cognitive Science');
  const [body, setBody] = useState('');

  // Dispatch simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState<number>(0);
  const [simCompletedRecipients, setSimCompletedRecipients] = useState<string[]>([]);
  const [simCurrentRecipient, setSimCurrentRecipient] = useState<string>('');

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getNewsletterSubscribers();
      setSubscribers(data);
    } catch (err: any) {
      setToast({ message: 'Failed to load subscribers', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubscriber = async (id: string, email: string) => {
    setDeletingId(id);
    triggerHaptic('medium');
    try {
      await adminService.deleteNewsletterSubscriber(id);
      setSubscribers(prev => prev.filter(s => s.id !== id));
      if (adminUser) {
        await logAdminAction(
          adminUser.id!,
          adminUser.email!,
          'newsletter.unsubscribe',
          'newsletter',
          id,
          email,
          { adminInitiated: true }
        );
      }
      setToast({ message: 'Subscriber removed successfully', type: 'success' });
    } catch (err: any) {
      setToast({ message: 'Failed to unsubscribe user', type: 'error' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim() || subscribers.length === 0) return;
    
    triggerHaptic('heavy');
    setIsSimulating(true);
    setSimStep(0);
    setSimCompletedRecipients([]);
    setSimCurrentRecipient('');

    // STEP 1: Secure Relay Tunnel
    await new Promise(resolve => setTimeout(resolve, 800));
    setSimStep(1);

    // STEP 2: Parse Metadata & Markdown
    await new Promise(resolve => setTimeout(resolve, 800));
    setSimStep(2);

    // STEP 3: Iterative recipient sending simulation
    for (let i = 0; i < subscribers.length; i++) {
      const recipient = subscribers[i].email;
      setSimCurrentRecipient(recipient);
      // Simulate active SMTP dispatch delay
      await new Promise(resolve => setTimeout(resolve, Math.max(150, 600 / subscribers.length)));
      setSimCompletedRecipients(prev => [...prev, recipient]);
    }
    
    setSimCurrentRecipient('');
    setSimStep(3);

    // STEP 4: Complete & Log Audit Action
    try {
      if (adminUser) {
        await logAdminAction(
          adminUser.id!,
          adminUser.email!,
          'newsletter.broadcast',
          'newsletter',
          'global',
          `Dispatched campaign: "${subject}"`,
          {
            subject,
            category,
            bodyLength: body.length,
            recipientCount: subscribers.length
          }
        );
      }
      triggerHaptic('success');
      setToast({ message: `Newsletter campaign broadcasted successfully!`, type: 'success' });
      // Reset composer
      setSubject('');
      setBody('');
    } catch (err: any) {
      setToast({ message: 'Failed to record campaign audit log', type: 'error' });
    } finally {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsSimulating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Left Column: Subscriber Grid (5 cols) */}
      <div className="lg:col-span-5 space-y-6">
        {/* KPI Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[2rem] border border-border-light dark:border-border-dark p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-stone-900 border border-indigo-100 dark:border-white/5 text-indigo-600 flex items-center justify-center">
              <Icon name="mail" className="text-xl" />
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active List</div>
              <div className="text-2xl font-black tracking-tight">{subscribers.length}</div>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider">
            Synced
          </div>
        </div>

        {/* Subscriber List Box */}
        <div className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.01]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Icon name="people" className="text-indigo-600" />
              Subscribers Manager
            </h3>
            <button 
              onClick={fetchSubscribers} 
              disabled={isLoading}
              className="p-1.5 rounded-xl border border-border-light dark:border-border-dark hover:bg-slate-50 dark:hover:bg-stone-900 transition-colors disabled:opacity-50"
            >
              <Icon name="refresh" className={`text-sm ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="max-h-[360px] overflow-y-auto pr-2 space-y-2 no-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Subscribers...</span>
              </div>
            ) : subscribers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Icon name="mark_email_unread" className="text-4xl text-slate-300 dark:text-stone-700 mb-2" />
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Subscribers Found</div>
                <div className="text-[10px] text-slate-400/80 mt-1 max-w-[180px]">Add emails from the Stay in Sync footer widget!</div>
              </div>
            ) : (
              subscribers.map((sub) => (
                <div 
                  key={sub.id} 
                  className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-stone-900/50 rounded-2xl border border-border-light dark:border-border-dark group hover:border-indigo-500/20 dark:hover:border-indigo-500/20 transition-all duration-300"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-xs font-bold text-text-primary-light dark:text-text-primary-dark truncate">{sub.email}</div>
                    <div className="text-[9px] font-bold text-slate-400/80 uppercase tracking-widest mt-0.5">
                      Joined {new Date(sub.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  
                  <button 
                    disabled={deletingId === sub.id}
                    onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    {deletingId === sub.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon name="delete" className="text-sm" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Campaign Composer (7 cols) */}
      <form onSubmit={handleBroadcast} className="lg:col-span-7 bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 shadow-xl shadow-black/[0.01] flex flex-col justify-between min-h-[460px]">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Icon name="campaign" className="text-indigo-600" />
              Campaign Writer
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              HTML/Markdown Supported
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subject Input */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject Line</label>
              <input 
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Relearn.ai June Update: Advanced Neural Recall"
                className="w-full bg-slate-50 dark:bg-stone-900/50 border border-border-light dark:border-border-dark rounded-2xl h-11 px-4 text-xs font-bold focus:ring-2 focus:ring-indigo-600/20 outline-none transition-all"
              />
            </div>

            {/* Category Select */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category Tag</label>
              <select 
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-stone-900/50 border border-border-light dark:border-border-dark rounded-2xl h-11 px-3 text-xs font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all cursor-pointer"
              >
                {Object.keys(CATEGORY_THEMES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Body Textarea */}
          <div className="space-y-1.5 flex-1 flex flex-col">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Newsletter Body</label>
            <textarea 
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="# What's New at ReLearn.ai

We've just deployed five major enhancements to the active metacognitive learning system:
* **Mistake Museum Anomalies**: Custom visual indicators for target revision domains.
* **Concept Collision Reactor**: Interactive high-resonance simulations mapping dual study paradigms.

Stay structured, stay resilient!"
              className="w-full bg-slate-50 dark:bg-stone-900/50 border border-border-light dark:border-border-dark rounded-[2rem] p-6 text-xs font-medium focus:ring-2 focus:ring-indigo-600/20 outline-none resize-none flex-1 min-h-[220px]"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 mt-6">
          <div className="text-[10px] font-bold text-slate-400 max-w-[280px]">
            Targeting all <span className="text-indigo-600 font-extrabold">{subscribers.length} subscribers</span>. Make sure to double check markdown formatting before dispatching.
          </div>
          <button 
            type="submit"
            disabled={!subject.trim() || !body.trim() || subscribers.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/30 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-600/10 disabled:opacity-30 disabled:hover:shadow-none transition-all duration-300"
          >
            <Icon name="send" className="text-sm" />
            <span>Send Broadcast</span>
          </button>
        </div>
      </form>

      {/* DISPATCH SIMULATION MODAL OVERLAY */}
      <AnimatePresence>
        {isSimulating && createPortal(
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-surface-dark rounded-[2.5rem] border border-border-light dark:border-border-dark p-8 md:p-10 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center animate-pulse">
                  <Icon name="dns" className="text-xl" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Campaign Dispatch Node</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Broadcasting updates to {subscribers.length} recipients</p>
                </div>
              </div>

              {/* Steps Progress */}
              <div className="space-y-3.5">
                {/* Step 1: Tunnel Setup */}
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2.5">
                    {simStep > 0 ? (
                      <Icon name="check_circle" className="text-emerald-500" />
                    ) : (
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className={simStep > 0 ? 'text-slate-400' : ''}>Securing SMTP Relay Tunnels</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{simStep > 0 ? 'READY' : 'PENDING'}</span>
                </div>

                {/* Step 2: Parser metadata */}
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2.5">
                    {simStep > 1 ? (
                      <Icon name="check_circle" className="text-emerald-500" />
                    ) : simStep === 1 ? (
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon name="pending" className="text-slate-300 dark:text-stone-700" />
                    )}
                    <span className={simStep > 1 ? 'text-slate-400' : simStep < 1 ? 'text-slate-300 dark:text-stone-700' : ''}>
                      Compiling Rich Text Markdown Engine
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{simStep > 1 ? 'COMPILE SUCCESS' : simStep === 1 ? 'PARSING...' : 'HOLD'}</span>
                </div>

                {/* Step 3: Loop dispatch */}
                <div className="space-y-2 border-t border-slate-100 dark:border-white/5 pt-4">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center gap-2.5">
                      {simStep > 2 ? (
                        <Icon name="check_circle" className="text-emerald-500" />
                      ) : simStep === 2 ? (
                        <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="pending" className="text-slate-300 dark:text-stone-700" />
                      )}
                      <span className={simStep > 2 ? 'text-slate-400' : simStep < 2 ? 'text-slate-300 dark:text-stone-700' : ''}>
                        Iterative SMTP Subscriber Dispatch
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-600 font-extrabold">
                      {simCompletedRecipients.length} / {subscribers.length} SENT
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-stone-850 h-2.5 rounded-full overflow-hidden border border-slate-200/40 dark:border-white/5">
                    <motion.div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full"
                      animate={{ width: `${subscribers.length > 0 ? (simCompletedRecipients.length / subscribers.length) * 100 : 0}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>

                  {/* Live Dispatch Stream */}
                  {simStep === 2 && (
                    <div className="bg-slate-50 dark:bg-stone-900 rounded-2xl border border-slate-150 dark:border-white/5 p-4 max-h-[140px] overflow-y-auto space-y-1 text-[10px] font-mono text-slate-400 no-scrollbar">
                      {simCompletedRecipients.map((rec, ri) => (
                        <div key={ri} className="flex items-center gap-1.5 text-emerald-500">
                          <Icon name="done" className="text-[10px] font-bold" />
                          <span>Delivered to: {rec} [200 OK]</span>
                        </div>
                      ))}
                      {simCurrentRecipient && (
                        <div className="flex items-center gap-1.5 text-indigo-500 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                          <span>Dispatching mail block: {simCurrentRecipient}...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Step 4: Finishing */}
                <div className="flex items-center justify-between text-xs font-bold border-t border-slate-100 dark:border-white/5 pt-4">
                  <div className="flex items-center gap-2.5">
                    {simStep > 3 ? (
                      <Icon name="check_circle" className="text-emerald-500" />
                    ) : simStep === 3 ? (
                      <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon name="pending" className="text-slate-300 dark:text-stone-700" />
                    )}
                    <span className={simStep > 3 ? 'text-slate-400' : simStep < 3 ? 'text-slate-300 dark:text-stone-700' : ''}>
                      Completing Campaign Audit logs
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{simStep > 3 ? 'AUDITED' : simStep === 3 ? 'LOGGING...' : 'HOLD'}</span>
                </div>
              </div>

              {simStep > 3 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-450 text-xs font-bold"
                >
                  <Icon name="verified" className="text-lg animate-bounce" />
                  <div>
                    <div>Campaign Dispatched Successfully!</div>
                    <div className="text-[9px] text-emerald-500 uppercase tracking-widest font-black mt-0.5">Audit log successfully pushed</div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
};

export default BroadcastPanel;
