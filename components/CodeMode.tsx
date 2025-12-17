
import React, { useState } from 'react';
import { Code2, Bug, Zap, Book, Loader2, Play, Github, Search, GitBranch, ArrowRight, AlertCircle, FileText, Globe } from 'lucide-react';
import { generateCodeAssist, sendMessageToGeminiStream } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import { Message, Role, ChatConfig, Persona } from '../types';
import { MessageItem } from './MessageItem';
import { InputArea } from './InputArea';

export const CodeMode: React.FC = () => {
  const [mode, setMode] = useState<'snippet' | 'repo'>('snippet');
  
  // Snippet Mode State
  const [inputCode, setInputCode] = useState('');
  // Language state removed for auto-detection
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [activeTask, setActiveTask] = useState<'debug' | 'explain' | 'optimize' | 'generate'>('debug');

  // Repo Mode State
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [repoMessages, setRepoMessages] = useState<Message[]>([]);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Custom persona for repo analysis
  const analystPersona: Persona = {
    id: 'github-analyst',
    name: 'GitHub Analyst',
    description: 'Expert Code Reviewer',
    systemPrompt: 'You are an expert software architect and code analyst. Your goal is to analyze repositories and provide structured, insightful summaries.'
  };

  // --- Snippet Logic ---
  const handleRunSnippet = async () => {
    if (!inputCode) return;
    setLoading(true);
    try {
      // Auto-detect enabled by removing language param
      const content = await generateCodeAssist(inputCode, activeTask);
      setResult(content);
    } catch (e) {
      setResult("Error processing code.");
    }
    setLoading(false);
  };

  const tasks = [
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'explain', label: 'Explain', icon: Book },
    { id: 'optimize', label: 'Optimize', icon: Zap },
    { id: 'generate', label: 'Generate', icon: Code2 },
  ];

  // --- Repo Logic ---
  const parseRepoUrl = (url: string) => {
    try {
      // Clean URL: remove .git extension and trailing slashes
      const cleanUrl = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
      const u = new URL(cleanUrl);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1], url: cleanUrl };
      }
    } catch (e) {}
    return null;
  };

  const fetchReadme = async (owner: string, repo: string) => {
    const branches = ['main', 'master', 'dev', 'develop'];
    for (const branch of branches) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`);
        if (res.ok) return await res.text();
      } catch (e) {
        // continue
      }
    }
    return null;
  };

  const fetchRepoDetails = async (owner: string, repo: string) => {
    try {
      const [metaRes, contentRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`).then(r => r.ok ? r.json() : null),
        fetch(`https://api.github.com/repos/${owner}/${repo}/contents`).then(r => r.ok ? r.json() : null)
      ]);
      return { meta: metaRes, files: contentRes };
    } catch (e) {
      return { meta: null, files: null };
    }
  };

  const handleAnalyzeRepo = async () => {
    if (!repoUrl) return;
    
    setIsAnalyzing(true);
    setRepoError(null);
    setRepoMessages([]);

    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      setRepoError("Invalid GitHub URL. Format: https://github.com/owner/repo");
      setIsAnalyzing(false);
      return;
    }

    try {
      // 1. Fetch Data (Readme + API Metadata)
      const readme = await fetchReadme(repoInfo.owner, repoInfo.repo);
      const { meta, files } = await fetchRepoDetails(repoInfo.owner, repoInfo.repo);
      
      // 2. Construct Data Context
      let context = `Target Repository: ${repoInfo.url}\n\n`;
      
      if (meta) {
        context += `METADATA:\n- Name: ${meta.name}\n- Description: ${meta.description || 'N/A'}\n- Stars: ${meta.stargazers_count}\n- Forks: ${meta.forks_count}\n- Language: ${meta.language}\n\n`;
      } else {
        context += `METADATA: Not available via API. Use Google Search to find Stars, Forks, and Description.\n\n`;
      }

      if (files && Array.isArray(files)) {
        const fileList = files.map((f: any) => `${f.type === 'dir' ? '📁' : '📄'} ${f.name}`).join('\n');
        context += `FILE LIST (Root Directory Contents):\n${fileList}\n\n`;
      } else {
        context += `FILE LIST: Not available via API. Infer from README or Search.\n\n`;
      }

      if (readme) {
        context += `--- START README.md ---\n${readme.slice(0, 20000)}\n--- END README.md ---\n\n`;
      } else {
        context += `README: Could not fetch raw README.md directly. Use Google Search to find details.\n\n`;
      }
      
      const initialPrompt = `
      ${context}
      
      TASK: Analyze this GitHub repository and provide a structured summary based on the metadata and file list provided above.
      
      CRITICAL INSTRUCTION: You MUST use the following layout EXACTLY. Do not deviate. Use appropriate emojis.
      
      Layout Template:
      
      Here's a quick summary of the GitHub repository you linked:

      📂 **Repository Overview**
      🔗 **URL**: ${repoInfo.url}
      👤 **Owner**: ${repoInfo.owner}
      📦 **Repository Name**: ${repoInfo.repo}
      🌟 **Stars**: ${meta ? meta.stargazers_count : '[Find via Search]'}
      🍴 **Forks**: ${meta ? meta.forks_count : '[Find via Search]'}
      🐍 **Languages**: ${meta ? meta.language : '[Find via Search]'}
      📝 **Description**: ${meta ? meta.description : '[Find via Search]'}

      📂 **What's Inside**
      [One sentence summary of contents]. Some of the files include:
      * **[File/Folder Name]**: [Brief explanation of its purpose based on standard conventions]
      * **[File/Folder Name]**: [Brief explanation of its purpose]
      ... (List 4-5 key files from the FILE LIST provided above. Do NOT say "I cannot browse".)

      📝 **Notes**
      * [Key Observation 1 - e.g. Code quality, maturity, or specific framework used]
      * [Key Observation 2 - e.g. Usage use case or target audience]
      * [Key Observation 3 - e.g. Missing documentation or specific dependencies]

      If you cannot find specific stats like Stars/Forks in the provided metadata, make a reasonable estimate using Google Search or state "N/A".
      `;

      // 3. Send to Gemini
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: Role.USER,
        text: `Analyze ${repoInfo.url}`,
        timestamp: Date.now()
      };
      setRepoMessages([userMsg]);

      const botMsgId = crypto.randomUUID();
      const botMsg: Message = {
        id: botMsgId,
        role: Role.MODEL,
        text: '',
        timestamp: Date.now(),
        isStreaming: true
      };
      setRepoMessages(prev => [...prev, botMsg]);

      const config: ChatConfig = {
        model: 'gemini-2.5-flash',
        useThinking: false,
        useGrounding: true, // Essential for fallback
        interactionMode: 'developer'
      };

      await sendMessageToGeminiStream(
        [], 
        initialPrompt, 
        [], 
        config, 
        { nickname: 'Developer', occupation: 'Engineer', aboutYou: '', customInstructions: '', fontSize: 'medium', responseStyle: 'concise' },
        (text) => {
           setRepoMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text } : m));
        },
        analystPersona
      );

      setRepoMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));

    } catch (e: any) {
      setRepoError(e.message || "Analysis failed.");
      setRepoMessages(prev => prev.filter(m => !m.isStreaming));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRepoChat = async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: Role.USER,
      text: text,
      timestamp: Date.now()
    };
    setRepoMessages(prev => [...prev, userMsg]);
    setIsAnalyzing(true);

    const botMsgId = crypto.randomUUID();
    setRepoMessages(prev => [...prev, { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true }]);

    const config: ChatConfig = {
      model: 'gemini-2.5-flash',
      useThinking: false,
      useGrounding: true,
      interactionMode: 'developer'
    };

    try {
      await sendMessageToGeminiStream(
        repoMessages, 
        text, 
        [], 
        config, 
        { nickname: 'Developer', occupation: 'Engineer', aboutYou: '', customInstructions: '', fontSize: 'medium', responseStyle: 'concise' },
        (streamText) => {
           setRepoMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: streamText } : m));
        },
        analystPersona
      );
      setRepoMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
    } catch (e: any) {
      setRepoMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false, isError: true, text: e.message } : m));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-8 animate-fade-in max-w-6xl mx-auto overflow-hidden">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 flex-shrink-0">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Code Architect
          </h2>
          <p className="text-text-sub">Universal code analysis. Auto-detects any language.</p>
        </div>
        
        <div className="flex gap-2 bg-surfaceHighlight p-1 rounded-xl">
           <button
             onClick={() => setMode('snippet')}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'snippet' ? 'bg-surface shadow text-primary' : 'text-text-sub hover:text-text'
             }`}
           >
              <Code2 className="w-4 h-4" /> Snippet Editor
           </button>
           <button
             onClick={() => setMode('repo')}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'repo' ? 'bg-surface shadow text-primary' : 'text-text-sub hover:text-text'
             }`}
           >
              <Github className="w-4 h-4" /> Repo Analysis
           </button>
        </div>
      </div>

      {/* SNIPPET MODE */}
      {mode === 'snippet' && (
        <>
          <div className="flex justify-end mb-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-surfaceHighlight border border-border rounded-full text-xs text-text-sub">
                <Globe className="w-3 h-3" />
                <span>Auto-Detecting Language</span>
             </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
            <div className="flex flex-col gap-4 overflow-y-auto">
              <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col min-h-[400px]">
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 flex-shrink-0">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => setActiveTask(task.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                        activeTask === task.id 
                          ? 'bg-primary text-white' 
                          : 'bg-surfaceHighlight text-text-sub hover:bg-surfaceHighlight/80'
                      }`}
                    >
                      <task.icon className="w-3.5 h-3.5" />
                      {task.label}
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={activeTask === 'generate' ? "Describe the code you want to generate in any language..." : "Paste your code here (JS, Python, Go, Rust, SQL, etc.)..."}
                  className="flex-1 bg-background rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 text-text border border-border"
                />
                
                <div className="mt-4 flex justify-end flex-shrink-0">
                  <button
                    onClick={handleRunSnippet}
                    disabled={loading || !inputCode}
                    className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-2 rounded-lg font-medium transition-all hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    Execute
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl overflow-y-auto min-h-[400px] markdown-body custom-scrollbar touch-pan-y">
              {result ? (
                <ReactMarkdown>{result}</ReactMarkdown>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-text-sub/30">
                  <Code2 className="w-16 h-16 mb-4" />
                  <p>Output will appear here</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* REPO MODE */}
      {mode === 'repo' && (
         <div className="flex-1 flex flex-col min-h-0">
            {/* Input Phase */}
            {repoMessages.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center p-6 glass-panel rounded-3xl border-dashed border-2 border-white/10">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                     <GitBranch className="w-8 h-8 text-text-sub" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-text">Analyze Repository</h3>
                  <p className="text-text-sub mb-6 text-center max-w-md">
                     Paste a GitHub URL to analyze tech stack, architecture, and code quality.
                  </p>
                  
                  <div className="w-full max-w-xl relative">
                     <input 
                       value={repoUrl}
                       onChange={(e) => setRepoUrl(e.target.value)}
                       placeholder="https://github.com/owner/repo"
                       className="w-full bg-background border border-border rounded-xl py-4 pl-5 pr-32 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                       onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeRepo()}
                     />
                     <button 
                       onClick={handleAnalyzeRepo}
                       disabled={!repoUrl || isAnalyzing}
                       className="absolute right-2 top-2 bottom-2 bg-primary text-white px-4 rounded-lg font-bold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center gap-2"
                     >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Analyze
                     </button>
                  </div>
                  {repoError && (
                     <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" /> {repoError}
                     </div>
                  )}
               </div>
            ) : (
               /* Chat Phase */
               <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center gap-3 mb-4 px-2">
                     <div className="flex-1 truncate bg-surfaceHighlight/50 py-1.5 px-3 rounded-lg border border-border flex items-center gap-2 text-xs font-mono text-text-sub">
                        <Github className="w-3 h-3" />
                        {repoUrl}
                     </div>
                     <button onClick={() => { setRepoMessages([]); setRepoUrl(''); }} className="text-xs text-text-sub hover:text-text hover:underline">
                        New Analysis
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-2 custom-scrollbar space-y-4 mb-4">
                     {repoMessages.map(msg => (
                        <MessageItem key={msg.id} message={msg} />
                     ))}
                     {isAnalyzing && (
                        <div className="flex justify-center p-2">
                           <Loader2 className="w-5 h-5 text-text-sub animate-spin" />
                        </div>
                     )}
                  </div>

                  <div className="pt-2 border-t border-border">
                     <InputArea 
                        onSendMessage={handleRepoChat}
                        onStop={() => {}}
                        isLoading={isAnalyzing}
                        disabled={false}
                        editMessage={null}
                        onCancelEdit={() => {}}
                        viewMode="code"
                     />
                  </div>
               </div>
            )}
         </div>
      )}

    </div>
  );
};
