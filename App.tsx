
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
  const [isFlipping, setIsFlipping] = useState(false);
  
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

  const { updateView, systemConfig, updateSystemConfig } = useAppMemory();
  const { setTheme } = useTheme();
  
  useModeThemeSync(currentView, systemConfig.autoTheme, setTheme);

  const [personalization, setPersonalization] = useState<PersonalizationConfig>(() => {
    const saved = localStorage.getItem('zara_personalization');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { nickname: '', occupation: '', aboutYou: '', customInstructions: '', fontSize: 'medium', responseStyle: 'concise' };
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
    // Trigger flip animation on reload
    triggerFlip();
  }, []);

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

  const triggerFlip = () => {
    setIsFlipping(true);
    setTimeout(() => setIsFlipping(false), 1600); // 0.8s * 2
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, attachments: Attachment[]) => {
    abortRef.current = false;
    shouldAutoScrollRef.current = true;
    const isOnline = navigator.onLine;

    const newUserMsg: Message = {
      id: crypto.randomUUID(),
      role: Role.USER,
      text: text,
      attachments: attachments,
      timestamp: Date.now(),
    };

    const msgsWithUser = [...messages, newUserMsg];
    setMessages(msgsWithUser);
    setIsLoading(true);

    const botMsgId = crypto.randomUUID();
    
    if (!isOnline) {
       const offlineResponse = await OfflineService.processMessage(text, personalization, handleViewChange);
       const offlineBotMsg: Message = { id: botMsgId, role: Role.MODEL, text: offlineResponse, timestamp: Date.now(), isOffline: true };
       const finalMessages = [...msgsWithUser, offlineBotMsg];
       setMessages(finalMessages);
       setIsLoading(false);
       if (!currentSessionId) createSession(finalMessages);
       else updateSession(currentSessionId, finalMessages);
       return;
    }

    const initialBotMsg: Message = { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true };
    setMessages(prev => [...prev, initialBotMsg]);

    try {
      let activePersona: Persona | undefined;
      const { text: finalText, sources } = await sendMessageToGeminiStream(
        msgsWithUser, text, attachments, chatConfig, personalization,
        (fullAccumulatedText) => {
             if (abortRef.current) return;
             setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: fullAccumulatedText } : m));
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
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false, isError: true, text: error.message || "An unexpected error occurred." } : m));
    } finally {
      setIsLoading(false);
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
    if (view === 'settings') { setSettingsOpen(true); return; }
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
    if (currentView !== 'chat') {
       switch (currentView) {
          case 'student': return <StudentMode />;
          case 'code': return <CodeMode />;
          case 'workspace': return <ImageMode />;
          case 'voice': return <VoiceMode />;
          case 'live': return <LiveMode personalization={personalization} />;
          case 'exam': return <ExamMode />;
          case 'flashcard': return <FlashcardMode />;
          case 'planner': return <StudyPlanner />;
          case 'notes': return <NotesVault onStartChat={(ctx) => { handleViewChange('chat'); handleSendMessage(`Context: ${ctx}`, []); }} />;
          case 'analytics': return <AnalyticsDashboard />;
          case 'builder': return <AppBuilderMode />;
          case 'about': return <AboutPage />;
          default: return null;
       }
    }

    return (
      <div className="flex flex-col h-full w-full relative bg-black">
         <ChatControls 
            config={chatConfig} 
            setConfig={setChatConfig} 
            currentSession={sessions.find(s => s.id === currentSessionId) || null}
         />
         <div className="flex-1 overflow-y-auto px-4 py-2 scroll-smooth custom-scrollbar max-w-2xl mx-auto w-full relative">
            {messages.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center pt-4 pb-20">
                  {/* Glowing Logo Squircle - Flip animation on click/reload */}
                  <div 
                    onClick={triggerFlip}
                    className={`w-20 h-20 md:w-24 md:h-24 bg-[#0a0a0a] rounded-[24px] md:rounded-[32px] border border-violet-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.15)] mb-8 cursor-pointer ${isFlipping ? 'animate-flip-twice' : 'animate-float'}`}
                  >
                     <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-violet-400 drop-shadow-[0_0_10px_rgba(139,92,246,0.8)]" strokeWidth={1.5} />
                  </div>
                  
                  <div className="text-center mb-8">
                    <p className="text-gray-400 font-medium text-lg md:text-xl mb-0.5 tracking-tight">Hello, I'm</p>
                    <h1 className="text-4xl md:text-5xl font-black mb-4">
                      <span className="bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]">Zara AI</span>
                    </h1>
                    <p className="text-gray-500 font-medium text-base md:text-lg">What would you like to do?</p>
                  </div>
                  
                  <div className="space-y-4 w-full max-w-sm px-4">
                     <button 
                        onClick={() => handleViewChange('builder')} 
                        className="w-full bg-[#0a0a0a] border border-white/5 hover:border-violet-500/30 p-5 md:p-6 rounded-[20px] md:rounded-[24px] text-left transition-all hover:bg-[#121212] flex items-center gap-5 group shadow-lg"
                     >
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                           <Hammer className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="font-bold text-base md:text-lg text-white">App Builder</h3>
                           <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.1em] mt-0.5">Full Stack</p>
                        </div>
                     </button>

                     <button 
                        onClick={() => handleSendMessage("I'm feeling a bit overwhelmed, can we talk?", [])} 
                        className="w-full bg-[#0a0a0a] border border-white/5 hover:border-fuchsia-500/30 p-5 md:p-6 rounded-[20px] md:rounded-[24px] text-left transition-all hover:bg-[#121212] flex items-center gap-5 group shadow-lg"
                     >
                        <div className="w-12 h-12 bg-pink-500/10 rounded-xl flex items-center justify-center text-pink-400 group-hover:scale-105 transition-transform">
                           <Heart className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="font-bold text-base md:text-lg text-white">Emotional Support</h3>
                           <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.1em] mt-0.5">Well-Being</p>
                        </div>
                     </button>
                  </div>
               </div>
            ) : (
               <div className="pb-24 pt-2">
                  {messages.map(msg => (
                     <MessageItem key={msg.id} message={msg} />
                  ))}
               </div>
            )}
            <div ref={messagesEndRef} />
         </div>
         
         {messages.length > 0 && (
            <button 
               onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
               className="fixed bottom-28 left-1/2 -translate-x-1/2 md:translate-x-[300px] p-3 bg-violet-950/40 backdrop-blur-xl border border-violet-500/20 rounded-full text-violet-400 hover:text-white shadow-2xl transition-all active:scale-90 z-30"
            >
               <ArrowDown className="w-5 h-5" />
            </button>
         )}

         <div className="max-w-2xl mx-auto w-full z-20 pb-2 mt-auto">
            <InputArea 
                onSendMessage={handleSendMessage}
                onStop={handleStop}
                isLoading={isLoading}
                disabled={false}
                editMessage={null}
                onCancelEdit={() => {}}
                viewMode="chat"
            />
         </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-black text-white overflow-hidden font-sans">
      <Sidebar 
        currentView={currentView}
        onViewChange={handleViewChange}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={(id) => { loadSession(id); handleViewChange('chat'); }}
        onRenameSession={renameSession}
        onDeleteSession={deleteSession}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />

      <div className="flex-1 flex flex-col h-full relative w-full overflow-hidden">
        <div className="flex items-center px-4 h-14 bg-black/80 backdrop-blur-md absolute top-0 left-0 right-0 z-30 md:hidden border-b border-white/5">
           <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-1 text-gray-400 hover:text-white">
               <Menu className="w-6 h-6" />
           </button>
           <h1 className="ml-2 font-bold text-sm tracking-tight">Zara AI</h1>
        </div>

        <main className="flex-1 overflow-hidden relative flex flex-col h-full w-full">
          {renderCurrentView()}
        </main>
      </div>
      
      <SettingsModal 
         isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)}
         personalization={personalization} setPersonalization={setPersonalization}
         systemConfig={systemConfig} setSystemConfig={updateSystemConfig}
         chatConfig={chatConfig} setChatConfig={setChatConfig}
      />
      <CommandPalette isOpen={isCmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} onAction={handleCommand} />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

export default App;
