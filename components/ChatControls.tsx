
import React, { useState, useRef, useEffect } from 'react';
import { Shield, FileText, Zap, Brain, Sparkles, Scale, GraduationCap, AlertCircle, Eye, EyeOff, Layers, Heart, Search, Activity, RefreshCw, ChevronDown, Cpu, Leaf, Gauge, Settings2, X, MessageSquare, User, Code2, CheckCircle2 } from 'lucide-react';
import { ChatConfig } from '../types';

interface ChatControlsProps {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
}

type ZaraPreset = 'fast' | 'eco' | 'high-iq';

export const ChatControls: React.FC<ChatControlsProps> = ({ config, setConfig }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
        setShowModeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine current preset based on config
  const getCurrentPreset = (): ZaraPreset => {
    if (config.useThinking) return 'high-iq';
    if (config.model.includes('lite')) return 'eco';
    return 'fast';
  };

  const currentPreset = getCurrentPreset();

  const applyPreset = (preset: ZaraPreset) => {
    switch (preset) {
      case 'fast':
        setConfig(prev => ({ ...prev, model: 'gemini-2.5-flash', useThinking: false }));
        break;
      case 'eco':
        setConfig(prev => ({ ...prev, model: 'gemini-flash-lite-latest', useThinking: false }));
        break;
      case 'high-iq':
        setConfig(prev => ({ ...prev, model: 'gemini-3-pro-preview', useThinking: true })); // Using Pro for High IQ
        break;
    }
    setShowModelMenu(false);
  };

  const toggleFeature = (key: keyof ChatConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setInteraction = (mode: ChatConfig['interactionMode']) => {
    setConfig(prev => ({ ...prev, interactionMode: mode }));
  };

  const activeFeatureCount = Object.entries(config).filter(([k, v]) => 
    typeof v === 'boolean' && v === true && !['useThinking', 'useGrounding'].includes(k)
  ).length;

  const getModeLabel = (mode: string) => {
      switch(mode) {
          case 'teacher': return { label: 'Teacher', icon: GraduationCap };
          case 'developer': return { label: 'Developer', icon: Code2 };
          case 'friend': return { label: 'Friend', icon: Heart };
          case 'examiner': return { label: 'Examiner', icon: Scale };
          default: return { label: 'Standard', icon: MessageSquare };
      }
  };

  const currentModeInfo = getModeLabel(config.interactionMode);
  const ModeIcon = currentModeInfo.icon;

  const FeatureToggle = ({ id, label, icon: Icon, color }: any) => (
    <button 
      onClick={() => toggleFeature(id)} 
      className={`px-3 py-2.5 text-left text-xs font-medium flex items-center justify-between rounded-xl transition-all border ${
        config[id as keyof ChatConfig] 
          ? `bg-${color}-500/10 text-${color}-500 border-${color}-500/20 shadow-sm` 
          : 'bg-surfaceHighlight/30 hover:bg-surface text-text-sub hover:text-text border-transparent hover:border-white/5'
      }`}
    >
      <span className="flex items-center gap-2.5"><Icon className="w-4 h-4" /> {label}</span>
      {config[id as keyof ChatConfig] && <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 shadow-[0_0_5px_currentColor]`} />}
    </button>
  );

  return (
    <div className="w-full bg-background/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30 transition-all duration-300" ref={menuRef}>
       
       {/* Top Bar */}
       <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2">
              {/* --- 1. MODEL SELECTOR (Video-like UI) --- */}
              <div className="relative">
                 <button 
                   onClick={() => { setShowModelMenu(!showModelMenu); setShowModeMenu(false); }}
                   className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surfaceHighlight/50 hover:bg-surface border border-white/5 hover:border-white/10 transition-all text-sm font-medium text-text"
                 >
                    <span className="hidden sm:inline">
                       {currentPreset === 'fast' && 'Zara Fast (Default)'}
                       {currentPreset === 'eco' && 'Zara Lite (Eco)'}
                       {currentPreset === 'high-iq' && 'Zara Pro (High IQ)'}
                    </span>
                    <span className="sm:hidden">
                       {currentPreset === 'fast' && 'Fast'}
                       {currentPreset === 'eco' && 'Lite'}
                       {currentPreset === 'high-iq' && 'Pro'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-text-sub" />
                 </button>

                 {/* Custom Model Menu UI */}
                 {showModelMenu && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col p-2">
                       <div className="px-2 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Select Model</div>
                       
                       <button onClick={() => applyPreset('fast')} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                          <div className="flex flex-col text-left">
                             <span className="text-sm font-medium text-gray-200">Zara Fast</span>
                             <span className="text-[10px] text-gray-500">Default • Balanced Speed</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${currentPreset === 'fast' ? 'border-blue-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                             {currentPreset === 'fast' && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                          </div>
                       </button>

                       <button onClick={() => applyPreset('high-iq')} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                          <div className="flex flex-col text-left">
                             <span className="text-sm font-medium text-gray-200">Zara Pro</span>
                             <span className="text-[10px] text-gray-500">High IQ • Reasoning</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${currentPreset === 'high-iq' ? 'border-purple-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                             {currentPreset === 'high-iq' && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                          </div>
                       </button>

                       <button onClick={() => applyPreset('eco')} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                          <div className="flex flex-col text-left">
                             <span className="text-sm font-medium text-gray-200">Zara Lite</span>
                             <span className="text-[10px] text-gray-500">Eco • Fastest Response</span>
                          </div>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${currentPreset === 'eco' ? 'border-green-500' : 'border-gray-600 group-hover:border-gray-400'}`}>
                             {currentPreset === 'eco' && <div className="w-2 h-2 rounded-full bg-green-500" />}
                          </div>
                       </button>
                    </div>
                 )}
              </div>

              {/* --- 2. INTERACTION MODE SELECTOR --- */}
              <div className="relative">
                 <button 
                   onClick={() => { setShowModeMenu(!showModeMenu); setShowModelMenu(false); }}
                   className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surfaceHighlight/50 hover:bg-surface border border-white/5 hover:border-white/10 transition-all text-sm font-medium text-text"
                 >
                    <ModeIcon className="w-4 h-4 text-primary" />
                    <span className="hidden sm:inline">{currentModeInfo.label}</span>
                    <ChevronDown className="w-3 h-3 text-text-sub" />
                 </button>

                 {/* Interaction Dropdown */}
                 {showModeMenu && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1">
                       <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Select Persona</div>
                       {(['standard', 'teacher', 'developer', 'friend', 'examiner'] as const).map(mode => {
                           const info = getModeLabel(mode);
                           const Icon = info.icon;
                           return (
                               <button 
                                 key={mode}
                                 onClick={() => { setInteraction(mode); setShowModeMenu(false); }}
                                 className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left transition-colors ${config.interactionMode === mode ? 'bg-white/5' : ''}`}
                               >
                                  <div className={`p-1.5 rounded-md ${config.interactionMode === mode ? 'text-primary bg-primary/10' : 'text-text-sub bg-surfaceHighlight'}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <span className={`text-sm font-medium ${config.interactionMode === mode ? 'text-white' : 'text-gray-400'}`}>
                                    {info.label}
                                  </span>
                               </button>
                           );
                       })}
                    </div>
                 )}
              </div>
          </div>

          {/* --- 3. MODULES TRIGGER --- */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
               isExpanded 
                 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                 : activeFeatureCount > 0
                    ? 'bg-surfaceHighlight text-primary border-primary/30'
                    : 'bg-transparent text-text-sub border-transparent hover:bg-surfaceHighlight'
            }`}
          >
             <Settings2 className="w-4 h-4" />
             <span className="hidden sm:inline">Modules</span>
             {activeFeatureCount > 0 && (
                <span className="bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-1">
                   {activeFeatureCount}
                </span>
             )}
          </button>
       </div>

       {/* Collapsible Unified Module Grid */}
       {isExpanded && (
         <div className="border-t border-white/5 bg-[#09090b]/95 backdrop-blur-xl shadow-2xl absolute w-full left-0 z-40 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto px-4 py-6">
               
               <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-white">Module Configuration</h3>
                  </div>
                  <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-white/10 rounded-full text-text-sub hover:text-white transition-colors"><X className="w-5 h-5" /></button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  
                  {/* COLUMN 1: Specialized Capabilities */}
                  <div className="space-y-6">
                     <h4 className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                        <Shield className="w-3 h-3" /> Specialized Capabilities
                     </h4>
                     
                     <div className="space-y-2">
                        <FeatureToggle id="examMode" label="Exam Mode" icon={GraduationCap} color="red" />
                        <FeatureToggle id="integrityMode" label="Integrity Check" icon={Shield} color="green" />
                        <FeatureToggle id="debateMode" label="AI Debate" icon={Scale} color="orange" />
                        <FeatureToggle id="socraticMode" label="Socratic Method" icon={Brain} color="teal" />
                     </div>
                  </div>

                  {/* COLUMN 2: Intelligence */}
                  <div className="space-y-6">
                     <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                        <Brain className="w-3 h-3" /> Intelligence Layers
                     </h4>
                     <div className="grid grid-cols-1 gap-2">
                        <FeatureToggle id="confidenceIndicator" label="Confidence Score" icon={Activity} color="blue" />
                        <FeatureToggle id="errorExplanation" label="Explain Errors" icon={AlertCircle} color="yellow" />
                        <FeatureToggle id="assumptionExposure" label="Show Assumptions" icon={Eye} color="purple" />
                        <FeatureToggle id="selfLimit" label="Self-Limit Check" icon={EyeOff} color="gray" />
                        <FeatureToggle id="learningGap" label="Gap Detector" icon={Search} color="pink" />
                        <FeatureToggle id="moodDetection" label="Mood Sense" icon={Heart} color="rose" />
                        <FeatureToggle id="useGrounding" label="Google Grounding" icon={Gauge} color="blue" />
                     </div>
                  </div>

                  {/* COLUMN 3: Output Style */}
                  <div className="space-y-6">
                     <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                        <Sparkles className="w-3 h-3" /> Output Style
                     </h4>
                     <div className="grid grid-cols-1 gap-2">
                        <FeatureToggle id="eli5" label="ELI5 Mode" icon={Sparkles} color="cyan" />
                        <FeatureToggle id="notesMode" label="Auto-Notes" icon={FileText} color="indigo" />
                        <FeatureToggle id="reverseLearning" label="Reverse Learning" icon={RefreshCw} color="orange" />
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
