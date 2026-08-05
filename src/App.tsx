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

function MainApp() {
  const { user, isLoading } = useAuth();
  const { activeChatId, selectChat } = useChat();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
      <div className={`flex-1 h-full ${activeChatId ? 'flex' : 'hidden md:flex'}`}>
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
        />
      )}

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
