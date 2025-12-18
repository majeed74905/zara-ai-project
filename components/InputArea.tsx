
import React, { useRef, useState, useEffect } from 'react';
import { SendHorizontal, Paperclip, X, Plus, Square, Sparkles, Mic, MicOff } from 'lucide-react';
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
  onSendMessage, onStop, isLoading, disabled, isOffline = false, viewMode = 'chat'
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isListening, setIsListening] = useState(false);
  const templates = getTemplatesForView(viewMode as ViewMode);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if ((!text.trim() && attachments.length === 0) || isLoading || disabled) return;
    onSendMessage(text, attachments);
    setText('');
    setAttachments([]);
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
  };

  return (
    <div className="w-full px-3 md:px-0">
      {/* Templates Chips - Tighter for mobile */}
      {!isLoading && !disabled && (
        <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1 no-scrollbar justify-start md:justify-center px-1">
          {templates.map(tpl => (
             <button
               key={tpl.id}
               onClick={() => setText(tpl.prompt)}
               className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0a] border border-white/5 rounded-full text-[11px] font-bold text-gray-400 hover:text-white hover:bg-[#121212] transition-all whitespace-nowrap"
             >
               <Sparkles className="w-3 h-3 opacity-50" />
               {tpl.label}
             </button>
          ))}
        </div>
      )}
      
      <div className="relative bg-[#0a0a0a] rounded-[24px] md:rounded-[32px] border border-white/10 shadow-2xl transition-all focus-within:border-violet-500/40 flex flex-col">
        {attachments.length > 0 && (
          <div className="flex gap-2 p-3 pl-6 overflow-x-auto border-b border-white/5">
            {attachments.map((att) => (
              <div key={att.id} className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                   {att.mimeType.startsWith('image/') ? (
                     <img src={att.previewUrl} alt="preview" className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-[8px] text-gray-500 font-bold uppercase">
                       {att.file.name.split('.').pop()}
                     </div>
                   )}
                </div>
                <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow-lg">
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 px-4 md:px-6 py-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Enter a prompt here"
            className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm md:text-base font-medium resize-none py-3 focus:outline-none max-h-[160px] overflow-y-auto leading-relaxed"
            rows={1}
          />

          <div className="flex items-center gap-0.5 pl-3 border-l border-white/10 ml-1">
            <button
               className={`p-2 transition-all ${isListening ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
             >
               <Mic className="w-5 h-5" />
             </button>

            {isLoading ? (
              <button onClick={onStop} className="p-2 text-white">
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!text.trim() && attachments.length === 0}
                className={`p-2 transition-all ${(!text.trim() && attachments.length === 0) ? 'text-gray-800' : 'text-white'}`}
              >
                <SendHorizontal className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center mt-2.5">
         <p className="text-[10px] text-gray-600 font-medium px-4 opacity-60">
           Zara AI may display inaccurate info.
         </p>
      </div>
    </div>
  );
};
