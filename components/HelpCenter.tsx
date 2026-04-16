
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HelpItemProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

const HelpItem: React.FC<HelpItemProps> = ({ title, icon, children, isOpen, onToggle }) => (
    <div className="border-b border-border-light dark:border-border-dark last:border-0">
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
           <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
               <span className="material-symbols-outlined">{icon}</span>
           </div>
           <span className="font-bold text-text-primary-light dark:text-text-primary-dark text-left">{title}</span>
        </div>
        <span className={`material-symbols-outlined text-text-secondary-light transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
         <div className="p-4 pt-0 text-sm text-text-secondary-light dark:text-text-secondary-dark bg-surface-light dark:bg-surface-dark">
           {children}
         </div>
      </div>
    </div>
);

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (title: string) => {
    setOpenSection(openSection === title ? null : title);
  };

  return (
    <div className="pb-24 min-h-screen bg-background-light dark:bg-background-dark">
       <div className="sticky top-0 z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 flex items-center border-b border-border-light dark:border-border-dark">
         <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-text-primary-light dark:text-text-primary-dark">
             <span className="material-symbols-outlined">arrow_back</span>
         </button>
         <h1 className="text-lg font-bold flex-1 text-center pr-10 text-text-primary-light dark:text-text-primary-dark">Help Center</h1>
      </div>

      <div className="p-4">
        <div className="bg-primary/10 rounded-xl p-4 mb-6 flex items-start gap-3">
             <span className="material-symbols-outlined text-primary text-3xl">support_agent</span>
             <div>
                 <h2 className="font-bold text-primary text-lg">How can we help?</h2>
                 <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                    Find detailed guides on how to use every feature of the app below.
                 </p>
             </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark rounded-xl shadow-sm overflow-hidden border border-border-light dark:border-border-dark">
           
           <HelpItem 
             title="Dashboard Navigation" 
             icon="dashboard"
             isOpen={openSection === "Dashboard Navigation"}
             onToggle={() => toggleSection("Dashboard Navigation")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Overview:</strong> The dashboard is your central hub, showing your active learning plans, a progress overview, and your schedule calendar.</li>
                   <li><strong>AI Access:</strong> Get quick access to the <strong>ReLearn.ai</strong> assistant for immediate help.</li>
                   <li><strong>Navigation:</strong> Easily switch between key areas using the bottom bar:
                       <ul className="list-circle pl-5 mt-1 space-y-1 text-xs">
                           <li><strong>Dashboard:</strong> Your main home screen.</li>
                           <li><strong>Progress:</strong> Track your stats and growth.</li>
                           <li><strong>Learning Diary:</strong> Review your learning journey.</li>
                           <li><strong>Notifications:</strong> Stay updated on tasks and alerts.</li>
                           <li><strong>Profile:</strong> View your identity card and level.</li>
                           <li><strong>Settings:</strong> Manage app preferences.</li>
                       </ul>
                   </li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="Creating & Managing Plans" 
             icon="edit_note"
             isOpen={openSection === "Creating & Managing Plans"}
             onToggle={() => toggleSection("Creating & Managing Plans")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>AI-Powered Planning:</strong> ReLearn.ai creates personalized roadmaps for you.
                       <ol className="list-decimal pl-5 mt-1 space-y-1 text-xs">
                           <li>Click the <strong>New Plan</strong> button.</li>
                           <li>Enter a topic OR <strong>upload a PDF</strong> to learn from your own materials.</li>
                           <li>Choose your desired learning duration.</li>
                           <li><strong>ReLearn.ai</strong> instantly generates a structured learning roadmap.</li>
                       </ol>
                   </li>
                   <li><strong>Document learning:</strong> By uploading a PDF, the AI uses your specific document as the primary source for all lessons and activities.</li>
                   <li><strong>Plan Features:</strong> Every plan includes daily tasks, estimated study times, and AI-generated cover images.</li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="Learning Workspace" 
             icon="school"
             isOpen={openSection === "Learning Workspace"}
             onToggle={() => toggleSection("Learning Workspace")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Premium Interactive Sessions:</strong> The Learning Workspace provides a beautiful, distraction-free environment for deep focus.</li>
                   <li><strong>Key Features:</strong>
                       <ul className="list-circle pl-5 mt-1 space-y-1 text-xs">
                           <li><strong>Concept Breakdowns:</strong> Highly-structured, readable explanations with clear hierarchy and code examples.</li>
                           <li><strong>Video Mentorship:</strong> Hand-picked educational videos matched to your lesson topic from trusted creators.</li>
                           <li><strong>Step-by-Step Practice:</strong> Clear activities designed to move you from theory to practice immediately.</li>
                           <li><strong>Study Timer:</strong> A built-in timer to help you maintain a productive study rhythm.</li>
                       </ul>
                   </li>
                   <li><strong>Knowledge Retention:</strong> Every lesson includes a reflection activity to ensure you've mastered the concept.</li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="Progress Tracking" 
             icon="bar_chart"
             isOpen={openSection === "Progress Tracking"}
             onToggle={() => toggleSection("Progress Tracking")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Track Your Growth:</strong> Completing tasks in the workspace automatically updates your plan progress.</li>
                   <li><strong>Visual Feedback:</strong> Progress bars provide a clear view of your overall completion status for each plan.</li>
                   <li><strong>Long-Term Tracking:</strong> Monitor your learning journey over time to see how far you've come.</li>
                   <li><strong>Level Up:</strong> All your progress contributes directly to your <strong>Student Level Advancement</strong>.</li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="AI Assistant" 
             icon="smart_toy"
             isOpen={openSection === "AI Assistant"}
             onToggle={() => toggleSection("AI Assistant")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Your Study Buddy:</strong> The integrated <strong>ReLearn.ai</strong> assistant is always ready to help.</li>
                   <li><strong>Capabilities:</strong>
                       <ul className="list-circle pl-5 mt-1 space-y-1 text-xs">
                           <li>Ask specific questions about your current learning topic.</li>
                           <li>Get simplified explanations for difficult or complex concepts.</li>
                           <li>Receive personalized guidance and tips while you study.</li>
                       </ul>
                   </li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="Learning Diary" 
             icon="menu_book"
             isOpen={openSection === "Learning Diary"}
             onToggle={() => toggleSection("Learning Diary")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Your Journey:</strong> The Learning Diary is your personal archive of knowledge.</li>
                   <li><strong>Features:</strong>
                       <ul className="list-circle pl-5 mt-1 space-y-1 text-xs">
                           <li>View all your currently active learning plans.</li>
                           <li>Revisit plans you have already explored.</li>
                           <li>Access your complete history of archived learning journeys.</li>
                       </ul>
                   </li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="Profile & Identity Card" 
             icon="badge"
             isOpen={openSection === "Profile & Identity Card"}
             onToggle={() => toggleSection("Profile & Identity Card")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Identity Card:</strong> View your personal learning identity card, showcasing your achievements.</li>
                   <li><strong>Student Level System:</strong> Your profile features a dynamic leveling system that grows with you.</li>
                   <li><strong>Advancement:</strong> Make progress in your plans to earn XP and advance your student level.</li>
                   <li><strong>Shareable Identity:</strong> Use your unique QR profile identity to share your learning status.</li>
               </ul>
           </HelpItem>

           <HelpItem 
             title="Notifications" 
             icon="notifications"
             isOpen={openSection === "Notifications"}
             onToggle={() => toggleSection("Notifications")}
           >
               <ul className="list-disc pl-5 space-y-3">
                   <li><strong>Stay Consistent:</strong> Notifications are designed to help you maintain a consistent study habit.</li>
                   <li><strong>Updates:</strong> Track important updates about your plans and achievements so you never miss a beat.</li>
               </ul>
           </HelpItem>

        </div>
      </div>
    </div>
  );
};

export default HelpCenter;