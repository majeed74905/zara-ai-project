
import React, { useState, useEffect } from 'react';
import { X, Save, User, Settings as SettingsIcon, Monitor, UserPlus, Trash2, Edit2, Zap, Volume2, Layout, Sparkles, MessageSquare, Plus, Check } from 'lucide-react';
import { PersonalizationConfig, Persona, SystemConfig, ChatConfig } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';
import { APP_VERSION } from '../constants/appConstants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personalization: PersonalizationConfig;
  setPersonalization: (config: PersonalizationConfig) => void;
  systemConfig: SystemConfig;
  setSystemConfig: (config: Partial<SystemConfig>) => void;
  chatConfig: ChatConfig;
  setChatConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  personalization, 
  setPersonalization,
  systemConfig,
  setSystemConfig,
  chatConfig,
  setChatConfig
}) => {
  const [activeTab, setActiveTab] = useState<'system' | 'personalization' | 'personas'>('system');
  const [tempPersonalization, setTempPersonalization] = useState<PersonalizationConfig>(personalization);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTempPersonalization(personalization);
      const storedPersonas = localStorage.getItem('zara_personas');
      if (storedPersonas) {
        try {
          setPersonas(JSON.parse(storedPersonas));
        } catch (e) {
          console.error("Error loading personas", e);
        }
      }
    }
  }, [isOpen, personalization]);

  const handleSave = () => {
    setPersonalization(tempPersonalization);
    onClose();
  };

  const savePersonas = (newPersonas: Persona[]) => {
    setPersonas(newPersonas);
    localStorage.setItem('zara_personas', JSON.stringify(newPersonas));
  };

  const handleAddPersona = () => {
    const newPersona: Persona = {
      id: crypto.randomUUID(),
      name: "New Persona",
      description: "Custom AI Character",
      systemPrompt: "You are..."
    };
    setEditingPersona(newPersona);
  };

  const handleSavePersona = () => {
    if (editingPersona) {
      const exists = personas.find(p => p.id === editingPersona.id);
      let updated;
      if (exists) {
        updated = personas.map(p => p.id === editingPersona.id ? editingPersona : p);
      } else {
        updated = [...personas, editingPersona];
      }
      savePersonas(updated);
      setEditingPersona(null);
    }
  };

  const handleDeletePersona = (id: string) => {
    if (confirm("Delete this persona?")) {
      savePersonas(personas.filter(p => p.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-hidden">
      <div className="bg-[#09090b] border border-white/10 rounded-[32px] w-full max-w-6xl h-[90vh] shadow-2xl flex overflow-hidden">
        
        {/* Sidebar Navigation */}
        <div className="w-[300px] bg-[#09090b] border-r border-white/5 flex flex-col p-8 flex-shrink-0">
          <div className="mb-12">
            <h2 className="text-3xl font-black text-white tracking-tight">Settings</h2>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Unified configuration</p>
          </div>
          
          <nav className="space-y-2 flex-1">
            <button
              onClick={() => { setActiveTab('system'); setEditingPersona(null); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'system' ? 'bg-primary/20 text-primary border border-primary/20 shadow-xl shadow-primary/5' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <Monitor className="w-5 h-5" /> System & UI
            </button>
            <button
              onClick={() => { setActiveTab('personalization'); setEditingPersona(null); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'personalization' ? 'bg-primary/20 text-primary border border-primary/20 shadow-xl shadow-primary/5' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <User className="w-5 h-5" /> Personalization
            </button>
            <button
              onClick={() => { setActiveTab('personas'); setEditingPersona(null); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'personas' ? 'bg-primary/20 text-primary border border-primary/20 shadow-xl shadow-primary/5' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`}
            >
              <UserPlus className="w-5 h-5" /> AI Personas
            </button>
          </nav>
          
          <div className="mt-auto pt-8 border-t border-white/5 flex flex-col gap-4">
            <div className="text-[11px] text-gray-600 font-bold uppercase text-center tracking-widest">{APP_VERSION}</div>
            <button onClick={onClose} className="w-full py-4 text-sm font-bold text-gray-400 hover:text-white flex items-center justify-center gap-2 group transition-colors">
               <X className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Close
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-[#020203] min-w-0">
          {/* Section Header */}
          <div className="px-12 pt-10 pb-4 flex justify-between items-center">
             <div>
                <h3 className="text-2xl font-black text-white">
                  {activeTab === 'system' && 'System & UI Preferences'}
                  {activeTab === 'personalization' && 'Personalization'}
                  {activeTab === 'personas' && 'AI Personas'}
                </h3>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  {activeTab === 'system' && 'Customize look, feel, and behavior.'}
                  {activeTab === 'personalization' && 'Customize how Zara interacts with you.'}
                  {activeTab === 'personas' && 'Create custom characters for Zara to enact.'}
                </p>
             </div>
          </div>

          {/* Main Scroller */}
          <div className="flex-1 overflow-y-auto px-12 py-8 custom-scrollbar">
            
            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
              <div className="space-y-12 animate-fade-in">
                {/* Auto Sync Toggle Card */}
                <div className="bg-[#09090b] border border-white/5 p-8 rounded-[32px] flex items-center justify-between group hover:border-primary/30 transition-all shadow-xl">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-[20px] bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-lg shadow-primary/5">
                         <Zap className="w-7 h-7" />
                      </div>
                      <div>
                         <p className="text-lg font-black text-white">Auto-Theme Sync</p>
                         <p className="text-sm font-medium text-gray-500 mt-1">Change theme automatically based on active mode</p>
                      </div>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer scale-125">
                     <input 
                       type="checkbox" 
                       checked={systemConfig.autoTheme} 
                       onChange={(e) => setSystemConfig({ autoTheme: e.target.checked })} 
                       className="sr-only peer" 
                     />
                     <div className="w-11 h-6 bg-[#18181b] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                   </label>
                </div>

                {/* Interface Theme Grid Section */}
                <section>
                  <div className="flex items-center gap-4 mb-8">
                     <Layout className="w-5 h-5 text-gray-600" />
                     <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">Interface Theme</h4>
                  </div>
                  <ThemeSwitcher onThemeSelect={() => setSystemConfig({ autoTheme: false })} />
                </section>
              </div>
            )}

            {/* --- PERSONALIZATION TAB --- */}
            {activeTab === 'personalization' && (
              <div className="space-y-12 animate-fade-in pb-10">
                
                {/* Identity Section */}
                <section>
                   <div className="flex items-center gap-4 mb-8">
                      <Sparkles className="w-5 h-5 text-gray-600" />
                      <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">About You</h4>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nickname</label>
                         <input 
                           type="text" 
                           value={tempPersonalization.nickname} 
                           onChange={(e) => setTempPersonalization({...tempPersonalization, nickname: e.target.value})} 
                           className="w-full bg-[#09090b] border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm font-medium shadow-inner" 
                           placeholder="How Zara addresses you..."
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Occupation</label>
                         <input 
                           type="text" 
                           value={tempPersonalization.occupation} 
                           onChange={(e) => setTempPersonalization({...tempPersonalization, occupation: e.target.value})} 
                           className="w-full bg-[#09090b] border border-white/5 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm font-medium shadow-inner" 
                           placeholder="Your primary role..."
                         />
                      </div>
                   </div>
                </section>

                {/* AI Response Style Grid */}
                <section>
                   <div className="flex items-center gap-4 mb-8">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">AI Response Style</h4>
                   </div>
                   <div className="bg-[#09090b] border border-white/5 p-2 rounded-[24px] grid grid-cols-3 gap-2 shadow-xl">
                      {(['concise', 'balanced', 'detailed'] as const).map((style) => (
                         <button
                           key={style}
                           onClick={() => setTempPersonalization({...tempPersonalization, responseStyle: style})}
                           className={`py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${
                             tempPersonalization.responseStyle === style 
                               ? 'bg-primary text-white shadow-2xl shadow-primary/20 scale-[1.02]' 
                               : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                           }`}
                         >
                            {style}
                         </button>
                      ))}
                   </div>
                </section>

                {/* Deep Context Textareas */}
                <section className="space-y-10">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Bio & Identity</label>
                      <textarea 
                        value={tempPersonalization.aboutYou} 
                        onChange={(e) => setTempPersonalization({...tempPersonalization, aboutYou: e.target.value})} 
                        className="w-full bg-[#09090b] border border-white/5 rounded-[32px] px-6 py-5 text-white focus:outline-none focus:border-primary text-sm font-medium min-h-[160px] resize-none shadow-inner" 
                        placeholder="Tell Zara about your background, hobbies, or life goals..."
                      />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Behavioral Rules</label>
                      <textarea 
                        value={tempPersonalization.customInstructions} 
                        onChange={(e) => setTempPersonalization({...tempPersonalization, customInstructions: e.target.value})} 
                        className="w-full bg-[#09090b] border border-white/5 rounded-[32px] px-6 py-5 text-white focus:outline-none focus:border-primary text-sm font-mono min-h-[160px] resize-none shadow-inner" 
                        placeholder="e.g. Always think step-by-step. Use Markdown for all lists. Avoid emojis unless requested."
                      />
                   </div>
                </section>
              </div>
            )}

            {/* --- PERSONAS TAB --- */}
            {activeTab === 'personas' && (
               <div className="space-y-8 animate-fade-in pb-10">
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                       <UserPlus className="w-5 h-5 text-gray-600" />
                       <h4 className="text-[11px] font-black text-gray-600 uppercase tracking-[0.2em]">Manage Custom Agents</h4>
                    </div>
                    {!editingPersona && (
                      <button onClick={handleAddPersona} className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-2xl shadow-primary/20 active:scale-95">
                        <Plus className="w-4 h-4" /> Create Agent
                      </button>
                    )}
                 </div>

                 {editingPersona ? (
                    <div className="bg-[#09090b] border border-primary/30 p-10 rounded-[40px] space-y-8 animate-fade-in relative shadow-2xl">
                       <div className="flex items-center gap-3 mb-2">
                          <Edit2 className="w-5 h-5 text-primary" />
                          <h4 className="font-black text-2xl text-white">Editor</h4>
                       </div>
                       
                       <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Agent Name</label>
                              <input 
                                value={editingPersona.name}
                                onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                                placeholder="e.g. Python Architect"
                                className="w-full bg-[#020203] border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary outline-none text-sm font-bold shadow-inner"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Short Description</label>
                              <input 
                                value={editingPersona.description}
                                onChange={e => setEditingPersona({...editingPersona, description: e.target.value})}
                                placeholder="Expert code reviewer..."
                                className="w-full bg-[#020203] border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-primary outline-none text-sm font-bold shadow-inner"
                              />
                            </div>
                         </div>
                         <div className="space-y-3">
                           <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">System Instruction</label>
                           <textarea 
                             value={editingPersona.systemPrompt}
                             onChange={e => setEditingPersona({...editingPersona, systemPrompt: e.target.value})}
                             placeholder="Define rules, knowledge base, and tone..."
                             className="w-full bg-[#020203] border border-white/10 rounded-[32px] px-6 py-5 text-sm font-mono h-56 resize-none focus:border-primary outline-none text-gray-300 shadow-inner"
                           />
                         </div>
                       </div>

                       <div className="flex gap-4 justify-end pt-4">
                          <button onClick={() => setEditingPersona(null)} className="px-8 py-4 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
                          <button onClick={handleSavePersona} className="bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-primary/20"><Save className="w-4 h-4" /> Save Persona</button>
                       </div>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {personas.length === 0 && (
                          <div className="col-span-2 text-center py-24 border-2 border-dashed border-white/5 rounded-[48px] text-gray-600 bg-white/[0.01]">
                             <UserPlus className="w-16 h-16 mx-auto mb-6 opacity-10" />
                             <p className="font-black text-lg uppercase tracking-widest opacity-40">No custom agents found</p>
                             <p className="text-sm mt-2 opacity-30">Start by creating a persona for specific tasks.</p>
                          </div>
                       )}
                       {personas.map(p => (
                          <div key={p.id} className="bg-[#09090b] border border-white/5 rounded-[40px] p-8 hover:border-primary/50 transition-all group relative flex flex-col hover:bg-[#0c0c0e] hover:-translate-y-1 shadow-xl">
                             <div className="flex justify-between items-start mb-4">
                                <h4 className="font-black text-xl text-white group-hover:text-primary transition-colors">{p.name}</h4>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                   <button onClick={() => setEditingPersona(p)} className="p-3 bg-white/5 hover:bg-primary/20 rounded-2xl text-primary transition-colors"><Edit2 className="w-4 h-4" /></button>
                                   <button onClick={() => handleDeletePersona(p.id)} className="p-3 bg-white/5 hover:bg-red-500/20 rounded-2xl text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                             </div>
                             <p className="text-sm text-gray-500 line-clamp-2 mb-6 leading-relaxed font-medium">{p.description}</p>
                             <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">ID: {p.id.slice(0,8)}</span>
                                <div className="w-2.5 h-2.5 rounded-full bg-primary/20 shadow-[0_0_8px_rgba(139,92,246,0.3)]" />
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
               </div>
            )}
          </div>

          {/* Bottom Control Bar */}
          <div className="px-12 py-8 border-t border-white/5 bg-[#020203]/90 backdrop-blur-2xl flex justify-between items-center flex-shrink-0">
             <div className="hidden md:flex items-center gap-2 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">
                <SettingsIcon className="w-4 h-4" /> Zara Core Config
             </div>
             <div className="flex gap-4">
                <button onClick={onClose} className="px-10 py-4 text-gray-500 font-bold hover:text-white rounded-2xl hover:bg-white/5 transition-all uppercase text-[11px] tracking-widest">Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-3 bg-primary hover:bg-primary-dark text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_20px_40px_rgba(139,92,246,0.25)] active:scale-95 group">
                  <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Save Changes
                </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
