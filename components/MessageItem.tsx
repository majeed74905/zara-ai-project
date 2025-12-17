
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message, Attachment } from '../types';
import { Bot, User, FileText, ExternalLink, Volume2, Square, Copy, Check, Pencil, Download, WifiOff, Workflow, Eye } from 'lucide-react';
import mermaid from 'mermaid';

interface MessageItemProps {
  message: Message;
  onEdit?: (message: Message) => void;
}

// Initialize Mermaid once globally
mermaid.initialize({ 
    startOnLoad: false, 
    theme: 'default', 
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
    flowchart: {
        htmlLabels: false,
        curve: 'basis'
    }
});

// Mermaid Component with Robust Repair
const MermaidDiagram = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState('');
  const idRef = useRef(`mermaidChart-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        let cleanCode = code.trim();
        
        // Remove markdown wrapper if present
        if (cleanCode.toLowerCase().startsWith('mermaid')) {
           cleanCode = cleanCode.substring(7).trim();
        }

        // 1. Fix flowchart declaration and newlines
        cleanCode = cleanCode.replace(/^flowchart(TD|LR|BT|RL)/i, 'flowchart $1');
        cleanCode = cleanCode.replace(/^(flowchart\s+(TD|LR|BT|RL))([a-zA-Z0-9\[\(\"{])/i, '$1\n$3');

        // 2. Fix unclosed quotes in labels [ "text ] or [ text" ]
        cleanCode = cleanCode.replace(/\[\s*"?([^"\]\n]*)$/gm, '["$1"]');
        cleanCode = cleanCode.replace(/\{\s*"?([^"\}\n]*)$/gm, '{$1}');

        // 3. Robust Label Quoting: Ensure content inside brackets/parens is double-quoted
        // This handles special characters like ! - ? etc. which usually cause "got '1'" errors
        const quoteLabel = (match: string, shape: string, content: string, endShape: string) => {
          const inner = content.trim().replace(/"/g, '');
          return `${shape}"${inner}"${endShape}`;
        };
        cleanCode = cleanCode.replace(/(\[+)([^\]\n]+)(\]+)/g, (m, s, c, e) => quoteLabel(m, s, c, e));
        cleanCode = cleanCode.replace(/(\(+)([^\)\n]+)(\)+)/g, (m, s, c, e) => quoteLabel(m, s, c, e));
        cleanCode = cleanCode.replace(/(\{+)([^\}\n]+)(\}+)/g, (m, s, c, e) => quoteLabel(m, s, c, e));

        // 4. Fix node IDs: must be alphanumeric and start at line beginning or after arrow
        // Replace spaces/special chars in IDs
        cleanCode = cleanCode.split('\n').map(line => {
          let l = line.trim();
          if (!l || l.startsWith('flowchart')) return l;
          
          // Fix broken edges at end of line (e.g. "A --")
          l = l.replace(/(-+|==+|\.->)\s*$/g, '');
          
          // Ensure edges have a target
          // If a line is "ID -->", remove it or fix it. 
          // We'll just trim trailing arrows.
          l = l.replace(/(-->|->|==>)\s*$/g, '');

          return l;
        }).filter(Boolean).join('\n');

        // 5. Clean up ID names (before brackets)
        cleanCode = cleanCode.replace(/^([a-zA-Z0-9\s_\-]+)(?=[\[\(\{\s])/gm, (match, id) => {
           return id.trim().replace(/[^a-zA-Z0-9_]/g, '');
        });

        // 6. Clean up IDs after arrows
        cleanCode = cleanCode.replace(/(-->|->|==>|---)\s*([a-zA-Z0-9\s_\-]+)(?=[\[\(\{\s\n]|$)/g, (match, arrow, id) => {
           return `${arrow} ${id.trim().replace(/[^a-zA-Z0-9_]/g, '')}`;
        });

        const { svg: renderedSvg } = await mermaid.render(idRef.current, cleanCode);
        setSvg(renderedSvg);
      } catch (error) {
        setSvg(`<div class="text-red-500 font-mono text-[10px] p-3 bg-red-50 border border-red-100 rounded-lg">
          <strong class="block mb-1">Visualization Error:</strong>
          <span class="opacity-70">${(error as any).message || 'Syntax Error'}</span>
          <pre class="mt-2 opacity-50 whitespace-pre-wrap">${code}</pre>
        </div>`);
      }
    };
    renderDiagram();
  }, [code]);

  return (
    <div className="my-4 overflow-hidden rounded-xl bg-white border border-gray-200 shadow-md">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
            <Workflow className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Architectural Flow</span>
        </div>
        <div className="p-4 flex justify-center overflow-x-auto custom-scrollbar" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
};

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (!inline && match) {
    if (match[1] === 'mermaid') return <MermaidDiagram code={String(children).replace(/\n$/, '')} />;
    return (
      <div className="relative group my-4 rounded-lg overflow-hidden border border-white/10 bg-[#1e1e1e]">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-white/5">
           <span className="text-xs text-gray-400 font-mono">{match[1]}</span>
           <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
             {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
             {copied ? 'Copied' : 'Copy code'}
           </button>
        </div>
        <pre className="!m-0 !p-4 !bg-transparent overflow-x-auto"><code className={className} {...props}>{children}</code></pre>
      </div>
    );
  }
  return <code className={`${className} bg-primary/10 text-primary px-1 py-0.5 rounded text-sm`} {...props}>{children}</code>;
};

const AttachmentGrid = ({ attachments }: { attachments: Attachment[] }) => {
  if (!attachments || attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-3 mb-2">
      {attachments.map((att) => (
        <div key={att.id} className="relative group max-w-[200px] border border-white/10 bg-surfaceHighlight/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
          {att.mimeType.startsWith('image/') ? (
            <div className="relative aspect-video w-full cursor-pointer overflow-hidden">
               <img src={att.previewUrl} alt="attachment" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Eye className="w-6 h-6 text-white" />
               </div>
            </div>
          ) : (
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-text truncate">{att.file?.name || 'Document'}</p>
                <p className="text-[10px] text-text-sub uppercase">{att.mimeType.split('/')[1]}</p>
              </div>
            </div>
          )}
          <a 
            href={att.previewUrl} 
            download={att.file?.name} 
            className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 backdrop-blur rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-3 h-3" />
          </a>
        </div>
      ))}
    </div>
  );
};

const MessageItemComponent: React.FC<MessageItemProps> = ({ message, onEdit }) => {
  const isUser = message.role === Role.USER;
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    return () => { if (isSpeaking) window.speechSynthesis.cancel(); };
  }, [isSpeaking]);

  const handleSpeak = () => {
    window.speechSynthesis.cancel();
    const cleanText = message.text.replace(/[*_#`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\[.*?\]/g, ''); 
    const newUtterance = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices.find(v => v.lang.startsWith('en'));
    if (preferredVoice) newUtterance.voice = preferredVoice;
    newUtterance.onend = () => setIsSpeaking(false);
    newUtterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(newUtterance);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-fade-in`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-border ${isUser ? 'bg-surfaceHighlight shadow-sm' : 'bg-transparent'}`}>
          {isUser ? (
            <User className="w-5 h-5 text-text" />
          ) : (
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${message.isOffline ? 'bg-orange-500' : 'bg-gradient-to-br from-primary to-accent'}`}>
                {message.isOffline ? <WifiOff className="w-3.5 h-3.5 text-white" /> : <Bot className="w-3.5 h-3.5 text-white" />}
            </div>
          )}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full min-w-0`}>
          <div className={`flex items-end gap-2 max-w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm overflow-hidden ${
                isUser ? 'bg-surfaceHighlight text-text border border-white/5' : 'bg-transparent text-text-sub w-full markdown-body'
              }`}
            >
              {isUser ? (
                <div className="whitespace-pre-wrap">{message.text}</div>
              ) : (
                 <div className="relative">
                   <ReactMarkdown components={{ code: CodeBlock }}>{message.text}</ReactMarkdown>
                   {message.isStreaming && <span className="inline-block w-2.5 h-2.5 rounded-full bg-text-sub ml-1 animate-pulse align-baseline" />}
                 </div>
              )}
              {message.attachments && <AttachmentGrid attachments={message.attachments} />}
            </div>
          </div>

          {!isUser && !message.isError && (
            <div className="mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={isSpeaking ? () => { window.speechSynthesis.cancel(); setIsSpeaking(false); } : handleSpeak} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-text-sub hover:text-text hover:bg-surfaceHighlight transition-colors">
                  {isSpeaking ? <Square className="w-3 h-3 fill-current" /> : <Volume2 className="w-3 h-3" />}
                  {isSpeaking ? 'Stop' : 'Read'}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const MessageItem = React.memo(MessageItemComponent, (prev, next) => {
  return (
    prev.message.id === next.message.id &&
    prev.message.text === next.message.text &&
    prev.message.isStreaming === next.message.isStreaming &&
    prev.message.isError === next.message.isError &&
    prev.message.attachments?.length === next.message.attachments?.length
  );
});
