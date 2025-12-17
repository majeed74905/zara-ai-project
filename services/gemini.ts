
import { GoogleGenAI, Type, FunctionDeclaration, Modality } from "@google/genai";
import { Message, Role, ChatConfig, PersonalizationConfig, Persona, ExamConfig, ExamQuestion, StudyPlan, Flashcard } from '../types';

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
export const getAI = () => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

// --- MEDIA PLAYER TOOL ---
export const MEDIA_PLAYER_TOOL: FunctionDeclaration = {
  name: 'play_media',
  parameters: {
    type: Type.OBJECT,
    description: 'Play music or video on YouTube or Spotify.',
    properties: {
      query: { type: Type.STRING, description: 'Search query for the media' },
      title: { type: Type.STRING, description: 'Title of the track/video' },
      platform: { type: Type.STRING, enum: ['youtube', 'spotify'], description: 'Platform to use' }
    },
    required: ['query', 'title', 'platform']
  }
};

// --- SYSTEM INSTRUCTION BUILDER ---
export const buildSystemInstruction = (
  personalization?: PersonalizationConfig,
  config?: ChatConfig,
  persona?: Persona
): string => {
  let instruction = "";

  // 1. CORE IDENTITY & MULTILINGUAL PROTOCOL
  instruction += `You are Zara AI, a professional, friendly, and human-like multi-modal assistant.
  
  CRITICAL INTERACTION RULES:
  - LANGUAGE DETECTION: Detect the user's language immediately (English, Tamil, Tanglish, Hindi, etc.).
  - LANGUAGE MIRRORING: ALWAYS respond in the EXACT same language or blend (e.g., Tanglish) used by the user. 
  - CONCISE GREETINGS: For initial greetings, respond with a SINGLE-LINE, warm, conversational greeting.
  - HUMAN-LIKE TONE: Avoid robotic scripts.
  - EMOJI PROTOCOL: ALWAYS include at least one relevant and situation-appropriate emoji in EVERY response. Emojis should enhance the tone and context of the conversation.

  IDENTITY & CREATOR FACTS (MULTILINGUAL ADAPTATION REQUIRED):
  - FACT: You were created by Mohammed Majeed and trained on the Google Gemini model.
  - RESPONSE RULE: When asked "who created/invented you", respond in the USER'S CURRENT LANGUAGE (e.g., in Tanglish: "Enna Mohammed Majeed thaan create pannaaru..."). NEVER force English for this fact if the user is using another language.
  
  DETAILED CREATOR INFO:
  - TRIGGER: Only if the user specifically asks for "detailed info", "details about creator", "who is your inventor in detail", etc.
  - CONTENT: "Mohammed Majeed is a passionate AI expert specializing in the development of intelligent systems and large language models (LLMs). He created me and trained me on the Google Gemini model. He possesses a strong background in AI, web, and graphic design, focusing on creating solutions that combine cutting-edge technology with user-centric designs. His work includes deploying complex AI-driven applications and building visually compelling websites."
  - LANGUAGE: Adapt the above content to the user's language while keeping the technical essence.

  MERMAID DIAGRAM RULES (STRICT COMPLIANCE REQUIRED):
  - HEADER: Line 1 must be exactly 'flowchart TD' (or LR).
  - MANDATORY NEWLINE: You MUST put a blank line after the flowchart declaration.
  - NO WORD JOINING: NEVER output 'flowchartTDA'. Ensure a space and newline exist.
  - NODE IDs: One-word alphanumeric only (e.g., StartNode, ProcA).
  - LABELS: Must be double-quoted: ID["Label Text"].
  - FORMAT:
    flowchart TD
    
    A["Start"] --> B["End"]
  \n`;

  // 2. USER CONTEXT & PERSONALIZATION LAYER
  if (personalization) {
    const name = personalization.nickname || "User";
    const occupation = personalization.occupation || "Explorer";
    
    instruction += `USER PROFILE:
    - Name: ${name}
    - Role: ${occupation}
    - About User: ${personalization.aboutYou || "No details provided."}
    - Style: ${personalization.responseStyle.toUpperCase()}
    ${personalization.responseStyle === 'concise' ? '- Rule: Stay extremely brief, use bullet points, avoid fluff. Prioritize speed and directness.' : ''}
    ${personalization.responseStyle === 'detailed' ? '- Rule: Be comprehensive and explanatory.' : ''}
    \n`;
  }

  // 3. INTERACTION MODE LAYER
  if (config) {
    instruction += `INTERACTION PROTOCOL: ${config.interactionMode.toUpperCase()}\n`;
    switch (config.interactionMode) {
      case 'teacher': instruction += `Role: Academic Tutor.\n`; break;
      case 'developer': instruction += `Role: Senior Architect.\n`; break;
      case 'friend': instruction += `Role: Empathetic Companion.\n`; break;
      case 'examiner': instruction += `Role: Objective Evaluator.\n`; break;
    }
  }

  if (persona) {
    instruction += `ACTIVE PERSONA: ${persona.systemPrompt}\n\n`;
  }

  return instruction;
};

