
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
    <div className="w-full bg-[#09090b]/40 backdrop-blur-3xl border-b border-white/[0.03] sticky top-0 z-40" ref={menuRef}>
       <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="relative">
             <button 
               onClick={() => setActiveMenu(activeMenu === 'model' ? null : 'model')}
               className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-[11px] font-bold text-gray-200 transition-all active:scale-95"
             >
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>{getModelLabel()}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-300 ${activeMenu === 'model' ? 'rotate-180' : ''}`} />
             </button>

             {activeMenu === 'model' && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-[#121214] border border-white/10 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50 p-1.5">
                   {[
                     { id: 'fast', label: 'Zara Fast', desc: 'Optimized for speed', icon: Zap, color: 'text-yellow-400' },
                     { id: 'pro', label: 'Zara Pro', desc: 'Advanced reasoning', icon: Cpu, color: 'text-purple-400' },
                     { id: 'eco', label: 'Zara Lite', desc: 'Resource efficient', icon: Leaf, color: 'text-green-400' }
                   ].map((m) => (
                      <button 
                        key={m.id}
                        onClick={() => applyModel(m.id as any)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.03] group transition-all mb-0.5 last:mb-0"
                      >
                         <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg bg-white/[0.03] ${m.color}`}>
                               <m.icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-left">
                               <p className="text-[12px] font-bold text-gray-100">{m.label}</p>
                               <p className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">{m.desc}</p>
                            </div>
                         </div>
                         {((config.useThinking && m.id === 'pro') || (!config.useThinking && config.model.includes(m.id === 'fast' ? 'flash' : m.id))) && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                   ))}
                </div>
             )}
          </div>

          <div className="flex items-center gap-1">
             <div className="relative">
                <button 
                  onClick={() => setActiveMenu(activeMenu === 'features' ? null : 'features')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all font-bold text-[11px] border ${activeMenu === 'features' ? 'bg-primary/20 text-primary border-primary/20 shadow-lg' : 'text-gray-400 hover:text-white border-transparent hover:bg-white/[0.03]'}`}
                >
                   <Sparkles className="w-3.5 h-3.5" />
                   <span>Features</span>
                </button>

                {activeMenu === 'features' && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-[#121214] border border-white/10 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50 p-1.5">
                     <div className="px-4 py-2 border-b border-white/[0.03] mb-1">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.15em]">Intelligence</span>
                     </div>
                     
                     {[
                        { key: 'useGrounding', label: 'Web Grounding', desc: 'Real-time search', icon: Globe, color: 'text-blue-400' },
                        { key: 'useThinking', label: 'Deep Logic', desc: 'Step reasoning', icon: Brain, color: 'text-purple-400' },
                        { key: 'learningGap', label: 'Gap Analysis', desc: 'Detect weak points', icon: MessageSquare, color: 'text-emerald-400' }
                     ].map((feat) => (
                        <button 
                           key={feat.key}
                           onClick={() => toggleFeature(feat.key as any)}
                           className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-all group"
                        >
                           <div className="flex items-center gap-3">
                              <div className={`p-1.5 rounded-xl ${config[feat.key as keyof ChatConfig] ? 'bg-white/[0.05]' : 'bg-transparent text-gray-600'} ${feat.color}`}>
                                 <feat.icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="text-left">
                                 <p className="text-[12px] font-bold text-gray-200">{feat.label}</p>
                                 <p className="text-[9px] text-gray-500 font-medium">{feat.desc}</p>
                              </div>
                           </div>
                           <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${config[feat.key as keyof ChatConfig] ? 'bg-primary' : 'bg-gray-800'}`}>
                              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${config[feat.key as keyof ChatConfig] ? 'translate-x-3.5' : 'translate-x-0'}`} />
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
                  className={`p-2 rounded-xl transition-all ${activeMenu === 'export' ? 'bg-white/[0.05] text-white' : 'text-gray-500 hover:text-white hover:bg-white/[0.03]'} disabled:opacity-20`}
                >
                   <Share className="w-4 h-4" />
                </button>

                {activeMenu === 'export' && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-[#121214] border border-white/10 rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.5)] z-50 p-1.5">
                     <div className="px-4 py-2 border-b border-white/[0.03] mb-1">
                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-[0.15em]">Export</span>
                     </div>
                     {[
                        { id: 'pdf', label: 'PDF Doc', icon: FileDown, color: 'text-red-400' },
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
                           className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.03] transition-all group"
                        >
                           <div className={`p-1.5 rounded-lg bg-white/[0.03] ${type.color}`}>
                              <type.icon className="w-3.5 h-3.5" />
                           </div>
                           <span className="text-[12px] font-bold text-gray-200">{type.label}</span>
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
