
import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, Message, Role, Attachment, ChatConfig, PersonalizationConfig, Persona } from './types';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { InputArea } from './components/InputArea';
import { StudentMode } from './components/StudentMode';
import { CodeMode } from './components/CodeMode';
import { ImageMode } from './components/ImageMode';
import { VideoMode } from './components/VideoMode';
import { VoiceMode } from './components/VoiceMode';
import { LiveMode } from './components/LiveMode';
import { ExamMode } from './components/ExamMode';
import { FlashcardMode } from './components/FlashcardMode';
import { StudyPlanner } from './components/StudyPlanner';
import { NotesVault } from './components/NotesVault';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsModal } from './components/SettingsModal';
import { CommandPalette } from './components/CommandPalette';
import { FeedbackModal } from './components/FeedbackModal';
import { AppBuilderMode } from './components/AppBuilderMode';
import { HomeDashboard } from './components/features/HomeDashboard';
import { MemoryVault } from './components/features/MemoryVault';
import { AboutPage } from './components/AboutPage';
import { ChatControls } from './components/ChatControls';
import { useChatSessions } from './hooks/useChatSessions';
import { useAppMemory } from './hooks/useAppMemory';
import { useModeThemeSync } from './hooks/useModeThemeSync';
import { useTheme } from './theme/ThemeContext';
import { sendMessageToGeminiStream } from './services/gemini';
import { OfflineService } from './services/offlineService';
import { Sparkles, Hammer, Heart, Menu } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  // Modals
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isCmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);

  const abortRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hooks
  const { 
    sessions, 
    currentSessionId, 
    createSession, 
    updateSession, 
    deleteSession, 
    renameSession, 
    loadSession, 
    clearCurrentSession 
  } = useChatSessions();

  const { lastView, updateView, systemConfig, updateSystemConfig } = useAppMemory();
  const { setTheme } = useTheme();
  
  // Adaptive Theme Mode
  useModeThemeSync(currentView, systemConfig.autoTheme, setTheme);

  // State initialization with localStorage persistence
  const [personalization, setPersonalization] = useState<PersonalizationConfig>(() => {
    const saved = localStorage.getItem('zara_personalization');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse personalization", e);
      }
    }
    return {
      nickname: '', // Default is empty until user changes it
      occupation: '', // Default is empty until user changes it
      aboutYou: '',
      customInstructions: '',
      fontSize: 'medium',
      responseStyle: 'concise' 
    };
  });

  // Save personalization whenever it changes
  useEffect(() => {
    localStorage.setItem('zara_personalization', JSON.stringify(personalization));
  }, [personalization]);

  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    model: 'gemini-3-flash-preview',
    useThinking: false,
    useGrounding: true,
    interactionMode: 'standard',
    confidenceIndicator: false,
    learningGap: true, 
    moodDetection: true
  });

  // Ensure initial view matches last view
  useEffect(() => {
    if (lastView && lastView !== 'settings') {
      setCurrentView(lastView);
    }
  }, [lastView]);

  // Load session messages when selected
  useEffect(() => {
    if (currentSessionId) {
      const loadedMsgs = loadSession(currentSessionId);
      setMessages(loadedMsgs || []);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const scrollToBottom = () => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    abortRef.current = false;
    shouldAutoScrollRef.current = true;
    const isOnline = navigator.onLine;

    let historyToUse = messages;

    if (editingMessage) {
      const editIndex = messages.findIndex(m => m.id === editingMessage.id);
      if (editIndex !== -1) {
        historyToUse = messages.slice(0, editIndex);
      }
      setEditingMessage(null);
    }

    const newUserMsg: Message = {
      id: crypto.randomUUID(),
      role: Role.USER,
      text: text,
      attachments: attachments,
      timestamp: Date.now(),
    };

    const msgsWithUser = [...historyToUse, newUserMsg];
    setMessages(msgsWithUser);
    setIsLoading(true);

    const botMsgId = crypto.randomUUID();
    
    // OFFLINE
    if (!isOnline) {
       setTimeout(async () => {
          const offlineResponse = await OfflineService.processMessage(text, personalization, handleViewChange);
          const offlineBotMsg: Message = { id: botMsgId, role: Role.MODEL, text: offlineResponse, timestamp: Date.now(), isOffline: true };
          const finalMessages = [...msgsWithUser, offlineBotMsg];
          setMessages(finalMessages);
          setIsLoading(false);
          if (!currentSessionId) createSession(finalMessages);
          else updateSession(currentSessionId, finalMessages);
       }, 600);
       return;
    }

    // ONLINE
    const initialBotMsg: Message = {
        id: botMsgId,
        role: Role.MODEL,
        text: '',
        timestamp: Date.now(),
        isStreaming: true
    };
    
    setMessages(prev => [...prev, initialBotMsg]);

    try {
      let activePersona: Persona | undefined;
      if (chatConfig.activePersonaId) {
         const stored = localStorage.getItem('zara_personas');
         if (stored) {
            const personas: Persona[] = JSON.parse(stored);
            activePersona = personas.find(p => p.id === chatConfig.activePersonaId);
         }
      }

      let bufferText = "";
      let lastUpdateTs = Date.now();
      const THROTTLE_MS = 60; 

      const { text: finalText, sources } = await sendMessageToGeminiStream(
        msgsWithUser, 
        text, 
        attachments, 
        chatConfig,
        personalization,
        (fullAccumulatedText) => {
             if (abortRef.current) return;
             
             const now = Date.now();
             bufferText = fullAccumulatedText;

             if (now - lastUpdateTs > THROTTLE_MS) {
                 setMessages(prev => prev.map(m => 
                    m.id === botMsgId ? { ...m, text: bufferText } : m
                 ));
                 lastUpdateTs = now;
             }
        },
        activePersona
      );
      
      if (abortRef.current) return;

      const finalBotMsg = { ...initialBotMsg, text: finalText, sources, isStreaming: false };
      const finalMessages = [...msgsWithUser, finalBotMsg];
      
      setMessages(finalMessages);
      
      if (!currentSessionId) {
         createSession(finalMessages);
      } else {
         updateSession(currentSessionId, finalMessages);
      }

    } catch (error: any) {
      if (abortRef.current) return;
      setMessages(prev => prev.map(m => 
        m.id === botMsgId 
           ? { ...m, isStreaming: false, isError: true, text: m.text || error.message || "An unexpected error occurred." } 
           : m
      ));
    } finally {
      if (!abortRef.current) setIsLoading(false);
    }
  };

  const handleStop = () => {
    abortRef.current = true;
    setIsLoading(false);
    setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m));
  };

  const handleNewChat = () => {
    clearCurrentSession();
    setMessages([]);
    setCurrentView('chat');
    updateView('chat');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleViewChange = (view: ViewMode) => {
    if (view === 'settings') {
      setSettingsOpen(true);
      if (window.innerWidth < 768) setSidebarOpen(false);
      return;
    }
    
    setCurrentView(view);
    updateView(view);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleCommand = (action: string, payload?: any) => {
    if (action === 'switch-mode') handleViewChange(payload);
    if (action === 'new-chat') handleNewChat();
    if (action === 'open-settings') setSettingsOpen(true);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'chat':
        return (
          <div className="flex flex-col h-full w-full relative">
             <ChatControls 
                config={chatConfig} 
                setConfig={setChatConfig} 
                currentSession={sessions.find(s => s.id === currentSessionId) || null}
             />
             <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth custom-scrollbar max-w-4xl mx-auto w-full pt-6">
                {messages.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center animate-fade-in pb-20">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)] mb-8 animate-float">
                         <Sparkles className="w-10 h-10 text-white fill-white" />
                      </div>
                      
                      <div className="text-center mb-8">
                        <h1 className="flex flex-col items-center font-bold leading-tight">
                           <span className="text-2xl text-text-sub font-medium mb-1">Hello I'm</span>
                           <span className="text-5xl md:text-6xl bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-clip-text text-transparent">Zara AI</span>
                        </h1>
                        <h2 className="text-lg text-text-sub mt-4">How can I help you today{personalization.nickname ? `, ${personalization.nickname}` : ''}?</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg px-4">
                         <button onClick={() => handleViewChange('builder')} className="group bg-surfaceHighlight hover:bg-surface border border-white/5 hover:border-blue-500/30 p-6 rounded-2xl text-left transition-all hover:shadow-xl">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                               <Hammer className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-text">App Builder</h3>
                            <p className="text-xs text-text-sub mt-1 uppercase tracking-widest font-bold">Code Architect</p>
                         </button>
                         <button onClick={() => handleSendMessage("I need to focus on wellness today.", [])} className="group bg-surfaceHighlight hover:bg-surface border border-white/5 hover:border-pink-500/30 p-6 rounded-2xl text-left transition-all hover:shadow-xl">
                            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 text-pink-500 group-hover:scale-110 transition-transform">
                               <Hammer className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-text">Wellness Check</h3>
                            <p className="text-xs text-text-sub mt-1 uppercase tracking-widest font-bold">Mental Well-being</p>
                         </button>
                      </div>
                   </div>
                ) : (
                   messages.map(msg => (
                      <MessageItem key={msg.id} message={msg} onEdit={setEditingMessage} />
                   ))
                )}
                <div ref={messagesEndRef} />
             </div>
             <div className="max-w-4xl mx-auto w-full z-20">
                <InputArea 
                    onSendMessage={handleSendMessage}
                    onStop={handleStop}
                    isLoading={isLoading}
                    disabled={false}
                    isOffline={!navigator.onLine}
                    editMessage={editingMessage}
                    onCancelEdit={() => setEditingMessage(null)}
                    viewMode="chat"
                />
             </div>
          </div>
        );
      case 'dashboard': return <HomeDashboard onViewChange={handleViewChange} personalization={personalization} />;
      case 'student': return <StudentMode />;
      case 'code': return <CodeMode />;
      case 'workspace': return <ImageMode />;
      case 'voice': return <VoiceMode />;
      case 'live': return <LiveMode personalization={personalization} />;
      case 'exam': return <ExamMode />;
      case 'flashcard': return <FlashcardMode />;
      case 'planner': return <StudyPlanner />;
      case 'notes': return <NotesVault onStartChat={(ctx) => { handleViewChange('chat'); handleSendMessage(`Context from notes:\n${ctx}\n\nAnalyze this.`, []); }} />;
      case 'analytics': return <AnalyticsDashboard />;
      case 'builder': return <AppBuilderMode />;
      case 'memory': return <MemoryVault />;
      case 'about': return <AboutPage />;
      default: return <div className="h-full flex items-center justify-center text-text-sub">Select a mode from the sidebar to begin.</div>;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-text overflow-hidden font-sans selection:bg-primary/20">
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={(id) => { 
            loadSession(id); 
            handleViewChange('chat');
            if(window.innerWidth < 768) setSidebarOpen(false);
        }}
        onRenameSession={renameSession}
        onDeleteSession={deleteSession}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />

      <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden bg-background">
        {/* Mobile Header */}
        <div className="flex items-center px-4 h-16 bg-background/50 backdrop-blur-md absolute top-0 left-0 right-0 z-30 md:hidden border-b border-white/5">
           <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-text-sub hover:text-text transition-colors">
               <Menu className="w-6 h-6" />
           </button>
           <h1 className="ml-3 font-bold text-sm text-text">Zara AI</h1>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden relative flex flex-col h-full w-full">
          {renderCurrentView()}
        </main>
      </div>
      
      {/* Settings Modal */}
      <SettingsModal 
         isOpen={isSettingsOpen} 
         onClose={() => setSettingsOpen(false)}
         personalization={personalization}
         setPersonalization={setPersonalization}
         systemConfig={systemConfig}
         setSystemConfig={updateSystemConfig}
         chatConfig={chatConfig}
         setChatConfig={setChatConfig}
      />

      <CommandPalette 
         isOpen={isCmdPaletteOpen} 
         onClose={() => setCmdPaletteOpen(false)}
         onAction={handleCommand}
      />

      <FeedbackModal 
         isOpen={isFeedbackOpen}
         onClose={() => setFeedbackOpen(false)}
      />

      {/* Keyboard Shortcuts Prompt */}
      <div className="fixed bottom-4 right-4 hidden lg:block opacity-30 hover:opacity-100 transition-opacity z-50">
         <div className="text-[10px] bg-surfaceHighlight/50 backdrop-blur border border-border px-2 py-1 rounded text-text-sub">
            Press <kbd className="font-mono bg-black/20 px-1 rounded">Cmd+K</kbd> for commands
         </div>
      </div>
    </div>
  );
}

export default App;
