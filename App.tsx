import React, { useState, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider } from './contexts/AuthContext';
import { ConnectionProvider } from './contexts/ConnectionContext';
import { TutorialProvider } from './contexts/TutorialContext';
import { ToastProvider } from './contexts/ToastContext';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import TutorialGuide from './components/TutorialGuide';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import StorageWarningToast from './components/StorageWarningToast';
import Icon from './components/common/Icon';
import Skeleton from './components/common/Skeleton';
import EmailVerificationModal from './components/EmailVerificationModal';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

const KeyboardShortcutsModal = lazy(() => import('./components/common/KeyboardShortcutsModal'));

// Lazy Loaded Components
const Login = lazy(() => import('./components/Login'));
const CreateAccount = lazy(() => import('./components/CreateAccount'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Progress = lazy(() => import('./components/Progress'));
const PlanDetails = lazy(() => import('./components/PlanDetails'));
const LearningWorkspace = lazy(() => import('./components/LearningWorkspace'));
const AddTask = lazy(() => import('./components/AddTask'));
const EditTask = lazy(() => import('./components/EditTask'));
const Notifications = lazy(() => import('./components/Notifications'));
const NotificationSettings = lazy(() => import('./components/NotificationSettings'));
const Settings = lazy(() => import('./components/Settings'));
const Profile = lazy(() => import('./components/Profile'));
const LearningDiary = lazy(() => import('./components/LearningDiary'));
const CreatePlan = lazy(() => import('./components/CreatePlan'));
const HelpCenter = lazy(() => import('./components/HelpCenter'));
const Feedback = lazy(() => import('./components/Feedback'));
const ArchivedPlans = lazy(() => import('./components/ArchivedPlans'));
const ChatBot = lazy(() => import('./components/ChatBot'));
const TemplateGallery = lazy(() => import('./components/TemplateGallery'));
const SharedPlanView = lazy(() => import('./components/SharedPlanView'));
const StudyRooms = lazy(() => import('./components/StudyRooms'));
const RoomView = lazy(() => import('./components/RoomView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

const PageLoader = () => (
  <div className="p-4 space-y-6 animate-pulse">
    <Skeleton className="h-12 w-48" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
    <Skeleton className="h-64 w-full rounded-2xl" />
  </div>
);

import { AnimatePresence, motion } from 'motion/react';
import { triggerHaptic } from './utils/haptics';

const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    const saved = localStorage.getItem('relearn_sidebar_expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const { showHelp: showShortcuts, setShowHelp: setShowShortcuts } = useKeyboardShortcuts();

  const toggleSidebar = () => {
    const newState = !isSidebarExpanded;
    setIsSidebarExpanded(newState);
    localStorage.setItem('relearn_sidebar_expanded', JSON.stringify(newState));
    triggerHaptic('light');
  };

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@relearn.ai' || user?.email === 'imposterz.rev02@gmail.com';

  const authPaths = ['/', '/signup'];
  const isAuthPage = authPaths.includes(location.pathname);

  const hideMobileNavPaths = [
    ...authPaths,
    '/learning-workspace',
    '/add-task',
    '/edit-task',
    '/create-plan',
    '/help-center',
    '/feedback',
    '/archived',
    '/rooms/'
  ];

  const hideSidebarPaths = [
    ...authPaths,
    '/rooms/'
  ];

  const showMobileNav = !hideMobileNavPaths.some(path => 
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  const showSidebar = !hideSidebarPaths.some(path => 
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  const isDiary = location.pathname === '/diary';

  return (
    <div className={`flex min-h-screen ${isDiary ? 'bg-cream dark:bg-dark-cream' : 'bg-background-light dark:bg-background-dark'} overflow-hidden transition-colors duration-500`}>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:shadow-xl"
      >
        Skip to main content
      </a>

      <TutorialGuide />
      <OfflineIndicator showMobileNav={showMobileNav} />
      <Suspense fallback={null}>
        <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </Suspense>
      <EmailVerificationModal />
      <MaintenanceOverlay />

      {/* Desktop Sidebar */}
      {showSidebar && (
        <aside 
          className={`hidden md:flex flex-col h-screen bg-white dark:bg-surface-dark border-r border-border-light dark:border-border-dark fixed left-0 top-0 z-50 transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? 'w-64' : 'w-20'
          }`}
        >
          <div className={`p-4 flex items-center border-b border-border-light dark:border-border-dark ${isSidebarExpanded ? 'gap-3 px-6' : 'justify-center'}`}>
            <div className="w-10 h-10 min-w-[40px] rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 cursor-pointer" onClick={toggleSidebar}>
              <Icon name="school" className="text-2xl" />
            </div>
            {isSidebarExpanded && (
              <h1 className="text-xl font-bold text-text-primary-light dark:text-text-primary-dark tracking-tight truncate">ReLearn.ai</h1>
            )}
          </div>


          <nav className="flex-1 p-4 space-y-2 overflow-y-auto no-scrollbar">
            <SidebarItem
              icon="home"
              label="Dashboard"
              active={location.pathname === '/dashboard'}
              onClick={() => navigate('/dashboard')}
              ariaLabel="Navigate to Dashboard"
              showLabel={isSidebarExpanded}
            />
            <SidebarItem
              id="tutorial-progress"
              icon="bar_chart"
              label="Progress"
              active={location.pathname === '/progress'}
              onClick={() => navigate('/progress')}
              ariaLabel="Navigate to Progress"
              showLabel={isSidebarExpanded}
            />
            <SidebarItem
              icon="menu_book"
              label="Learning Diary"
              active={location.pathname === '/diary'}
              onClick={() => navigate('/diary')}
              ariaLabel="Navigate to Learning Diary"
              showLabel={isSidebarExpanded}
            />
            <SidebarItem
              icon="dashboard_customize"
              label="Templates"
              active={location.pathname === '/templates'}
              onClick={() => navigate('/templates')}
              ariaLabel="Navigate to Templates"
              showLabel={isSidebarExpanded}
            />
            <SidebarItem
              icon="notifications"
              label="Notifications"
              active={location.pathname === '/notifications'}
              onClick={() => navigate('/notifications')}
              ariaLabel="Navigate to Notifications"
              showLabel={isSidebarExpanded}
            />
            <SidebarItem
              icon="settings"
              label="Settings"
              active={location.pathname === '/settings'}
              onClick={() => navigate('/settings')}
              ariaLabel="Navigate to Settings"
              showLabel={isSidebarExpanded}
            />
          </nav>

            {isAdmin && (
              <div className="p-4 border-t border-border-light dark:border-border-dark">
                <SidebarItem
                  icon="admin_panel_settings"
                  label="Admin Panel"
                  active={location.pathname === '/admin'}
                  onClick={() => navigate('/admin')}
                  ariaLabel="Navigate to Admin Panel"
                  showLabel={isSidebarExpanded}
                />
              </div>
            )}
            <div className="p-4 border-t border-border-light dark:border-border-dark">
              <button
                id="tutorial-new-plan"
                onClick={() => { triggerHaptic('medium'); navigate('/create-plan'); }}
                className={`flex items-center justify-center bg-primary hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  isSidebarExpanded ? 'w-full gap-2 py-3 px-4' : 'w-12 h-12 mx-auto'
                }`}
                aria-label="Create New AI Learning Plan"
              >
                  <Icon name="auto_awesome" />
                {isSidebarExpanded && <span>New Plan</span>}
              </button>
            </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main 
        id="main-content" 
        className={`flex-1 flex flex-col min-h-screen relative transition-all duration-300 ease-in-out ${
          showSidebar ? (isSidebarExpanded ? 'md:ml-64' : 'md:ml-20') : ''
        }`}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar scroll-smooth">
          <div className={`mx-auto w-full ${isAuthPage || location.pathname.startsWith('/rooms/') ? '' : (isDiary ? 'pb-32 md:pb-8' : 'max-w-5xl pb-32 md:pb-8')}`}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    variants={pageVariants}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                >
                    <Suspense fallback={<PageLoader />}>
                    <Routes location={location}>
                        <Route path="/" element={<Login />} />
                        <Route path="/signup" element={<CreateAccount />} />

                        {/* Protected Routes */}
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
                        <Route path="/plan-details" element={<ProtectedRoute><PlanDetails /></ProtectedRoute>} />
                        <Route path="/learning-workspace" element={<ProtectedRoute><LearningWorkspace /></ProtectedRoute>} />
                        <Route path="/add-task" element={<ProtectedRoute><AddTask /></ProtectedRoute>} />
                        <Route path="/edit-task" element={<ProtectedRoute><EditTask /></ProtectedRoute>} />
                        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                        <Route path="/notification-settings" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/diary" element={<ProtectedRoute><LearningDiary /></ProtectedRoute>} />
                        <Route path="/create-plan" element={<ProtectedRoute><CreatePlan /></ProtectedRoute>} />
                        <Route path="/templates" element={<ProtectedRoute><TemplateGallery /></ProtectedRoute>} />
                        <Route path="/shared/:slug" element={<SharedPlanView />} />
                        <Route path="/help-center" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
                        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
                        <Route path="/archived" element={<ProtectedRoute><ArchivedPlans /></ProtectedRoute>} />
                        <Route path="/rooms" element={<ProtectedRoute><StudyRooms /></ProtectedRoute>} />
                        <Route path="/rooms/:id" element={<ProtectedRoute><RoomView /></ProtectedRoute>} />
                        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                    </Routes>
                    </Suspense>
                </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* ChatBot (Conditional Rendering) */}
        {['/dashboard', '/diary', '/learning-workspace', '/plan-details'].includes(location.pathname) && (
          <Suspense fallback={null}>
            <button
              id="tutorial-chatbot"
              onClick={() => { triggerHaptic('light'); setIsChatOpen(true); }}
              className={`fixed right-6 h-14 w-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110 active:scale-90 ${showMobileNav ? 'bottom-[6.5rem]' : 'bottom-6'} md:bottom-6`}
              aria-label="Open AI Learning Assistant"
            >
              <Icon name="psychology" className="text-3xl" />
            </button>
            <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          </Suspense>
        )}

        {/* Mobile Bottom Navigation */}
        {showMobileNav && (
          <nav className="md:hidden h-20 w-full bg-white dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex justify-around items-center px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] fixed bottom-0 left-0" aria-label="Mobile Navigation">
            <NavItem
              icon="home"
              label="Home"
              active={location.pathname === '/dashboard'}
              onClick={() => navigate('/dashboard')}
              ariaLabel="Home"
            />
            <NavItem
              id="tutorial-progress-mobile"
              icon="bar_chart"
              label="Progress"
              active={location.pathname === '/progress'}
              onClick={() => navigate('/progress')}
              ariaLabel="Progress"
            />

            <div className="relative w-14 flex justify-center pointer-events-none shrink-0">
              <button
                id="tutorial-new-plan-mobile"
                onClick={() => { triggerHaptic('medium'); navigate('/create-plan'); }}
                className="bg-primary hover:bg-primary/90 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95 relative -top-5 pointer-events-auto shrink-0 aspect-square"
                aria-label="Create New Plan"
              >
                <Icon name="add" className="text-3xl" />
              </button>
            </div>

            <NavItem
              icon="menu_book"
              label="Diary"
              active={location.pathname === '/diary'}
              onClick={() => navigate('/diary')}
              ariaLabel="Learning Diary"
            />
            <NavItem
              icon="settings"
              label="Settings"
              active={location.pathname === '/settings'}
              onClick={() => navigate('/settings')}
              ariaLabel="Settings"
            />
          </nav>
        )}
      </main>
    </div>
  );
};

interface SidebarItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  id?: string;
  ariaLabel: string;
  showLabel?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, id, ariaLabel, showLabel = true }) => (
  <button
    id={id}
    onClick={() => { triggerHaptic('light'); onClick(); }}
    aria-label={ariaLabel}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        showLabel ? '' : 'justify-center'
    } ${active
        ? 'bg-primary/10 text-primary font-bold'
        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary-light dark:hover:text-text-primary-dark'
      }`}
  >
    <Icon name={icon} className={`text-2xl min-w-[24px] ${active ? 'filled' : ''}`} />
    {showLabel && <span className="text-sm truncate">{label}</span>}
  </button>
);

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  id?: string;
  ariaLabel: string;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, id, ariaLabel }) => (
  <button
    id={id}
    onClick={() => { triggerHaptic('light'); onClick(); }}
    aria-label={ariaLabel}
    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${active ? 'text-primary' : 'text-text-secondary-light dark:text-text-secondary-dark hover:text-primary/70'
      }`}
  >
    <Icon name={icon} className={`text-2xl ${active ? 'filled' : ''}`} />
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);

const App: React.FC = () => {
  return (
    <ConnectionProvider>
      <AuthProvider>
        <DataProvider>
          <TutorialProvider>
            <ToastProvider>
              <ErrorBoundary>
                <StorageWarningToast />
                <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AppContent />
                </HashRouter>
              </ErrorBoundary>
            </ToastProvider>
          </TutorialProvider>
        </DataProvider>
      </AuthProvider>
    </ConnectionProvider>
  );
};

export default App;