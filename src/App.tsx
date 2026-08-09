import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ChatProvider, useChat } from './context/ChatContext.js';
import { CallProvider } from './context/CallContext.js';
import { AuthModal } from './components/auth/AuthModal.js';
import { Sidebar } from './components/sidebar/Sidebar.js';
import { ChatArea } from './components/chat/ChatArea.js';
import { NewChatModal } from './components/modals/NewChatModal.js';
import { NewGroupModal } from './components/modals/NewGroupModal.js';
import { GroupInfoModal } from './components/modals/GroupInfoModal.js';
import { SettingsModal } from './components/modals/SettingsModal.js';
import { CallOverlay } from './components/call/CallOverlay.js';
import { PinLockModal } from './components/modals/PinLockModal.js';
import { NotificationToast } from './components/common/NotificationToast.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';

function MainApp() {
  const { user, isLoading } = useAuth();
  const { activeChatId, selectChat, activeToast, dismissToast } = useChat();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(() => {
    return !!localStorage.getItem('szchat_security_pin');
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('szchat_theme') === 'dark' || true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('szchat_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('szchat_theme', 'light');
    }
  }, [isDarkMode]);

  // Handle Hardware & Browser Back Button (popstate) to go 1 step back inside app
  useEffect(() => {
    const handlePopState = () => {
      if (isNewChatOpen) {
        setIsNewChatOpen(false);
      } else if (isNewGroupOpen) {
        setIsNewGroupOpen(false);
      } else if (isGroupInfoOpen) {
        setIsGroupInfoOpen(false);
      } else if (isSettingsOpen) {
        setIsSettingsOpen(false);
      } else if (activeChatId) {
        selectChat(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isNewChatOpen, isNewGroupOpen, isGroupInfoOpen, isSettingsOpen, activeChatId, selectChat]);

  // Push history state ONCE whenever opening a chat or modal
  const hasPushedStateRef = React.useRef(false);
  useEffect(() => {
    const isAnyActive = !!(activeChatId || isNewChatOpen || isNewGroupOpen || isGroupInfoOpen || isSettingsOpen);
    if (isAnyActive && !hasPushedStateRef.current) {
      window.history.pushState({ szchat: true }, '');
      hasPushedStateRef.current = true;
    } else if (!isAnyActive) {
      hasPushedStateRef.current = false;
    }
  }, [activeChatId, isNewChatOpen, isNewGroupOpen, isGroupInfoOpen, isSettingsOpen]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-zinc-900 flex items-center justify-center text-white text-sm font-semibold">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading SzChat...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  const storedPin = localStorage.getItem('szchat_security_pin');
  if (isAppLocked && storedPin) {
    return <PinLockModal storedPin={storedPin} onUnlock={() => setIsAppLocked(false)} />;
  }

  return (
    <div className="h-[100dvh] w-full max-w-full overflow-x-hidden flex bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        onOpenNewChat={() => setIsNewChatOpen(true)}
        onOpenNewGroup={() => setIsNewGroupOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileOpen={!activeChatId}
      />

      {/* Main Chat Viewport */}
      <div className={`flex-1 h-full min-h-0 overflow-hidden ${activeChatId ? 'flex flex-col' : 'hidden md:flex flex-col'}`}>
        <ChatArea
          onBackMobile={() => selectChat(null)}
          onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
        />
      </div>

      {/* Modals */}
      {isNewChatOpen && <NewChatModal onClose={() => setIsNewChatOpen(false)} />}
      {isNewGroupOpen && <NewGroupModal onClose={() => setIsNewGroupOpen(false)} />}
      {isGroupInfoOpen && <GroupInfoModal onClose={() => setIsGroupInfoOpen(false)} />}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      )}
      {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} />}

      {/* Floating Real-Time Notification Toast */}
      <NotificationToast
        toast={activeToast}
        onSelect={(chatId) => selectChat(chatId)}
        onDismiss={dismissToast}
      />

      {/* WebRTC Audio Call Banner & Overlay */}
      <CallOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <CallProvider>
          <MainApp />
        </CallProvider>
      </ChatProvider>
    </AuthProvider>
  );
}
