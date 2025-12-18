
import React, { useRef, useState, useEffect } from 'react';
import { SendHorizontal, Paperclip, X, Plus, Square, Info, Pencil, Sparkles, Mic, MicOff, WifiOff } from 'lucide-react';
import { Attachment, Message, ViewMode } from '../types';
import { validateFile, createAttachment } from '../utils/fileUtils';
import { getTemplatesForView } from '../constants/templates';

interface InputAreaProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled: boolean;
  isOffline?: boolean;
  editMessage: Message | null;
  onCancelEdit: () => void;
  viewMode?: ViewMode;
}

export const InputArea: React.FC<InputAreaProps> = ({ 
  onSendMessage, 
  onStop, 
  isLoading, 
  disabled,
  isOffline = false,
  editMessage,
  onCancelEdit,
  viewMode = 'chat'
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef('');

  const templates = getTemplatesForView(viewMode as ViewMode);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        const base = baseTextRef.current;
        const spacer = base && !base.endsWith(' ') && currentTranscript ? ' ' : '';
        setText(base + spacer + currentTranscript);
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isOffline) return;
    if (!recognitionRef.current) return;
    if (isListening) recognitionRef.current.stop();
    else {
      baseTextRef.current = text;
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    if (editMessage) {
      setText(editMessage.text);
      setAttachments(editMessage.attachments || []);
      baseTextRef.current = editMessage.text; 
    } else {
      setText('');
      setAttachments([]);
    }
  }, [editMessage]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading || disabled) return;
    if (isListening && recognitionRef.current) recognitionRef.current.stop();
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isOffline || !e.target.files) return;
    const files = Array.from(e.target.files) as File[];
    for (const file of files) {
      const error = validateFile(file);
      if (error) { alert(error); continue; }
      try {
        const attachment = await createAttachment(file);
        setAttachments((prev) => [...prev, attachment]);
      } catch (err) {}
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((a) => a.id !== id));

  const applyTemplate = (prompt: string) => {
    const newText = text + (text ? ' ' : '') + prompt;
    setText(newText);
    baseTextRef.current = newText;
    if (textareaRef.current) textareaRef.current.focus();
  };

  return (
    <div className="w-full px-4 relative">
      {/* Horizontal Scrolling Chips */}
      {!editMessage && !isLoading && !disabled && !isOffline && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar justify-center md:justify-start">
          {templates.map(tpl => (
             <button
               key={tpl.id}
               onClick={() => applyTemplate(tpl.prompt)}
               className="flex items-center gap-2 px-4 py-2 bg-[#121214] border border-white/5 rounded-full text-xs font-bold text-gray-500 hover:text-white hover:border-white/10 transition-all whitespace-nowrap shadow-sm"
             >
               <Sparkles className="w-3 h-3 opacity-50" />
               {tpl.label}
             </button>
          ))}
        </div>
      )}
      
      <div className={`relative bg-[#0c0c0e] rounded-full border transition-all focus-within:border-white/20 flex flex-col shadow-2xl ${editMessage ? 'border-primary/30' : 'border-white/5'}`}>
        
        {attachments.length > 0 && (
          <div className="flex gap-3 p-3 pl-6 overflow-x-auto border-b border-white/5">
            {attachments.map((att) => (
              <div key={att.id} className="relative group flex-shrink-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-black/20">
                   {att.mimeType.startsWith('image/') ? (
                     <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-gray-500">
                       <Plus className="w-4 h-4 mb-1" />
                       {att.file.name.split('.').pop()?.toUpperCase()}
                     </div>
                   )}
                </div>
                <button onClick={() => removeAttachment(att.id)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-lg">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 px-4 py-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-500 hover:text-white transition-colors"
            disabled={disabled || isLoading || isOffline}
          >
            <Plus className="w-6 h-6" />
          </button>
          <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf,text/*" />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a prompt here"
            disabled={disabled}
            className="flex-1 bg-transparent text-white placeholder-gray-600 text-base font-medium resize-none py-3 focus:outline-none max-h-[200px] overflow-y-auto leading-relaxed"
            rows={1}
          />

          {/* Action Group with Vertical Separator */}
          <div className="flex items-center gap-1 pl-3 pr-1 border-l border-white/10 ml-2">
            <button
               onClick={toggleListening}
               className={`p-3 rounded-full transition-all ${isListening ? 'text-red-500 animate-pulse bg-red-500/10' : 'text-gray-500 hover:text-white'}`}
               disabled={disabled || isLoading || isOffline}
             >
               {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
             </button>

            {isLoading ? (
              <button onClick={onStop} className="p-3 text-white hover:text-red-400">
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={(!text.trim() && attachments.length === 0) || disabled}
                className={`p-3 transition-all ${(!text.trim() && attachments.length === 0) || disabled ? 'text-gray-800' : 'text-white hover:scale-110'}`}
              >
                <SendHorizontal className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center mt-3 mb-1 px-4">
         <p className="text-[11px] text-gray-700 font-medium leading-relaxed">
           Zara AI may display inaccurate info, including about people, so double-check its responses.
         </p>
      </div>
    </div>
  );
};
