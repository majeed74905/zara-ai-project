
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
import { Sparkles, Hammer, Heart } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
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
  useModeThemeSync(currentView, systemConfig.autoTheme, setTheme);

  // State initialization
  const [personalization, setPersonalization] = useState<PersonalizationConfig>({
    nickname: 'Guest',
    occupation: 'Student',
    aboutYou: '',
    customInstructions: '',
    fontSize: 'medium',
    responseStyle: 'balanced'
  });

  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    model: 'gemini-2.5-flash',
    useThinking: false,
    useGrounding: true,
    interactionMode: 'standard',
    // Default cognitive features
    confidenceIndicator: false,
    learningGap: true, 
    moodDetection: true
  });

  // Load initial view - defaulting to chat/dashboard flow
  useEffect(() => {
    // Override lastView to always start on chat for this new UI flow
    setCurrentView('chat'); 
  }, []);

  // Load session messages when selected
  useEffect(() => {
    if (currentSessionId) {
      setMessages(loadSession(currentSessionId));
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
      const THROTTLE_MS = 80; 

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
    createSession([]);
    setMessages([]);
    setCurrentView('chat');
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    updateView(view);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleCommand = (action: string, payload?: any) => {
    if (action === 'switch-mode') handleViewChange(payload);
    if (action === 'new-chat') handleNewChat();
    if (action === 'open-settings') setSettingsOpen(true);
  };

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden font-sans selection:bg-primary/20">
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
            if(window.innerWidth < 768) setSidebarOpen(false);
        }}
        onRenameSession={renameSession}
        onDeleteSession={deleteSession}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />

      <div className="flex-1 flex flex-col h-full relative w-full">
        {/* Mobile Sidebar Toggle (Floating/Hidden if ChatControls has header) 
            We now rely on ChatControls or Sidebar gesture on mobile mostly, 
            but keeping a trigger area is good practice. 
        */}
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {currentView === 'chat' && (
            <div className="flex flex-col h-full w-full relative">
               
               {/* New Top Bar */}
               <div className="flex items-center justify-between px-4 h-16 bg-transparent absolute top-0 left-0 right-0 z-20 pointer-events-none">
                  <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-text-sub pointer-events-auto md:hidden">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                  </button>
               </div>

               <ChatControls config={chatConfig} setConfig={setChatConfig} />

               <div className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth custom-scrollbar max-w-4xl mx-auto w-full pt-6">
                  {messages.length === 0 ? (
                     <div className="h-full flex flex-col items-center justify-center animate-fade-in pb-20">
                        {/* Greeting Screen */}
                        <div className="w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.3)] mb-8 animate-float">
                           <Sparkles className="w-10 h-10 text-white fill-white" />
                        </div>
                        
                        <h2 className="text-xl text-text-sub mb-1">Hello, {personalization.nickname}</h2>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-500 bg-clip-text text-transparent mb-4">
                           Zara AI
                        </h1>
                        <p className="text-text-sub mb-12">What would you like to do?</p>

                        {/* Quick Action Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
                           <button 
                             onClick={() => handleViewChange('builder')}
                             className="group bg-[#18181b] hover:bg-[#202023] border border-white/5 hover:border-blue-500/30 p-6 rounded-2xl text-left transition-all hover:shadow-xl hover:shadow-blue-500/10"
                           >
                              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500 group-hover:scale-110 transition-transform">
                                 <Hammer className="w-5 h-5" />
                              </div>
                              <h3 className="font-bold text-gray-200">App Builder</h3>
                              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">Full Stack</p>
                           </button>

                           <button 
                             onClick={() => {
                                handleSendMessage("I need emotional support. Can we talk?", []);
                             }}
                             className="group bg-[#18181b] hover:bg-[#202023] border border-white/5 hover:border-pink-500/30 p-6 rounded-2xl text-left transition-all hover:shadow-xl hover:shadow-pink-500/10"
                           >
                              <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center mb-4 text-pink-500 group-hover:scale-110 transition-transform">
                                 <Heart className="w-5 h-5" />
                              </div>
                              <h3 className="font-bold text-gray-200">Emotional Support</h3>
                              <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">Well-being</p>
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
          )}

          {currentView === 'dashboard' && <HomeDashboard onViewChange={handleViewChange} />}
          {currentView === 'student' && <StudentMode />}
          {currentView === 'code' && <CodeMode />}
          {currentView === 'workspace' && <ImageMode />}
          {currentView === 'voice' && <VoiceMode />}
          {currentView === 'live' && <LiveMode personalization={personalization} />}
          {currentView === 'exam' && <ExamMode />}
          {currentView === 'flashcard' && <FlashcardMode />}
          {currentView === 'planner' && <StudyPlanner />}
          {currentView === 'notes' && <NotesVault onStartChat={(ctx) => { handleViewChange('chat'); handleSendMessage(`Context from notes:\n${ctx}\n\nAnalyze this.`, []); }} />}
          {currentView === 'analytics' && <AnalyticsDashboard />}
          {currentView === 'builder' && <AppBuilderMode />}
          {currentView === 'memory' && <MemoryVault />}
          {currentView === 'about' && <AboutPage />}
          
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
        </div>
      </div>
      
      {/* Keyboard Shortcuts */}
      <div className="fixed bottom-4 right-4 hidden md:block opacity-50 hover:opacity-100 transition-opacity z-50">
         <div className="text-[10px] bg-surface/50 backdrop-blur border border-border px-2 py-1 rounded text-text-sub">
            Press <kbd className="font-mono bg-black/20 px-1 rounded">Cmd+K</kbd> for commands
         </div>
      </div>
    </div>
  );
}

export default App;