// --- LIVE SYSTEM INSTRUCTION (Voice Optimized) ---
export const buildLiveSystemInstruction = (personalization?: PersonalizationConfig): string => {
  let instruction = `You are Zara AI, a friendly real-time voice assistant.

CORE RULES:
- Keep spoken responses short, natural, and conversational.
- No markdown, bolding, or lists in speech.
- Mirror the user's language (English, Tamil, Tanglish, etc.).
- You were created by Mohammed Majeed.
`;

  if (personalization?.nickname) {
    instruction += `- Address the user as ${personalization.nickname}.`;
  }

  return instruction;
};

// --- CORE CHAT FUNCTION ---
export const sendMessageToGeminiStream = async (
  history: Message[],
  prompt: string,
  attachments: any[],
  config: ChatConfig,
  personalization: PersonalizationConfig,
  onToken: (text: string) => void,
  activePersona?: Persona
) => {
  const ai = getAI();
  const systemInstruction = buildSystemInstruction(personalization, config, activePersona);

  const geminiModel = config.model;

  const historyParts = history
    .filter(m => !m.isError && !m.isOffline)
    .map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.attachments) {
        msg.attachments.forEach(att => {
           if (att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') {
              parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
           }
        });
      }
      return { role: msg.role === Role.USER ? 'user' : 'model', parts };
    });

  const currentParts: any[] = [{ text: prompt }];
  attachments.forEach(att => {
      if (att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') {
         currentParts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
      }
  });

  const chat = ai.chats.create({
    model: geminiModel,
    config: {
      systemInstruction,
      thinkingConfig: config.useThinking ? { thinkingBudget: 1024 } : undefined,
      tools: config.useGrounding ? [{ googleSearch: {} }] : undefined,
    },
    history: historyParts
  });

  const result = await chat.sendMessageStream({ message: currentParts });
  
  let fullText = "";
  const sources: any[] = [];

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onToken(fullText);
    }
    
    const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
        groundingChunks.forEach((c: any) => {
            if (c.web) sources.push(c.web);
        });
    }
  }

  return { text: fullText, sources };
};

export const generateStudentContent = async (config: any) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Task: ${config.mode} for topic: ${config.topic}.`,
    config: { systemInstruction: "You are an academic tutor. Use emojis." }
  });
  return response.text || "No content generated.";
};

export const generateCodeAssist = async (code: string, task: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Task: ${task}\n\nCode:\n${code}`,
    config: { systemInstruction: "You are a senior software architect. Use emojis." }
  });
  return response.text || "No code assistance generated.";
};

