
import React, { useState, useRef } from 'react';
import { Github, Search, Loader2, ArrowRight, Book, GitBranch, AlertCircle, FileText, Code } from 'lucide-react';
import { sendMessageToGeminiStream } from '../services/gemini';
import { Message, Role, Persona, ChatConfig } from '../types';
import { MessageItem } from './MessageItem';
import { InputArea } from './InputArea';

export const RepoMode: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Custom persona for this mode
  const analystPersona: Persona = {
    id: 'github-analyst',
    name: 'GitHub Analyst',
    description: 'Expert Code Reviewer',
    systemPrompt: '' // Handled in gemini.ts logic via ID check
  };

  const parseRepoUrl = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
    } catch (e) {}
    return null;
  };

  const fetchReadme = async (owner: string, repo: string) => {
    const branches = ['main', 'master'];
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

  const handleAnalyze = async () => {
    if (!repoUrl) return;
    
    setIsAnalyzing(true);
    setError(null);
    setMessages([]);

    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      setError("Invalid GitHub URL. Format: https://github.com/owner/repo");
      setIsAnalyzing(false);
      return;
    }

    try {
      // 1. Fetch README
      const readme = await fetchReadme(repoInfo.owner, repoInfo.repo);
      
      // 2. Construct Prompt
      let context = `Repository: ${repoUrl}\n\n`;
      if (readme) {
        context += `README.md Content:\n${readme.slice(0, 20000)}\n(Truncated if too long)\n\n`;
      } else {
        context += `Note: Could not fetch raw README.md directly. Please use search tools to analyze.\n\n`;
      }
      
      const initialPrompt = `${context} Analyze this repository. Provide a comprehensive overview of its purpose, tech stack, architecture, and key features. Explain it clearly like a senior engineer teaching a junior.`;

      // 3. Send to Gemini
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: Role.USER,
        text: initialPrompt,
        timestamp: Date.now()
      };
      
      // We don't show the huge system prompt to user, just a "Analyzing..." state
      // But for history consistency, we push a cleaner version
      const displayUserMsg: Message = {
        id: crypto.randomUUID(),
        role: Role.USER,
        text: `Analyze ${repoUrl}`,
        timestamp: Date.now()
      };
      setMessages([displayUserMsg]);

      const botMsgId = crypto.randomUUID();
      const botMsg: Message = {
        id: botMsgId,
        role: Role.MODEL,
        text: '',
        timestamp: Date.now(),
        isStreaming: true
      };
      setMessages(prev => [...prev, botMsg]);

      const config: ChatConfig = {
        model: 'gemini-2.5-flash',
        useThinking: true,
        useGrounding: true,
        interactionMode: 'developer'
      };

      await sendMessageToGeminiStream(
        [], // Empty history for fresh context
        initialPrompt, 
        [], 
        config, // Enable grounding to crawl if needed
        { nickname: 'Developer', occupation: 'Engineer', aboutYou: '', customInstructions: '', fontSize: 'medium', responseStyle: 'concise' },
        (text) => {
           setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text } : m));
        },
        analystPersona
      );

      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));

    } catch (e: any) {
      setError(e.message || "Analysis failed.");
      setMessages(prev => prev.filter(m => !m.isStreaming));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFollowUp = async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: Role.USER,
      text: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsAnalyzing(true);

    const botMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: botMsgId, role: Role.MODEL, text: '', timestamp: Date.now(), isStreaming: true }]);

    const config: ChatConfig = {
      model: 'gemini-2.5-flash',
      useThinking: false,
      useGrounding: true,
      interactionMode: 'developer'
    };

    try {
      await sendMessageToGeminiStream(
        messages, 
        text, 
        [], 
        config, 
        { nickname: 'Developer', occupation: 'Engineer', aboutYou: '', customInstructions: '', fontSize: 'medium', responseStyle: 'concise' },
        (streamText) => {
           setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, text: streamText } : m));
        },
        analystPersona
      );
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false } : m));
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, isStreaming: false, isError: true, text: e.message } : m));
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto p-4 md:p-8 animate-fade-in overflow-hidden">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent mb-2 flex items-center gap-2">
            <Github className="w-8 h-8 text-white" />
            GitHub Analyst
          </h2>
          <p className="text-text-sub">Deep dive into repositories, extract logic, and understand code.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        
        {/* Input Section (if no analysis yet) */}
        {messages.length === 0 && (
           <div className="flex-1 flex flex-col items-center justify-center p-6 glass-panel rounded-3xl border-dashed border-2 border-white/10 mb-6">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                 <GitBranch className="w-8 h-8 text-text-sub" />
              </div>
              <h3 className="text-xl font-bold mb-2">Analyze a Repository</h3>
              <p className="text-text-sub mb-6 text-center max-w-md">
                 Paste a GitHub URL to get a comprehensive overview, architectural breakdown, and code explanation.
              </p>
              
              <div className="w-full max-w-xl relative">
                 <input 
                   value={repoUrl}
                   onChange={(e) => setRepoUrl(e.target.value)}
                   placeholder="https://github.com/owner/repo"
                   className="w-full bg-black/50 border border-border rounded-xl py-4 pl-5 pr-32 text-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                   onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                 />
                 <button 
                   onClick={handleAnalyze}
                   disabled={!repoUrl || isAnalyzing}
                   className="absolute right-2 top-2 bottom-2 bg-white text-black px-4 rounded-lg font-bold text-sm hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                 >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Analyze
                 </button>
              </div>
              {error && (
                 <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                 </div>
              )}
           </div>
        )}

        {/* Results / Chat View */}
        {messages.length > 0 && (
           <div className="flex-1 flex flex-col min-h-0">
              {/* Header Compact */}
              <div className="flex items-center gap-3 mb-4 px-2">
                 <div className="flex-1 truncate bg-surfaceHighlight/50 py-1.5 px-3 rounded-lg border border-border flex items-center gap-2 text-xs font-mono text-text-sub">
                    <Github className="w-3 h-3" />
                    {repoUrl}
                 </div>
                 <button onClick={() => { setMessages([]); setRepoUrl(''); }} className="text-xs text-text-sub hover:text-text hover:underline">
                    New Analysis
                 </button>
              </div>

              {/* Chat Scroll */}
              <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
                 {messages.map(msg => (
                    <MessageItem key={msg.id} message={msg} />
                 ))}
                 {isAnalyzing && <div className="h-8 flex items-center justify-center"><Loader2 className="w-5 h-5 text-text-sub animate-spin" /></div>}
              </div>

              {/* Input */}
              <div className="pt-4">
                 <InputArea 
                    onSendMessage={handleFollowUp}
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
    </div>
  );
};
