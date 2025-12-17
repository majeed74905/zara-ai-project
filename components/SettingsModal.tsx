
import React, { useState, useEffect } from 'react';
import { X, Save, User, Settings as SettingsIcon, Monitor, UserPlus, Trash2, Edit2, Zap, Volume2, Layout, Smartphone } from 'lucide-react';
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

  // Sync props to temp state when modal opens
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

  // Helper to handle theme selection and auto-disable adaptive mode
  const handleThemeSelect = () => {
    if (systemConfig.autoTheme) {
        setSystemConfig({ autoTheme: false });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl h-[85vh] shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-64 bg-surfaceHighlight/50 border-r border-border flex flex-col p-4 hidden md:flex">
          <div className="px-2 mb-6">
            <h2 className="text-xl font-bold text-text">Settings</h2>
            <p className="text-xs text-text-sub">Global Configuration</p>
          </div>
          
          <nav className="space-y-1 flex-1">
            <button
              onClick={() => setActiveTab('system')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'system' ? 'bg-primary/10 text-primary border border-primary/10' : 'text-text-sub hover:bg-surface hover:text-text'
              }`}
            >
              <Monitor className="w-4 h-4" /> System & Appearance
            </button>
            <button
              onClick={() => setActiveTab('personalization')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'personalization' ? 'bg-primary/10 text-primary border border-primary/10' : 'text-text-sub hover:bg-surface hover:text-text'
              }`}
            >
              <User className="w-4 h-4" /> Personalization
            </button>
            <button
              onClick={() => setActiveTab('personas')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'personas' ? 'bg-primary/10 text-primary border border-primary/10' : 'text-text-sub hover:bg-surface hover:text-text'
              }`}
            >
              <UserPlus className="w-4 h-4" /> AI Personas
            </button>
          </nav>
          
          <div className="mt-auto border-t border-border pt-4 px-2 space-y-2">
            <div className="text-[10px] text-text-sub text-center opacity-60">{APP_VERSION}</div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-background min-w-0">
          <div className="flex justify-between items-center p-6 border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-10">
             <h3 className="text-lg font-bold text-text">
               {activeTab === 'system' && 'System Configuration'}
               {activeTab === 'personalization' && 'User Profile'}
               {activeTab === 'personas' && 'Manage Personas'}
             </h3>
             <button onClick={onClose} className="p-2 hover:bg-surfaceHighlight rounded-full text-text-sub hover:text-text transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            
            {/* --- SYSTEM TAB --- */}
            {activeTab === 'system' && (
              <div className="space-y-8 max-w-3xl mx-auto">
                
                {/* Theme Section */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                     <SettingsIcon className="w-5 h-5 text-primary" />
                     <h4 className="text-base font-bold text-text">Interface Theme</h4>
                  </div>
                  <div className="bg-surface border border-border rounded-xl p-6">
                     <ThemeSwitcher onThemeSelect={handleThemeSelect} />
                     
                     <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                           <div className={`p-2 rounded-lg ${systemConfig.autoTheme ? 'bg-primary/20 text-primary' : 'bg-surfaceHighlight text-text-sub'}`}>
                              <Zap className="w-5 h-5" />
                           </div>
                           <div>
                              <p className="font-bold text-sm text-text">Adaptive Theme Sync</p>
                              <p className="text-xs text-text-sub">Automatically switch themes based on current mode (e.g. Coding uses Midnight).</p>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={systemConfig.autoTheme} 
                            onChange={(e) => setSystemConfig({ autoTheme: e.target.checked })} 
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-surfaceHighlight border border-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                     </div>
                  </div>
                </section>

                {/* UX Preferences */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                     <Layout className="w-5 h-5 text-primary" />
                     <h4 className="text-base font-bold text-text">Interface Density & Effects</h4>
                  </div>
                  <div className="bg-surface border border-border rounded-xl overflow-hidden divide-y divide-border">
                     
                     {/* Density Toggle */}
                     <div className="p-4 flex items-center justify-between hover:bg-surfaceHighlight/50 transition-colors">
                        <div className="flex items-center gap-3">
                           <Smartphone className="w-5 h-5 text-text-sub" />
                           <div>
                              <p className="font-medium text-sm text-text">Compact Mode</p>
                              <p className="text-xs text-text-sub">Decrease padding for higher information density.</p>
                           </div>
                        </div>
                        <select 
                          value={systemConfig.density}
                          onChange={(e) => setSystemConfig({ density: e.target.value as any })}
                          className="bg-surfaceHighlight border border-border text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary"
                        >
                           <option value="comfortable">Comfortable</option>
                           <option value="compact">Compact</option>
                        </select>
                     </div>

                     {/* Sound Effects */}
                     <div className="p-4 flex items-center justify-between hover:bg-surfaceHighlight/50 transition-colors">
                        <div className="flex items-center gap-3">
                           <Volume2 className="w-5 h-5 text-text-sub" />
                           <div>
                              <p className="font-medium text-sm text-text">Sound Effects</p>
                              <p className="text-xs text-text-sub">Play subtle sounds for messages and actions.</p>
                           </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={systemConfig.soundEffects} 
                            onChange={(e) => setSystemConfig({ soundEffects: e.target.checked })} 
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-surfaceHighlight border border-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-sub after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                        </label>
                     </div>

                  </div>
                </section>
              </div>
            )}

            {/* --- PERSONALIZATION TAB --- */}
            {activeTab === 'personalization' && (
              <div className="space-y-8 max-w-3xl mx-auto">
                <div className="bg-surface border border-border rounded-xl p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-text-sub uppercase mb-2">Nickname</label>
                      <input 
                        type="text" 
                        value={tempPersonalization.nickname} 
                        onChange={(e) => setTempPersonalization({...tempPersonalization, nickname: e.target.value})} 
                        className="w-full bg-surfaceHighlight border border-border rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary text-sm transition-all" 
                        placeholder="How should AI address you?"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-sub uppercase mb-2">Occupation / Role</label>
                      <input 
                        type="text" 
                        value={tempPersonalization.occupation} 
                        onChange={(e) => setTempPersonalization({...tempPersonalization, occupation: e.target.value})} 
                        className="w-full bg-surfaceHighlight border border-border rounded-lg px-4 py-2.5 text-text focus:outline-none focus:border-primary text-sm transition-all" 
                        placeholder="e.g. Student, Developer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase mb-2">Default Response Style</label>
                    <div className="grid grid-cols-3 gap-3">
                       {['concise', 'balanced', 'detailed'].map((style) => (
                          <button
                            key={style}
                            onClick={() => setTempPersonalization({...tempPersonalization, responseStyle: style as any})}
                            className={`py-2 rounded-lg text-sm font-medium border capitalize transition-all ${
                               tempPersonalization.responseStyle === style 
                                 ? 'bg-primary/10 border-primary text-primary' 
                                 : 'bg-surfaceHighlight border-transparent text-text-sub hover:bg-surface'
                            }`}
                          >
                             {style}
                          </button>
                       ))}
                    </div>
                    <p className="text-xs text-text-sub mt-2">
                       {tempPersonalization.responseStyle === 'concise' && "Short, direct answers. No fluff."}
                       {tempPersonalization.responseStyle === 'balanced' && "Standard length with clear explanations."}
                       {tempPersonalization.responseStyle === 'detailed' && "In-depth, comprehensive answers with examples."}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase mb-2">Context & About You</label>
                    <textarea 
                      value={tempPersonalization.aboutYou} 
                      onChange={(e) => setTempPersonalization({...tempPersonalization, aboutYou: e.target.value})} 
                      className="w-full bg-surfaceHighlight border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-primary text-sm min-h-[100px] resize-none transition-all" 
                      placeholder="Tell Zara about your goals, interests, or background to get better responses..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase mb-2">Custom Instructions</label>
                    <textarea 
                      value={tempPersonalization.customInstructions} 
                      onChange={(e) => setTempPersonalization({...tempPersonalization, customInstructions: e.target.value})} 
                      className="w-full bg-surfaceHighlight border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:border-primary text-sm min-h-[100px] resize-none transition-all" 
                      placeholder="e.g. Always answer concisely. Never use emojis. Explain things like I'm 5."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* --- PERSONAS TAB --- */}
            {activeTab === 'personas' && (
               <div className="space-y-6 max-w-3xl mx-auto">
                 <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-xl">
                    <div>
                      <h3 className="font-bold text-text">Custom Personas</h3>
                      <p className="text-xs text-text-sub">Create specialized AI characters for different tasks.</p>
                    </div>
                    {!editingPersona && (
                      <button onClick={handleAddPersona} className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                        <UserPlus className="w-4 h-4" /> Create New
                      </button>
                    )}
                 </div>

                 {editingPersona ? (
                    <div className="bg-surface border border-border p-6 rounded-xl space-y-4 animate-fade-in relative">
                       <button onClick={() => setEditingPersona(null)} className="absolute top-4 right-4 text-text-sub hover:text-text"><X className="w-4 h-4" /></button>
                       <h4 className="font-bold text-primary">Persona Editor</h4>
                       
                       <div className="space-y-4">
                         <div>
                           <label className="block text-xs font-medium text-text-sub mb-1">Name</label>
                           <input 
                             value={editingPersona.name}
                             onChange={e => setEditingPersona({...editingPersona, name: e.target.value})}
                             placeholder="e.g. Coding Wizard"
                             className="w-full bg-surfaceHighlight border border-border rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-text-sub mb-1">Description</label>
                           <input 
                             value={editingPersona.description}
                             onChange={e => setEditingPersona({...editingPersona, description: e.target.value})}
                             placeholder="Short description for the menu"
                             className="w-full bg-surfaceHighlight border border-border rounded-lg p-2.5 text-sm focus:border-primary outline-none"
                           />
                         </div>
                         <div>
                           <label className="block text-xs font-medium text-text-sub mb-1">System Prompt</label>
                           <textarea 
                             value={editingPersona.systemPrompt}
                             onChange={e => setEditingPersona({...editingPersona, systemPrompt: e.target.value})}
                             placeholder="Define the AI's personality, rules, and knowledge base..."
                             className="w-full bg-surfaceHighlight border border-border rounded-lg p-2.5 text-sm h-32 resize-none focus:border-primary outline-none font-mono"
                           />
                         </div>
                       </div>

                       <div className="flex gap-2 justify-end pt-2">
                          <button onClick={() => setEditingPersona(null)} className="px-4 py-2 text-text-sub text-sm hover:text-text">Cancel</button>
                          <button onClick={handleSavePersona} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary/20"><Save className="w-3 h-3" /> Save Persona</button>
                       </div>
                    </div>
                 ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {personas.length === 0 && (
                          <div className="col-span-2 text-center py-12 border-2 border-dashed border-border rounded-xl text-text-sub">
                             <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-20" />
                             <p className="text-sm">No custom personas yet.</p>
                          </div>
                       )}
                       {personas.map(p => (
                          <div key={p.id} className="bg-surface border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group relative flex flex-col">
                             <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-text truncate">{p.name}</h4>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => setEditingPersona(p)} className="p-1.5 hover:bg-surfaceHighlight rounded text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                                   <button onClick={() => handleDeletePersona(p.id)} className="p-1.5 hover:bg-surfaceHighlight rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                             </div>
                             <p className="text-xs text-text-sub line-clamp-2 mb-3 flex-1">{p.description}</p>
                             <div className="text-[10px] bg-surfaceHighlight self-start px-2 py-1 rounded text-text-sub font-mono">ID: {p.id.slice(0,8)}</div>
                          </div>
                       ))}
                    </div>
                 )}
               </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-surface/80 backdrop-blur-md flex justify-end gap-3">
             <button onClick={onClose} className="px-5 py-2.5 text-text-sub hover:text-text transition-colors text-sm font-medium hover:bg-surfaceHighlight rounded-lg">Cancel</button>
             <button onClick={handleSave} className="flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 active:scale-95">
               <Save className="w-4 h-4" /> Save Changes
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
