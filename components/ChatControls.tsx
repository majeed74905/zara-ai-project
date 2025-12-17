
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MessageSquare, GraduationCap, Code2, Heart, Scale, Zap, Cpu, Leaf, Check, Settings2, X, Shield, Brain, Sparkles, Activity, AlertCircle, Eye, EyeOff, Search, FileText, RefreshCw, Layers, Gauge, Download, FileType, FileJson, FileOutput, Share } from 'lucide-react';
import { ChatConfig, ChatSession } from '../types';
import { exportChatToMarkdown, exportChatToText, exportChatToPDF } from '../utils/exportUtils';

interface ChatControlsProps {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  currentSession: ChatSession | null;
}

type ZaraPreset = 'fast' | 'eco' | 'high-iq';

export const ChatControls: React.FC<ChatControlsProps> = ({ config, setConfig, currentSession }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMenu, setActiveMenu] = useState<'model' | 'persona' | 'export' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCurrentPreset = (): ZaraPreset => {
    if (config.useThinking) return 'high-iq';
    if (config.model.includes('lite')) return 'eco';
    return 'fast';
  };

  const currentPreset = getCurrentPreset();

  const applyModel = (preset: ZaraPreset) => {
    switch (preset) {
      case 'fast':
        setConfig(prev => ({ ...prev, model: 'gemini-3-flash-preview', useThinking: false }));
        break;
      case 'eco':
        setConfig(prev => ({ ...prev, model: 'gemini-flash-lite-latest', useThinking: false }));
        break;
      case 'high-iq':
        setConfig(prev => ({ ...prev, model: 'gemini-3-pro-preview', useThinking: true }));
        break;
    }
    setActiveMenu(null);
  };

  const toggleFeature = (key: keyof ChatConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getModeInfo = (mode: string) => {
    switch (mode) {
      case 'teacher': return { label: 'Teacher', icon: GraduationCap };
      case 'developer': return { label: 'Developer', icon: Code2 };
      case 'friend': return { label: 'Friend', icon: Heart };
      case 'examiner': return { label: 'Examiner', icon: Scale };
      default: return { label: 'Standard', icon: MessageSquare };
    }
  };

  const currentModeInfo = getModeInfo(config.interactionMode);
  const ModeIcon = currentModeInfo.icon;

  const FeatureToggle = ({ id, label, icon: Icon, color }: any) => (
    <button 
      onClick={() => toggleFeature(id)} 
      className={`px-3 py-2.5 text-left text-xs font-medium flex items-center justify-between rounded-xl border transition-all ${
        config[id as keyof ChatConfig] 
          ? `bg-${color}-500/10 text-${color}-500 border-${color}-500/20` 
          : 'bg-surfaceHighlight/30 hover:bg-surface text-text-sub hover:text-text border-transparent'
      }`}
    >
      <span className="flex items-center gap-2.5"><Icon className="w-4 h-4" /> {label}</span>
      {config[id as keyof ChatConfig] && <Check className="w-3.5 h-3.5" />}
    </button>
  );

  const activeFeatureCount = Object.entries(config).filter(([k, v]) => 
    typeof v === 'boolean' && v === true && !['useThinking'].includes(k)
  ).length;

  const handleExport = (format: 'pdf' | 'md' | 'txt') => {
    if (!currentSession) return;
    switch (format) {
      case 'pdf': exportChatToPDF(currentSession); break;
      case 'md': exportChatToMarkdown(currentSession); break;
      case 'txt': exportChatToText(currentSession); break;
    }
    setActiveMenu(null);
  };

  return (
    <div className="w-full bg-background/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30" ref={menuRef}>
       <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
              {/* MODEL SELECTOR */}
              <div className="relative">
                 <button 
                   onClick={() => setActiveMenu(activeMenu === 'model' ? null : 'model')}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHighlight/50 hover:bg-surface border border-white/5 text-xs font-bold text-text"
                 >
                    <span className="uppercase tracking-wider opacity-60">Model:</span>
                    <span>{currentPreset === 'fast' ? 'Zara Fast' : currentPreset === 'eco' ? 'Zara Lite' : 'Zara Pro'}</span>
                    <ChevronDown className="w-3 h-3 text-text-sub" />
                 </button>

                 {activeMenu === 'model' && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 p-1">
                       {[
                         { id: 'fast', label: 'Zara Fast', desc: 'Balanced & Quick', icon: Zap },
                         { id: 'high-iq', label: 'Zara Pro', desc: 'Complex Reasoning', icon: Cpu },
                         { id: 'eco', label: 'Zara Lite', desc: 'Energy Efficient', icon: Leaf }
                       ].map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => applyModel(m.id as any)}
                            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 group"
                          >
                             <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-gray-200">{m.label}</span>
                                <span className="text-[10px] text-gray-500">{m.desc}</span>
                             </div>
                             {currentPreset === m.id && <Check className="w-4 h-4 text-primary" />}
                          </button>
                       ))}
                    </div>
                 )}
              </div>

              {/* PERSONA SELECTOR */}
              <div className="relative">
                 <button 
                   onClick={() => setActiveMenu(activeMenu === 'persona' ? null : 'persona')}
                   className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surfaceHighlight/50 hover:bg-surface border border-white/5 text-xs font-bold text-text"
                 >
                    <ModeIcon className="w-3.5 h-3.5 text-primary" />
                    <span>{currentModeInfo.label}</span>
                    <ChevronDown className="w-3 h-3 text-text-sub" />
                 </button>

                 {activeMenu === 'persona' && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-1 z-50">
                       {(['standard', 'teacher', 'developer', 'friend', 'examiner'] as const).map(mode => {
                           const info = getModeInfo(mode);
                           const Icon = info.icon;
                           return (
                               <button 
                                 key={mode}
                                 onClick={() => { setConfig(prev => ({ ...prev, interactionMode: mode })); setActiveMenu(null); }}
                                 className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-white/5 text-left"
                               >
                                  <div className="flex items-center gap-2.5">
                                    <Icon className="w-3.5 h-3.5 text-text-sub" />
                                    <span className="text-xs font-bold text-gray-200">{info.label}</span>
                                  </div>
                                  {config.interactionMode === mode && <Check className="w-3.5 h-3.5 text-primary" />}
                               </button>
                           );
                       })}
                    </div>
                 )}
              </div>
          </div>

          <div className="flex items-center gap-2">
            {/* MODULES BUTTON - NOW ON THE LEFT */}
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${
                isExpanded 
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                  : activeFeatureCount > 0
                      ? 'bg-surfaceHighlight text-primary border-primary/30'
                      : 'bg-transparent text-text-sub border-transparent hover:bg-surfaceHighlight'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">Modules</span>
              {activeFeatureCount > 0 && <span className="ml-1 opacity-70">[{activeFeatureCount}]</span>}
            </button>

            <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

            {/* EXPORT BUTTON - NOW ON THE RIGHT */}
            <div className="relative">
              <button 
                onClick={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                disabled={!currentSession || currentSession.messages.length === 0}
                className={`p-2 rounded-lg transition-colors ${
                  activeMenu === 'export'
                    ? 'bg-accent/20 text-accent'
                    : (!currentSession || currentSession.messages.length === 0)
                      ? 'text-text-sub/30 cursor-not-allowed'
                      : 'text-text-sub hover:text-text hover:bg-surfaceHighlight'
                }`}
                title="Export Conversation"
              >
                <Share className="w-5 h-5" />
              </button>

              {activeMenu === 'export' && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-1 z-50 animate-fade-in">
                  <div className="px-3 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-white/5 mb-1">
                    Export Format
                  </div>
                  {[
                    { id: 'pdf', label: 'PDF Document', icon: FileType, desc: 'Print friendly' },
                    { id: 'md', label: 'Markdown File', icon: FileText, desc: 'Best for notes' },
                    { id: 'txt', label: 'Plain Text', icon: FileOutput, desc: 'Simple archive' }
                  ].map((f) => (
                    <button 
                      key={f.id}
                      onClick={() => handleExport(f.id as any)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left group transition-colors"
                    >
                      <div className="p-1.5 rounded-md bg-white/5 text-gray-400 group-hover:text-accent transition-colors">
                        <f.icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-200">{f.label}</span>
                        <span className="text-[9px] text-gray-500">{f.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
       </div>

       {/* MODULES EXPANDED VIEW */}
       {isExpanded && (
         <div className="border-t border-white/5 bg-[#09090b]/95 backdrop-blur-xl shadow-2xl absolute w-full left-0 z-40 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto px-4 py-8">
               <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-white">Module Configuration</h3>
                  </div>
                  <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded-full text-text-sub hover:text-white"><X className="w-5 h-5" /></button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
                        <Shield className="w-3 h-3" /> Special Modes
                     </h4>
                     <div className="space-y-2">
                        <FeatureToggle id="examMode" label="Exam Mode" icon={GraduationCap} color="red" />
                        <FeatureToggle id="integrityMode" label="Integrity" icon={Shield} color="green" />
                        <FeatureToggle id="debateMode" label="AI Debate" icon={Scale} color="orange" />
                        <FeatureToggle id="socraticMode" label="Socratic" icon={Brain} color="teal" />
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
                        <Brain className="w-3 h-3" /> Analysis
                     </h4>
                     <div className="grid grid-cols-1 gap-2">
                        <FeatureToggle id="confidenceIndicator" label="Confidence" icon={Activity} color="blue" />
                        <FeatureToggle id="errorExplanation" label="Explain Errors" icon={AlertCircle} color="yellow" />
                        <FeatureToggle id="assumptionExposure" label="Show Assumptions" icon={Eye} color="purple" />
                        <FeatureToggle id="selfLimit" label="Self-Limit" icon={EyeOff} color="gray" />
                        <FeatureToggle id="learningGap" label="Gap Detector" icon={Search} color="pink" />
                        <FeatureToggle id="moodDetection" label="Mood Sense" icon={Heart} color="rose" />
                        <FeatureToggle id="useGrounding" label="Google Grounding" icon={Gauge} color="blue" />
                     </div>
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-white/5 pb-2">
                        <Sparkles className="w-3 h-3" /> Output Style
                     </h4>
                     <div className="grid grid-cols-1 gap-2">
                        <FeatureToggle id="eli5" label="ELI5 Mode" icon={Sparkles} color="cyan" />
                        <FeatureToggle id="notesMode" label="Auto-Notes" icon={FileText} color="indigo" />
                        <FeatureToggle id="reverseLearning" label="Reverse Teach" icon={RefreshCw} color="orange" />
                        <FeatureToggle id="multiPerspective" label="Multi-View" icon={Layers} color="violet" />
                        <FeatureToggle id="failureCase" label="Failure Cases" icon={AlertCircle} color="red" />
                     </div>
                  </div>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
