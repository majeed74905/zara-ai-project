
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Role, Message, Attachment } from '../types';
import { Bot, User, FileText, Volume2, Square, Copy, Check, Download, WifiOff, Workflow, Eye, Sparkles } from 'lucide-react';
import mermaid from 'mermaid';

interface MessageItemProps {
  message: Message;
  onEdit?: (message: Message) => void;
}

mermaid.initialize({ 
    startOnLoad: false, 
    theme: 'dark', 
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif',
});

const MermaidDiagram = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState('');
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg: renderedSvg } = await mermaid.render(idRef.current, code);
        setSvg(renderedSvg);
      } catch (error) {
        setSvg(`<div class="p-4 text-xs text-red-400 bg-red-400/5 rounded-xl border border-red-400/20">Diagram error</div>`);
      }
    };
    renderDiagram();
  }, [code]);

  return <div className="my-4 overflow-x-auto glass p-4 rounded-2xl flex justify-center shadow-inner" dangerouslySetInnerHTML={{ __html: svg }} />;
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
      <div className="relative group my-4 rounded-xl overflow-hidden border border-white/5 bg-[#0c0c0e] shadow-2xl">
        <div className="flex items-center justify-between px-4 py-1.5 bg-white/[0.03] border-b border-white/5">
           <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{match[1]}</span>
           <button onClick={handleCopy} className="flex items-center gap-1 text-[9px] font-bold text-gray-500 hover:text-white transition-all uppercase tracking-widest">
             {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
             {copied ? 'Copied' : 'Copy'}
           </button>
        </div>
        <pre className="!m-0 !p-4 !bg-transparent overflow-x-auto text-[13px] leading-relaxed custom-scrollbar"><code className={className} {...props}>{children}</code></pre>
      </div>
    );
  }
  return <code className={`${className} bg-primary/10 text-primary px-1 py-0.5 rounded text-[13px] font-medium`} {...props}>{children}</code>;
};

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleSpeak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.text.replace(/[*_#`]/g, ''));
    utterance.onend = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-5`}>
      <div className={`flex max-w-[95%] md:max-w-[85%] gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-xl flex items-center justify-center border transition-all duration-500 ${isUser ? 'bg-[#18181b] border-white/5 shadow-lg' : 'bg-gradient-to-br from-primary to-accent border-transparent shadow-xl ring-1 ring-primary/20 shadow-primary/20'}`}>
          {isUser ? (
            <User className="w-4 h-4 text-gray-300" />
          ) : (
            message.isOffline ? <WifiOff className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4 text-white fill-white" />
          )}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
          <div className={`px-4 py-2.5 rounded-[18px] text-[14px] md:text-[15px] leading-[1.5] transition-all duration-500 ${
              isUser 
                ? 'bg-[#18181b] text-gray-200 border border-white/5 shadow-xl rounded-tr-none' 
                : 'bg-violet-500/5 text-gray-300 w-full markdown-body rounded-tl-none border border-violet-500/10'
            }`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap font-medium">{message.text}</div>
            ) : (
              <div className="relative">
                <ReactMarkdown components={{ code: CodeBlock }}>{message.text}</ReactMarkdown>
                {message.isStreaming && (
                  <div className="inline-flex gap-0.5 ml-1 align-middle">
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-1 rounded-full bg-primary animate-bounce" />
                  </div>
                )}
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
               <div className="flex flex-wrap gap-2 mt-3">
                  {message.attachments.map(att => (
                    <div key={att.id} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-black/40 group cursor-pointer hover:border-primary/50 transition-all">
                       {att.mimeType.startsWith('image/') ? (
                         <img src={att.previewUrl} alt="attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-gray-500 font-bold">
                           <FileText className="w-5 h-5 mb-1 text-gray-400" />
                           {att.mimeType.split('/')[1]?.toUpperCase()}
                         </div>
                       )}
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                       </div>
                    </div>
                  ))}
               </div>
            )}
          </div>

          {!isUser && !message.isError && (
            <div className="mt-1.5 flex items-center gap-3 px-1">
               <button onClick={isSpeaking ? () => { window.speechSynthesis.cancel(); setIsSpeaking(false); } : handleSpeak} className="text-[9px] font-black uppercase tracking-widest text-violet-400/60 hover:text-violet-400 transition-all flex items-center gap-1">
                  {isSpeaking ? <Square className="w-2 h-2 fill-current" /> : <Volume2 className="w-2.5 h-2.5" />}
                  {isSpeaking ? 'Stop' : 'Play'}
               </button>
               <button onClick={() => { navigator.clipboard.writeText(message.text); }} className="text-[9px] font-black uppercase tracking-widest text-violet-400/60 hover:text-violet-400 transition-all flex items-center gap-1">
                  <Copy className="w-2.5 h-2.5" /> Copy
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
