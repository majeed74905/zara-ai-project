
import React, { useState, useRef, useEffect } from 'react';
import { ViewMode, Message, Role, Attachment, ChatConfig, PersonalizationConfig, Persona } from './types';
import { Sidebar } from './components/Sidebar';
import { MessageItem } from './components/MessageItem';
import { InputArea } from './components/InputArea';
import { StudentMode } from './components/StudentMode';
import { CodeMode } from './components/CodeMode';
import { ImageMode } from './components/ImageMode';
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
import { AboutPage } from './components/AboutPage';
import { ChatControls } from './components/ChatControls';
import { useChatSessions } from './hooks/useChatSessions';
import { useAppMemory } from './hooks/useAppMemory';
import { useModeThemeSync } from './hooks/useModeThemeSync';
import { useTheme } from './theme/ThemeContext';
import { sendMessageToGeminiStream } from './services/gemini';
import { OfflineService } from './services/offlineService';
import { Sparkles, Hammer, Heart, Menu, ArrowDown } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('chat');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isCmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);

  const abortRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  
  useModeThemeSync(currentView, systemConfig.autoTheme, setTheme);

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
      nickname: '',
      occupation: '',
      aboutYou: '',
      customInstructions: '',
      fontSize: 'medium',
      responseStyle: 'concise' 
    };
  });

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

  useEffect(() => {
    if (lastView && lastView !== 'settings') {
      setCurrentView(lastView);
    }
  }, [lastView]);

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
      if (!currentSessionId) createSession(finalMessages);
      else updateSession(currentSessionId, finalMessages);
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
             <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth custom-scrollbar max-w-2xl mx-auto w-full pt-6 relative">
                {messages.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center animate-fade-in pt-12 pb-24 px-4">
                      {/* Brand Icon - Squircle Style */}
                      <div className="w-24 h-24 bg-[#0c0c0e] rounded-[32px] border border-white/5 flex items-center justify-center shadow-2xl mb-12 relative group">
                         <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full scale-75 group-hover:scale-90 transition-transform duration-700" />
                         <Sparkles className="w-12 h-12 text-primary relative z-10" strokeWidth={1.5} />
                         <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full blur-[2px]" />
                         <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary/50 rounded-full blur-[1px]" />
                      </div>
                      
                      <div className="text-center mb-12">
                        <p className="text-gray-400 font-medium text-lg mb-2">Hello, I'm</p>
                        <h1 className="text-5xl font-black text-white tracking-tight mb-4">Zara AI</h1>
                        <p className="text-gray-500 font-medium text-lg">What would you like to do?</p>
                      </div>
                      
                      <div className="space-y-4 w-full max-w-sm">
                         {/* Compact Horizontal Cards */}
                         <button 
                            onClick={() => handleViewChange('builder')} 
                            className="w-full bg-black border border-white/10 hover:border-blue-500/30 p-5 rounded-[20px] text-left transition-all hover:bg-[#09090b] flex items-center gap-5 group"
                         >
                            <div className="w-12 h-12 bg-[#121214] rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-105 transition-transform border border-white/5">
                               <Hammer className="w-5 h-5" />
                            </div>
                            <div>
                               <h3 className="font-bold text-base text-white">App Builder</h3>
                               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-0.5">Full Stack</p>
                            </div>
                         </button>

                         <button 
                            onClick={() => handleSendMessage("I need emotional support and wellness guidance.", [])} 
                            className="w-full bg-black border border-white/10 hover:border-pink-500/30 p-5 rounded-[20px] text-left transition-all hover:bg-[#09090b] flex items-center gap-5 group"
                         >
                            <div className="w-12 h-12 bg-[#121214] rounded-xl flex items-center justify-center text-pink-500 group-hover:scale-105 transition-transform border border-white/5">
                               <Heart className="w-5 h-5" />
                            </div>
                            <div>
                               <h3 className="font-bold text-base text-white">Emotional Support</h3>
                               <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-0.5">Well-Being</p>
                            </div>
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
             
             {/* Floating Scroll Bottom Button */}
             {messages.length > 0 && (
                <button 
                   onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                   className="absolute bottom-32 right-8 p-3 bg-black/80 backdrop-blur border border-white/10 rounded-full text-gray-400 hover:text-white shadow-xl transition-all active:scale-95 md:right-1/2 md:translate-x-[340px]"
                >
                   <ArrowDown className="w-5 h-5" />
                </button>
             )}

             <div className="max-w-2xl mx-auto w-full z-20 pb-4 mt-auto">
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
        <div className="flex items-center px-4 h-16 bg-background/50 backdrop-blur-md absolute top-0 left-0 right-0 z-30 md:hidden border-b border-white/5">
           <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-text-sub hover:text-text transition-colors">
               <Menu className="w-6 h-6" />
           </button>
           <h1 className="ml-3 font-bold text-sm text-text">Zara AI</h1>
        </div>

        <main className="flex-1 overflow-hidden relative flex flex-col h-full w-full">
          {renderCurrentView()}
        </main>
      </div>
      
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
    </div>
  );
}

export default App;
