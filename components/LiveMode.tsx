
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Radio, AlertTriangle, User, Sparkles, Zap, AudioLines, RefreshCw, Heart, Globe, Play, ExternalLink, Music, Youtube, X, WifiOff, Disc, Settings, AlertCircle, Keyboard } from 'lucide-react';
import { getAI, buildSystemInstruction, MEDIA_PLAYER_TOOL } from '../services/gemini';
import { float32ToInt16, base64ToUint8Array, decodeAudioData, arrayBufferToBase64 } from '../utils/audioUtils';
import { Modality, LiveServerMessage } from '@google/genai';
import { PersonalizationConfig, MediaAction } from '../types';

interface LiveModeProps {
  personalization: PersonalizationConfig;
}

interface LiveMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export const LiveMode: React.FC<LiveModeProps> = ({ personalization }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Ready to connect');
  const [volume, setVolume] = useState(0);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Media Card for YouTube/Spotify fallback/control
  const [mediaCard, setMediaCard] = useState<{title: string, url: string, platform: 'youtube' | 'spotify'} | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [displaySpeed, setDisplaySpeed] = useState(1.0);
  const playbackSpeedRef = useRef(1.0);
  
  const isActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const isConnectedRef = useRef(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  
  const nextStartTimeRef = useRef<number>(0);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Text Input for Listener Mode
  const [textInput, setTextInput] = useState('');
  const [hasMicAccess, setHasMicAccess] = useState(true);

  // Offline detection logic for Live Mode
  useEffect(() => {
    const handleOffline = () => {
      if (isActiveRef.current) {
        cleanup();
        setError("Connection lost. Offline.");
        setStatus("Offline");
      }
    };
    window.addEventListener('offline', handleOffline);
    return () => window.removeEventListener('offline', handleOffline);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const cleanup = () => {
    isActiveRef.current = false;
    isConnectedRef.current = false;
    
    if (isMountedRef.current) {
      setIsActive(false);
      setIsAiSpeaking(false);
      setVolume(0);
      setNotification(null);
      setMediaCard(null);
      setHasMicAccess(true); // Reset assumption
    }
    
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch(e) {}
        sessionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
      });
      mediaStreamRef.current = null;
    }

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
      } catch(e) {}
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
    if (inputAudioContextRef.current) {
      try { inputAudioContextRef.current.close(); } catch(e) {}
      inputAudioContextRef.current = null;
    }

    audioQueueRef.current.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    audioQueueRef.current = [];
    nextStartTimeRef.current = 0;
    
    processingQueueRef.current = Promise.resolve();
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, []);

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    const nextIndex = (speeds.indexOf(displaySpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];
    setDisplaySpeed(newSpeed);
    playbackSpeedRef.current = newSpeed;
  };

  const downsampleBuffer = (buffer: Float32Array, inputRate: number, outputRate: number) => {
    if (outputRate === inputRate) return buffer;
    if (outputRate > inputRate) return buffer;
    
    const ratio = inputRate / outputRate;
    const newLength = Math.floor(buffer.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const offset = Math.floor(i * ratio);
      result[i] = buffer[offset];
    }
    return result;
  };

  const schedulePlayback = (buffer: AudioBuffer) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    
    // OUTPUT VOLUME BOOST (200%)
    const gainNode = ctx.createGain();
    gainNode.gain.value = 2.0; 
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const currentSpeed = playbackSpeedRef.current;
    source.playbackRate.value = currentSpeed;

    const now = ctx.currentTime;
    // Tighter scheduling window: 0.02s instead of 0.05s for lower latency
    if (nextStartTimeRef.current < now) {
        nextStartTimeRef.current = now + 0.02;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration / currentSpeed;
    
    if (isMountedRef.current) setIsAiSpeaking(true);
    audioQueueRef.current.push(source);
    
    source.onended = () => {
       const idx = audioQueueRef.current.indexOf(source);
       if (idx > -1) audioQueueRef.current.splice(idx, 1);
       if (audioQueueRef.current.length === 0 && isMountedRef.current) {
         setIsAiSpeaking(false);
       }
    };
  };

  const handleSendText = () => {
     if (!textInput.trim() || !sessionRef.current) return;
     
     // Send Text via Live API
     try {
        sessionRef.current.send({ parts: [{ text: textInput }] });
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: textInput }]);
        setTextInput('');
     } catch (e) {
        console.error("Failed to send text in live mode", e);
        setNotification("Text input not supported in this session.");
     }
  };

  const connect = async () => {
    if (!window.isSecureContext) {
        setError("Secure Context Required (HTTPS)");
        return;
    }

    if (!navigator.onLine) {
        setError("No internet connection.");
        return;
    }
    
    setError(null);
    setMessages([]); 
    setIsActive(true); 
    setNotification(null);
    setMediaCard(null);
    isActiveRef.current = true;
    setStatus('Initializing...');

    try {
      // 1. Initialize Output Audio Context FIRST (CRITICAL FOR MOBILE)
      // This ensures we capture the 'user gesture' immediately.
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass(); 
      if (outputCtx.state === 'suspended') {
          await outputCtx.resume();
      }
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 2. Get Microphone Stream (Graceful Fallback)
      let stream: MediaStream | null = null;
      
      try {
         // Attempt bare minimum constraint first to maximize success
         stream = await navigator.mediaDevices.getUserMedia({ audio: true });
         setHasMicAccess(true);
      } catch (e) {
         console.warn("Microphone access failed", e);
         setHasMicAccess(false);
         // Do not return/throw - proceed to listener mode
      }
      
      mediaStreamRef.current = stream;

      // 3. Connect to Gemini Live
      setStatus('Connecting to Zara...');
      const ai = getAI();
      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (isActiveRef.current) {
                isConnectedRef.current = true;
                if (isMountedRef.current) {
                    setStatus(stream ? 'Listening...' : 'Listener Mode (Mic Off)');
                    if (!stream) {
                        setNotification("Microphone unavailable. You can listen or type.");
                    }
                }
            }
          },
          onmessage: async (message: LiveServerMessage) => {
             if (!isActiveRef.current) return;

             // Handle Tool Calls (Media Player)
             if (message.toolCall) {
                const calls = message.toolCall.functionCalls;
                if (calls && calls.length > 0) {
                   const call = calls[0];
                   if (call.name === 'play_media') {
                       const args = call.args as any;
                       let url = '';
                       const platform = args.platform === 'spotify' ? 'spotify' : 'youtube';

                       if (platform === 'spotify') {
                           url = `https://open.spotify.com/search/${encodeURIComponent(args.query)}`;
                       } else {
                           const encodedQuery = encodeURIComponent(args.query);
                           url = `https://www.youtube.com/results?search_query=${encodedQuery}`;
                       }

                       if (isMountedRef.current) {
                          setMediaCard({ title: args.title, url, platform });
                          
                          try {
                             const win = window.open(url, '_blank', 'noopener,noreferrer');
                             if (win) {
                                 win.focus();
                                 setNotification(`Playing ${args.title} on ${platform === 'spotify' ? 'Spotify' : 'YouTube'}...`);
                             } else {
                                 setNotification("Popup blocked. Click 'Open' below.");
                             }
                          } catch(e) {
                             setNotification("Tap 'Open' below to play.");
                          }
                          setTimeout(() => setNotification(null), 5000);
                       }

                       if (sessionRef.current) {
                          sessionRef.current.sendToolResponse({
                              functionResponses: [{
                                  id: call.id,
                                  name: call.name,
                                  response: { result: "Media link generated and displayed to user." }
                              }]
                          });
                       }
                   }
                }
             }

             // Handle Text Transcription
             let newText = '';
             let role: 'user' | 'model' | null = null;

             if (message.serverContent?.inputTranscription) {
                newText = message.serverContent.inputTranscription.text;
                role = 'user';
             } else if (message.serverContent?.outputTranscription) {
                newText = message.serverContent.outputTranscription.text;
                role = 'model';
             }

             if (role && newText && isMountedRef.current) {
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === role) {
                        return [...prev.slice(0, -1), { ...lastMsg, text: lastMsg.text + newText }];
                    } else {
                        return [...prev, { id: crypto.randomUUID(), role, text: newText }];
                    }
                });
             }

             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio) {
               const ctx = audioContextRef.current;
               if (ctx) {
                   try {
                       const audioBytes = base64ToUint8Array(base64Audio);
                       const decodingPromise = decodeAudioData(audioBytes, ctx, 24000, 1);
                       processingQueueRef.current = processingQueueRef.current
                          .then(() => decodingPromise)
                          .then(buffer => schedulePlayback(buffer))
                          .catch(() => {}); 
                   } catch(e) {}
               }
             }

             // Handle Interruption
             if (message.serverContent?.interrupted) {
                processingQueueRef.current = Promise.resolve();
                audioQueueRef.current.forEach(s => { 
                    try { s.stop(); s.disconnect(); } catch(e) {} 
                });
                audioQueueRef.current = [];
                if (audioContextRef.current) {
                    nextStartTimeRef.current = audioContextRef.current.currentTime;
                }
                if (isMountedRef.current) setIsAiSpeaking(false);
             }
          },
          onclose: () => {
            if (isActiveRef.current) { 
                cleanup();
                if (isMountedRef.current) setStatus('Disconnected');
            }
          },
          onerror: (err) => {
             const msg = err instanceof Error ? err.message : String(err);
             console.error("Gemini Live Error:", msg);
             // Don't kill the session immediately on minor errors, but log them
             if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('quota')) {
                 cleanup();
                 if (isMountedRef.current) {
                    setError(`Connection Error: ${msg}`);
                    setStatus('Error');
                 }
             }
          }
        },
        config: {
            responseModalities: [Modality.AUDIO],
            tools: [{ functionDeclarations: [MEDIA_PLAYER_TOOL] }],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: buildSystemInstruction(personalization)
        }
      });

      sessionRef.current = session;

      // 4. Input Setup (Only if mic is available)
      if (stream) {
          const inputCtx = new AudioContextClass();
          if (inputCtx.state === 'suspended') await inputCtx.resume();
          inputAudioContextRef.current = inputCtx;

          const source = inputCtx.createMediaStreamSource(stream);
          const inputGain = inputCtx.createGain();
          inputGain.gain.value = 1.5; 
          source.connect(inputGain);

          const processor = inputCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          inputGain.connect(processor);
          processor.connect(inputCtx.destination); 

          processor.onaudioprocess = (e) => {
             if (!sessionRef.current || !isActiveRef.current || !isConnectedRef.current) return;
             
             let inputData = e.inputBuffer.getChannelData(0);
             
             // Visualizer Volume
             if (isMountedRef.current && Math.random() > 0.5) {
                let sum = 0;
                for (let i=0; i<inputData.length; i+=50) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / (inputData.length/50));
                setVolume(Math.min(rms * 5, 1)); 
             }

             // Downsample to 16kHz for Gemini
             if (inputCtx.sampleRate !== 16000) {
                 inputData = downsampleBuffer(inputData, inputCtx.sampleRate, 16000);
             }
             
             const pcmData = float32ToInt16(inputData);
             const pcmBase64 = arrayBufferToBase64(pcmData.buffer);
             
             try {
                 sessionRef.current.sendRealtimeInput({
                    media: { mimeType: 'audio/pcm;rate=16000', data: pcmBase64 }
                });
             } catch(err) {}
          };
      }

    } catch (e: any) {
      cleanup();
      if (isMountedRef.current) {
         console.error("Live Connect Error:", e);
         setError(e.message || "Connection failed.");
         setStatus('Failed');
      }
    }
  };

  const toggleConnection = () => {
    if (!navigator.onLine) {
       alert("Live mode requires an active internet connection.");
       return;
    }
    if (isActive) {
      cleanup();
      setStatus('Ready to connect');
    } else {
      connect();
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden animate-fade-in">
      
      {/* --- TOP: Visualizer & Status --- */}
      <div className={`flex-shrink-0 flex flex-col items-center justify-center transition-all duration-500 bg-gradient-to-b from-surfaceHighlight/30 to-transparent ${messages.length > 0 ? 'h-[200px]' : 'h-[300px]'}`}>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 mb-6">
           <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : error ? 'bg-red-500' : 'bg-gray-400'}`} />
           <div className="text-text-sub font-mono text-sm flex items-center gap-2">
              {error ? (
                <span className="text-red-400 font-medium flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" />
                   {error}
                </span>
              ) : (isAiSpeaking ? (
                <span className="text-primary font-medium flex items-center gap-1">
                  <AudioLines className="w-3 h-3 animate-pulse" />
                  Zara is speaking...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                   {status === 'Listening...' ? (
                     <>
                        <Heart className="w-3.5 h-3.5 text-pink-500 animate-pulse" />
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        Listening...
                     </>
                   ) : status}
                </span>
              ))}
           </div>
        </div>

        {/* Orb Visualizer */}
        <div className="relative flex items-center justify-center">
            {/* Outer Ring */}
            <div className={`absolute left-1/2 top-1/2 -ml-20 -mt-20 rounded-full border border-primary/20 transition-all duration-75`}
                 style={{ width: '160px', height: '160px', transform: `scale(${1 + volume * 0.4})` }} />
            
            {/* Inner Orb */}
            <div 
                 className={`w-32 h-32 rounded-full bg-gradient-to-br transition-all duration-300 shadow-[0_0_50px_rgba(139,92,246,0.5)] ${
                   isAiSpeaking ? 'from-accent to-purple-600 scale-110 shadow-[0_0_80px_rgba(217,70,239,0.6)]' : 'from-primary to-accent blur-md'
                 }`}
                 style={{ 
                   transform: isAiSpeaking ? 'scale(1.1)' : `scale(${0.9 + volume * 0.5})`, 
                   opacity: isActive ? 0.8 + volume * 0.5 : 0.3 
                 }} 
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {navigator.onLine ? (
                   !hasMicAccess ? (
                      <MicOff className="w-10 h-10 text-white/50" /> 
                   ) : (
                      <Radio className={`w-10 h-10 text-white transition-opacity ${isActive ? 'opacity-100' : 'opacity-50'}`} />
                   )
                ) : (
                   <WifiOff className="w-10 h-10 text-white/50" />
                )}
            </div>
        </div>
      </div>

      {/* --- NOTIFICATION TOAST --- */}
      {notification && isActive && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex justify-center animate-fade-in pointer-events-none">
           <div className="bg-black/80 backdrop-blur text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 border border-white/10">
              {notification.includes('Microphone') ? <MicOff className="w-4 h-4 text-orange-500" /> : <Settings className="w-4 h-4 text-blue-500" />}
              <span className="text-sm font-medium">{notification}</span>
           </div>
        </div>
      )}

      {/* --- PERSISTENT MEDIA CARD (POPUP FALLBACK) --- */}
      {mediaCard && isActive && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
            <div className={`bg-surface/90 backdrop-blur-md border rounded-xl p-3 shadow-2xl flex items-center gap-3 animate-fade-in ring-1 ring-white/10 ${mediaCard.platform === 'spotify' ? 'border-green-500/30' : 'border-red-500/30'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg ${mediaCard.platform === 'spotify' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {mediaCard.platform === 'spotify' ? <Music className="w-6 h-6 text-white" /> : <Youtube className="w-6 h-6 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${mediaCard.platform === 'spotify' ? 'text-green-400' : 'text-red-400'}`}>Ready to Play</p>
                    <p className="text-sm font-medium text-text truncate">{mediaCard.title}</p>
                </div>
                <a 
                    href={mediaCard.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-text text-background px-4 py-2 rounded-lg text-xs font-bold hover:bg-text-sub transition-colors flex items-center gap-1 shadow-sm"
                >
                    <Play className="w-3 h-3 fill-current" /> Open
                </a>
                <button 
                    onClick={() => setMediaCard(null)} 
                    className="text-text-sub hover:text-text p-1"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
      )}

      {/* --- MIDDLE: Transcription Chat --- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-4 relative">
        <div className="sticky top-0 right-0 flex justify-end z-10 pointer-events-none">
            <button onClick={cycleSpeed} className="pointer-events-auto bg-surface/80 backdrop-blur border border-border text-text-sub hover:text-text hover:bg-surfaceHighlight rounded-full px-3 py-1.5 text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 mb-2">
                <Zap className="w-3 h-3 text-primary" /> {displaySpeed}x
            </button>
        </div>

        {messages.length === 0 && isActive && (
             <div className="text-center text-text-sub/40 mt-10">
               <p>{hasMicAccess ? "Start speaking..." : "Type below to chat..."}</p>
             </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
               <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border border-border ${msg.role === 'user' ? 'bg-surfaceHighlight' : 'bg-primary/20'}`}>
                 {msg.role === 'user' ? <User className="w-4 h-4 text-text" /> : <Sparkles className="w-4 h-4 text-primary" />}
               </div>
               <div className={`px-4 py-2.5 rounded-2xl text-[15px] ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-primary/20 to-blue-600/10 text-text rounded-tr-sm border border-primary/20' 
                    : 'bg-gradient-to-br from-surface/40 to-surface/10 backdrop-blur-sm border border-white/5 text-text rounded-tl-sm'
               }`}>
                 {msg.text}
               </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* --- BOTTOM: Controls --- */}
      <div className="flex-shrink-0 p-6 bg-surface/30 backdrop-blur border-t border-border flex flex-col items-center gap-3">
        
        {/* Text Input Fallback if Mic is broken or user prefers typing in Live Mode */}
        {isActive && (
           <div className="w-full max-w-md flex gap-2 mb-2">
              <input 
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendText()}
                placeholder={hasMicAccess ? "Type to override voice..." : "Microphone disabled. Type here..."}
                className="flex-1 bg-surface border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={handleSendText} className="bg-primary text-white p-2 rounded-full">
                 <Keyboard className="w-4 h-4" />
              </button>
           </div>
        )}

        <button
          onClick={toggleConnection}
          className={`px-8 py-3 rounded-full font-bold text-base transition-all flex items-center gap-2 shadow-lg ${
            isActive 
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' 
              : 'bg-text text-background hover:opacity-90'
          }`}
        >
          {isActive ? (
            <>
              <MicOff className="w-5 h-5" />
              End Session
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              Start Live Chat
            </>
          )}
        </button>
        <p className="text-xs text-text-sub flex items-center gap-1">
           <AlertTriangle className="w-3 h-3 text-yellow-500" /> Headphones recommended
        </p>
      </div>

    </div>
  );
};