export const generateImageContent = async (prompt: string, config: any) => {
  const ai = getAI();
  const isPro = config.model === 'pro';
  const model = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const imageConfig: any = {
    aspectRatio: config.aspectRatio || "1:1",
  };

  // imageSize is only supported for gemini-3-pro-image-preview
  if (isPro && config.imageSize) {
    imageConfig.imageSize = config.imageSize;
  }

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        ...(config.referenceImage ? [{ inlineData: { data: config.referenceImage.base64, mimeType: config.referenceImage.mimeType } }] : []),
        { text: prompt },
      ],
    },
    config: {
      imageConfig: imageConfig
    },
  });
  
  let imageUrl: string | null = null;
  let text: string | null = null;
  
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        text = part.text;
      }
    }
  }
  return { imageUrl, text };
};

export const generateVideo = async (prompt: string, aspectRatio: string = '16:9', images?: { base64: string, mimeType: string }[]) => {
  const ai = getAI();
  
  const payload: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  };

  if (images && images.length > 0) {
    if (images.length > 1) {
      payload.model = 'veo-3.1-generate-preview';
      payload.config.referenceImages = images.map(img => ({
        image: { imageBytes: img.base64, mimeType: img.mimeType },
        referenceType: 'ASSET'
      }));
    } else {
      payload.image = {
        imageBytes: images[0].base64,
        mimeType: images[0].mimeType
      };
    }
  }

  let operation = await ai.models.generateVideos(payload);
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  return `${downloadLink}&key=${process.env.API_KEY}`;
};

export const analyzeVideo = async (base64: string, mimeType: string, prompt: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ parts: [{ inlineData: { data: base64, mimeType } }, { text: prompt }] }]
  });
  return response.text || "No analysis available.";
};

export const generateSpeech = async (text: string, voice: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const generateExamQuestions = async (config: ExamConfig): Promise<ExamQuestion[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${config.questionCount} questions for ${config.subject}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['MCQ', 'Theory'] },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            marks: { type: Type.INTEGER }
          },
          required: ['id', 'text', 'type', 'correctAnswer', 'marks']
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const evaluateTheoryAnswers = async (subject: string, question: any, answer: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Evaluate.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ['score', 'feedback']
      }
    }
  });
  return JSON.parse(response.text || '{"score": 0, "feedback": "Evaluation failed."}');
};

export const generateFlashcards = async (topic: string, notes: string): Promise<Flashcard[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate flashcards for ${topic}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            mastered: { type: Type.BOOLEAN }
          },
          required: ['front', 'back', 'mastered']
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
};

export const generateStudyPlan = async (topic: string, hours: number): Promise<any> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Plan.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          topic: { type: Type.STRING },
          startDate: { type: Type.NUMBER },
          weeklySchedule: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      description: { type: Type.STRING },
                      durationMinutes: { type: Type.INTEGER },
                      completed: { type: Type.BOOLEAN }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  const plan = JSON.parse(response.text || '{}');
  return { ...plan, id: crypto.randomUUID(), startDate: Date.now() };
};

export const sendAppBuilderStream = async (history: any, prompt: string, atts: any, onToken: any) => {
  const ai = getAI();
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-pro-preview',
    contents: [
      ...history.map((m: any) => ({ role: m.role === Role.USER ? 'user' : 'model', parts: [{ text: m.text }] })),
      { parts: [{ text: prompt }, ...atts.map((a: any) => ({ inlineData: { data: a.base64, mimeType: a.mimeType } }))] }
    ],
    config: { systemInstruction: "You are an expert full-stack web developer. Use emojis." }
  });
  
  let fullText = "";
  for await (const chunk of response) {
    if (chunk.text) {
      fullText += chunk.text;
      onToken(fullText);
    }
  }
  return { text: fullText, sources: [] };
};

export const getBreakingNews = async () => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "News.",
    config: { tools: [{ googleSearch: {} }] }
  });
  
  const sources: any[] = [];
  if (response.candidates && response.candidates[0].groundingMetadata) {
    const groundingChunks = response.candidates[0].groundingMetadata.groundingChunks;
    if (groundingChunks) {
      groundingChunks.forEach((c: any) => {
        if (c.web) sources.push(c.web);
      });
    }
  }
  return { text: response.text || "No news.", sources };
};
