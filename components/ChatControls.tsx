
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Zap, Cpu, Leaf, Share, FileDown, FileCode, FileText, Sparkles, Globe, Brain, MessageSquare } from 'lucide-react';
import { ChatConfig, ChatSession } from '../types';
import { exportChatToMarkdown, exportChatToPDF, exportChatToText } from '../utils/exportUtils';

interface ChatControlsProps {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  currentSession: ChatSession | null;
}

export const ChatControls: React.FC<ChatControlsProps> = ({ config, setConfig, currentSession }) => {
  const [activeMenu, setActiveMenu] = useState<'model' | 'export' | 'features' | null>(null);
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

  const getModelLabel = () => {
    if (config.useThinking) return 'Zara Pro';
    if (config.model.includes('lite')) return 'Zara Lite';
    return 'Zara Fast';
  };

  const applyModel = (preset: 'fast' | 'eco' | 'pro') => {
    switch (preset) {
      case 'fast': setConfig(prev => ({ ...prev, model: 'gemini-3-flash-preview', useThinking: false })); break;
      case 'eco': setConfig(prev => ({ ...prev, model: 'gemini-flash-lite-latest', useThinking: false })); break;
      case 'pro': setConfig(prev => ({ ...prev, model: 'gemini-3-pro-preview', useThinking: true })); break;
    }
    setActiveMenu(null);
  };

  const toggleFeature = (key: keyof ChatConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full bg-[#09090b]/40 backdrop-blur-3xl border-b border-white/[0.03] sticky top-0 z-40 animate-fade-in" ref={menuRef}>
       <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="relative">
             <button 
               onClick={() => setActiveMenu(activeMenu === 'model' ? null : 'model')}
               className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-[13px] font-bold text-gray-200 transition-all active:scale-95"
             >
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>{getModelLabel()}</span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${activeMenu === 'model' ? 'rotate-180' : ''}`} />
             </button>

             {activeMenu === 'model' && (
                <div className="absolute top-full left-0 mt-3 w-64 bg-[#121214] border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-2 animate-slide-up">
                   {[
                     { id: 'fast', label: 'Zara Fast', desc: 'Optimized for speed', icon: Zap, color: 'text-yellow-400' },
                     { id: 'pro', label: 'Zara Pro', desc: 'Advanced reasoning', icon: Cpu, color: 'text-purple-400' },
                     { id: 'eco', label: 'Zara Lite', desc: 'Resource efficient', icon: Leaf, color: 'text-green-400' }
                   ].map((m) => (
                      <button 
                        key={m.id}
                        onClick={() => applyModel(m.id as any)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-[20px] hover:bg-white/[0.03] group transition-all mb-1 last:mb-0"
                      >
                         <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-white/[0.03] ${m.color}`}>
                               <m.icon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                               <p className="text-[13px] font-bold text-gray-100">{m.label}</p>
                               <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{m.desc}</p>
                            </div>
                         </div>
                         {((config.useThinking && m.id === 'pro') || (!config.useThinking && config.model.includes(m.id === 'fast' ? 'flash' : m.id))) && <Check className="w-4 h-4 text-primary" />}
                      </button>
                   ))}
                </div>
             )}
          </div>

          <div className="flex items-center gap-2">
             <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'features' ? null : 'features')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-bold text-[13px] border ${activeMenu === 'features' ? 'bg-primary/20 text-primary border-primary/20 shadow-lg' : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.03]'}`}
                >
                   <Sparkles className="w-4 h-4" />
                   <span>Features</span>
                </button>

                {activeMenu === 'features' && (
                  <div className="absolute top-full right-0 mt-3 w-72 bg-[#121214] border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-2 animate-slide-up">
                     <div className="px-5 py-3 border-b border-white/[0.03] mb-2">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">System Intelligence</span>
                     </div>
                     
                     {[
                        { key: 'useGrounding', label: 'Web Grounding', desc: 'Real-time search data', icon: Globe, color: 'text-blue-400' },
                        { key: 'useThinking', label: 'Deep Logic', desc: 'Step-by-step reasoning', icon: Brain, color: 'text-purple-400' },
                        { key: 'learningGap', label: 'Gap Analysis', desc: 'Detect weak points', icon: MessageSquare, color: 'text-emerald-400' }
                     ].map((feat) => (
                        <button 
                           key={feat.key}
                           onClick={() => toggleFeature(feat.key as any)}
                           className="w-full flex items-center justify-between px-4 py-3.5 rounded-[20px] hover:bg-white/[0.03] transition-all group"
                        >
                           <div className="flex items-center gap-4">
                              <div className={`p-2.5 rounded-2xl ${config[feat.key as keyof ChatConfig] ? 'bg-white/[0.05]' : 'bg-transparent text-gray-600'} ${feat.color}`}>
                                 <feat.icon className="w-4 h-4" />
                              </div>
                              <div className="text-left">
                                 <p className="text-[13px] font-bold text-gray-200">{feat.label}</p>
                                 <p className="text-[10px] text-gray-500 font-medium">{feat.desc}</p>
                              </div>
                           </div>
                           <div className={`w-9 h-5 rounded-full relative transition-all duration-300 ${config[feat.key as keyof ChatConfig] ? 'bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-gray-800'}`}>
                              <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${config[feat.key as keyof ChatConfig] ? 'translate-x-4' : 'translate-x-0'}`} />
                           </div>
                        </button>
                     ))}
                  </div>
                )}
             </div>
             
             <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'export' ? null : 'export')}
                  disabled={!currentSession || currentSession.messages.length === 0}
                  className={`p-2.5 rounded-2xl transition-all ${activeMenu === 'export' ? 'bg-white/[0.05] text-white shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'} disabled:opacity-20`}
                >
                   <Share className="w-5 h-5" />
                </button>

                {activeMenu === 'export' && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-[#121214] border border-white/10 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 p-2 animate-slide-up">
                     <div className="px-5 py-3 border-b border-white/[0.03] mb-2">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Export Results</span>
                     </div>
                     {[
                        { id: 'pdf', label: 'PDF Document', icon: FileDown, color: 'text-red-400' },
                        { id: 'md', label: 'Markdown', icon: FileCode, color: 'text-blue-400' },
                        { id: 'txt', label: 'Plain Text', icon: FileText, color: 'text-gray-400' }
                     ].map(type => (
                        <button 
                           key={type.id}
                           onClick={() => {
                              if (!currentSession) return;
                              if (type.id === 'pdf') exportChatToPDF(currentSession);
                              if (type.id === 'md') exportChatToMarkdown(currentSession);
                              if (type.id === 'txt') exportChatToText(currentSession);
                              setActiveMenu(null);
                           }}
                           className="w-full flex items-center gap-4 px-4 py-3 rounded-[20px] hover:bg-white/[0.03] transition-all group"
                        >
                           <div className={`p-2 rounded-xl bg-white/[0.03] ${type.color}`}>
                              <type.icon className="w-4 h-4" />
                           </div>
                           <span className="text-[13px] font-bold text-gray-200">{type.label}</span>
                        </button>
                     ))}
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};
