
import React, { useState, useEffect } from 'react';
import { Brain, Globe, ChevronDown, UserCircle, Upload, FileText, File, Sparkles, GraduationCap, Shield, Layers, RefreshCw, Activity, Compass, Anchor, Scale, SearchCheck, Zap, AlertTriangle, BookOpen, GitBranch } from 'lucide-react';
import { ChatConfig, GeminiModel, Persona, ChatSession, InteractionMode } from '../types';
import { exportChatToMarkdown, exportChatToPDF, exportChatToText } from '../utils/exportUtils';

interface ChatControlsProps {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  currentSession: ChatSession | null;
}

export const ChatControls: React.FC<ChatControlsProps> = ({ config, setConfig, currentSession }) => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFeatureMenu, setShowFeatureMenu] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('zara_personas');
    if (stored) setPersonas(JSON.parse(stored));
  }, []);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(prev => ({ ...prev, model: e.target.value as GeminiModel }));
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(prev => ({ ...prev, interactionMode: e.target.value as InteractionMode }));
  };

  const toggleFeature = (key: keyof ChatConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-surface/50 border-b border-white/5 backdrop-blur-sm z-20 transition-all">
      
      {/* Model Selector */}
      <div className="relative group">
        <select
          value={config.model}
          onChange={handleModelChange}
          className="appearance-none bg-surfaceHighlight border border-border text-text text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-primary/50 cursor-pointer hover:bg-surfaceHighlight/80 transition-all"
        >
          <option value="gemini-2.5-flash">Zara Fast</option>
          <option value="gemini-3-pro-preview">Zara Pro</option>
          <option value="gemini-flash-lite-latest">Zara Lite</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-sub pointer-events-none" />
      </div>

      {/* Interaction Mode Selector (Feature 1) */}
      <div className="relative group">
        <select
          value={config.interactionMode}
          onChange={handleModeChange}
          className={`appearance-none border border-border text-xs font-medium rounded-lg pl-3 pr-8 py-1.5 focus:outline-none cursor-pointer transition-all ${
             config.interactionMode !== 'default' 
               ? 'bg-primary/10 text-primary border-primary/30' 
               : 'bg-surfaceHighlight text-text'
          }`}
        >
          <option value="default">Default Mode</option>
          <option value="teacher">Teacher (Explain)</option>
          <option value="developer">Developer (Code)</option>
          <option value="friend">Friend (Casual)</option>
          <option value="examiner">Examiner (Strict)</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50 pointer-events-none" />
      </div>

      <div className="w-px h-4 bg-white/10 mx-1" />

      {/* Smart Features Menu */}
      <div className="relative">
         <button 
            onClick={() => setShowFeatureMenu(!showFeatureMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${showFeatureMenu ? 'bg-primary/20 text-primary' : 'bg-surfaceHighlight hover:bg-surface text-text-sub'}`}
         >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Advanced Features</span>
            <ChevronDown className="w-3 h-3 opacity-50" />
         </button>

         {showFeatureMenu && (
            <>
               <div className="fixed inset-0 z-40" onClick={() => setShowFeatureMenu(false)} />
               <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col z-50 animate-fade-in p-1 max-h-[80vh] overflow-y-auto custom-scrollbar">
                  
                  {/* Basic Tools */}
                  <div className="px-3 py-2 text-[10px] font-bold text-text-sub uppercase tracking-wider bg-surfaceHighlight/30 mb-1">Tools</div>
                  <button onClick={() => toggleFeature('examMode')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.examMode ? 'bg-primary/10 text-primary' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> Exam Mode</span>
                     {config.examMode && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </button>
                  <button onClick={() => toggleFeature('integrityMode')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.integrityMode ? 'bg-green-500/10 text-green-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Assignment Integrity</span>
                     {config.integrityMode && <span className="w-2 h-2 rounded-full bg-green-500" />}
                  </button>
                  <button onClick={() => toggleFeature('notesFormat')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.notesFormat ? 'bg-blue-500/10 text-blue-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Auto-Notes (PDF)</span>
                     {config.notesFormat && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                  </button>

                  <div className="h-px bg-border my-1" />
                  
                  {/* Cognitive Learning */}
                  <div className="px-3 py-2 text-[10px] font-bold text-text-sub uppercase tracking-wider bg-surfaceHighlight/30 mb-1">Cognitive & Logic</div>
                  <button onClick={() => toggleFeature('socraticMethod')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.socraticMethod ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Brain className="w-3.5 h-3.5" /> Socratic Method</span>
                     {config.socraticMethod && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </button>
                  <button onClick={() => toggleFeature('aiDebate')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.aiDebate ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> AI Debate Partner</span>
                     {config.aiDebate && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </button>
                  <button onClick={() => toggleFeature('reverseLearning')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.reverseLearning ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5" /> Reverse Learning</span>
                     {config.reverseLearning && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </button>
                  <button onClick={() => toggleFeature('failureCases')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.failureCases ? 'bg-indigo-500/10 text-indigo-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Failure Analysis</span>
                     {config.failureCases && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </button>

                  <div className="h-px bg-border my-1" />

                  {/* Deep Learning */}
                  <div className="px-3 py-2 text-[10px] font-bold text-text-sub uppercase tracking-wider bg-surfaceHighlight/30 mb-1">Deep Learning</div>
                  <button onClick={() => toggleFeature('learningGap')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.learningGap ? 'bg-teal-500/10 text-teal-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><SearchCheck className="w-3.5 h-3.5" /> Gap Discovery</span>
                     {config.learningGap && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                  </button>
                  <button onClick={() => toggleFeature('conceptMapping')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.conceptMapping ? 'bg-teal-500/10 text-teal-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><GitBranch className="w-3.5 h-3.5" /> Concept Map</span>
                     {config.conceptMapping && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                  </button>
                  <button onClick={() => toggleFeature('knowledgeTimeline')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.knowledgeTimeline ? 'bg-teal-500/10 text-teal-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Activity className="w-3.5 h-3.5" /> Knowledge Timeline</span>
                     {config.knowledgeTimeline && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                  </button>
                  <button onClick={() => toggleFeature('tutorMemory')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.tutorMemory ? 'bg-teal-500/10 text-teal-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5" /> Tutor Memory</span>
                     {config.tutorMemory && <span className="w-2 h-2 rounded-full bg-teal-500" />}
                  </button>

                  <div className="h-px bg-border my-1" />

                  {/* Metacognition */}
                  <div className="px-3 py-2 text-[10px] font-bold text-text-sub uppercase tracking-wider bg-surfaceHighlight/30 mb-1">Metacognition</div>
                  <button onClick={() => toggleFeature('assumptionExposure')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.assumptionExposure ? 'bg-purple-500/10 text-purple-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Expose Assumptions</span>
                     {config.assumptionExposure && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                  </button>
                  <button onClick={() => toggleFeature('selfLimit')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.selfLimit ? 'bg-purple-500/10 text-purple-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Self-Limit Check</span>
                     {config.selfLimit && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                  </button>
                  <button onClick={() => toggleFeature('confidenceCorrectness')} className={`px-3 py-2 text-left text-xs flex items-center justify-between rounded-lg mb-1 ${config.confidenceCorrectness ? 'bg-purple-500/10 text-purple-500' : 'hover:bg-surfaceHighlight text-text'}`}>
                     <span className="flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> Confidence Score</span>
                     {config.confidenceCorrectness && <span className="w-2 h-2 rounded-full bg-purple-500" />}
                  </button>
               </div>
            </>
         )}
      </div>

      {/* Main Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setConfig(prev => ({ ...prev, useThinking: !prev.useThinking }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            config.useThinking 
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
              : 'hover:bg-white/5 text-text-sub'
          }`}
          title="Enable Thinking Process"
        >
          <Brain className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Thinking</span>
        </button>

        <button
          onClick={() => setConfig(prev => ({ ...prev, useGrounding: !prev.useGrounding }))}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            config.useGrounding 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : 'hover:bg-white/5 text-text-sub'
          }`}
          title="Enable Search Grounding"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
        </button>
        
        {currentSession && (
          <div className="relative">
             <button 
               onClick={() => setShowExportMenu(!showExportMenu)} 
               className={`p-1.5 rounded-lg transition-colors ${showExportMenu ? 'bg-surfaceHighlight text-text' : 'text-text-sub hover:bg-surfaceHighlight hover:text-text'}`}
               title="Export Chat"
             >
                <Upload className="w-4 h-4" />
             </button>
             {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden flex flex-col z-50 animate-fade-in">
                     <div className="px-3 py-2 text-[10px] font-bold text-text-sub uppercase tracking-wider bg-surfaceHighlight/50">Export As</div>
                     <button onClick={() => { exportChatToMarkdown(currentSession); setShowExportMenu(false); }} className="px-4 py-2 hover:bg-surfaceHighlight text-left text-sm flex items-center gap-2 text-text transition-colors">
                        <FileText className="w-4 h-4 text-primary" /> Markdown
                     </button>
                     <button onClick={() => { exportChatToText(currentSession); setShowExportMenu(false); }} className="px-4 py-2 hover:bg-surfaceHighlight text-left text-sm flex items-center gap-2 text-text transition-colors">
                        <File className="w-4 h-4 text-primary" /> Plain Text
                     </button>
                     <button onClick={() => { exportChatToPDF(currentSession); setShowExportMenu(false); }} className="px-4 py-2 hover:bg-surfaceHighlight text-left text-sm flex items-center gap-2 text-text transition-colors">
                        <FileText className="w-4 h-4 text-primary" /> Print / PDF
                     </button>
                  </div>
                </>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
