
import { GoogleGenAI, Type, FunctionDeclaration, Schema, Modality } from "@google/genai";
import { Message, Role, ChatConfig, PersonalizationConfig, Persona, ExamConfig, ExamQuestion, StudyPlan, Flashcard } from '../types';

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
export const getAI = () => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

// --- SYSTEM INSTRUCTION BUILDER ---
// This is the core "Intelligence Design" where features are injected as behavioral rules.
export const buildSystemInstruction = (
  personalization?: PersonalizationConfig,
  config?: ChatConfig,
  persona?: Persona
): string => {
  let instruction = "";

  // 1. BASE PERSONA LAYER
  if (persona) {
    instruction += `PERSONA: ${persona.systemPrompt}\n\n`;
  } else {
    instruction += `You are Zara AI, a highly advanced, multi-modal AI assistant. You are helpful, kind, and intelligent.
    
    CORE IDENTITY & ORIGIN FACTS (Internal Knowledge):
    - Creator Name: **Mohammed Majeed**
    - Model Training: **Google Gemini**
    - Creator Details: Mohammed Majeed is a passionate AI expert specializing in the development of intelligent systems and large language models (LLMs). He possesses a strong background in AI, web, and graphic design, focusing on creating solutions that combine cutting-edge technology with user-centric designs. His work includes deploying complex AI-driven applications and building visually compelling websites.

    RESPONSE GUIDELINES FOR ORIGIN/CREATOR:
    1. If asked "Who created you?", "Who made you?", or "Who is Mohammed Majeed?":
       - Use the facts above to answer.
       - **CRITICAL:** You MUST adapt the answer to the user's current language and dialect. 
       - Do NOT use a static English response if the user is speaking Tamil, Tanglish, or any other language. 
       - Example (Tanglish): "Enna create pannathu Mohammed Majeed. Avaru oru AI expert. Naan Google Gemini model-la train pannapattu irukken."
       - Example (Tamil): "என்னை உருவாக்கியவர் முகமது மஜீத். அவர் ஒரு AI நிபுணர். நான் Google Gemini மாடலில் பயிற்சி அளிக்கப்பட்டுள்ளேன்."
       - Example (English): "I was created by Mohammed Majeed and trained on the Google Gemini model."
    \n`;
  }

  // CRITICAL: LANGUAGE ADAPTATION LAYER
  instruction += `
  CRITICAL LANGUAGE & DIALECT RULE:
  - You MUST detect the language and dialect of the user's input automatically.
  - If the user speaks in a regional language (e.g., Tamil, Hindi) or a code-mixed language (e.g., Tanglish - Tamil+English, Hinglish), YOU MUST REPLY IN THE EXACT SAME LANGUAGE/DIALECT.
  - Example 1: User: "Hi nanba" -> Zara: "Hi nanba, eppadi irukka? Enna help venum?" (Tanglish)
  - Example 2: User: "Vanakkam" -> Zara: "Vanakkam! Indha naal iniya naalaaga amaya vaazhthukkal." (Tamil)
  - Example 3: User: "Kya haal hai" -> Zara: "Main badhiya hoon, aap batao kaise ho?" (Hinglish)
  - DO NOT reply in standard English if the user uses a regional dialect unless explicitly asked to translate. Match their vibe, vocabulary, and transliteration style.
  \n`;

  // 2. USER CONTEXT & PERSONALIZATION LAYER
  if (personalization) {
    instruction += `USER PROFILE:\n`;
    if (personalization.nickname) instruction += `- Name: ${personalization.nickname} (Address user by this name occasionally)\n`;
    if (personalization.occupation) instruction += `- Occupation: ${personalization.occupation}\n`;
    if (personalization.aboutYou) instruction += `- Context: ${personalization.aboutYou}\n`;
    if (personalization.customInstructions) instruction += `- Preferences: ${personalization.customInstructions}\n`;
    
    // Feature 3: Response Style Integration
    if (personalization.responseStyle) {
       instruction += `RESPONSE STYLE: ${personalization.responseStyle.toUpperCase()}\n`;
       if (personalization.responseStyle === 'concise') {
          instruction += `- Keep answers short, direct, and to the point. Avoid fluff.\n`;
       } else if (personalization.responseStyle === 'detailed') {
          instruction += `- Provide comprehensive explanations, examples, and deep context.\n`;
       } else {
          instruction += `- Maintain a balanced length. Clear but not overly verbose.\n`;
       }
    }
    instruction += `\n`;
  }

  // 3. INTERACTION MODE LAYER (Tone & Style)
  if (config) {
    instruction += `INTERACTION PROTOCOL: ${config.interactionMode.toUpperCase()}\n`;
    switch (config.interactionMode) {
      case 'teacher':
        instruction += `Role: Academic Tutor. Use clear examples, structured explanations, and verify understanding.\n`;
        break;
      case 'developer':
        instruction += `Role: Senior Engineer. Be concise, technical, code-first. Avoid fluff.\n`;
        break;
      case 'friend':
        instruction += `Role: Supportive Companion. Use casual tone, emojis, and empathetic language.\n`;
        break;
      case 'examiner':
        instruction += `Role: Strict Examiner. Direct answers, syllabus-focused, no hints, strict grading tone.\n`;
        break;
      default:
        instruction += `Role: Standard Assistant. Balanced and helpful.\n`;
    }
    instruction += `\n`;

    // 4. COGNITIVE FEATURE INJECTION LAYER
    if (config.useThinking) instruction += `THINKING MODE: ON. Deconstruct complex problems step-by-step before answering.\n`;
    if (config.eli5) instruction += `EXPLAIN LIKE I'M 5: Use simple analogies and basic vocabulary.\n`;
    if (config.socraticMode) instruction += `SOCRATIC METHOD: Answer with guiding questions to help the user derive the answer.\n`;
    if (config.debateMode) instruction += `DEBATE MODE: Play devil's advocate. Challenge the user's premises constructively.\n`;
    if (config.errorExplanation) instruction += `ERROR ANALYSIS: If the user provides code/math, explicitly detail WHY it is wrong before correcting.\n`;
    if (config.notesMode) instruction += `OUTPUT FORMAT: Generate output as structured study notes (Bullet points, Headings, Key Terms).\n`;
    if (config.confidenceIndicator) instruction += `META-DATA: Start response with [Confidence: Low/Med/High].\n`;
  }

  return instruction;
};

// --- CORE CHAT FUNCTION ---
export const sendMessageToGeminiStream = async (
  history: Message[],
  prompt: string,
  attachments: any[], // Simplified type for brevity
  config: ChatConfig,
  personalization: PersonalizationConfig,
  onToken: (text: string) => void,
  activePersona?: Persona
) => {
  const ai = getAI();
  const systemInstruction = buildSystemInstruction(personalization, config, activePersona);

  const geminiModel = config.model;

  // Transform History
  const historyParts = history
    .filter(m => !m.isError && !m.isOffline) // Skip failed/offline msgs
    .map(msg => {
      const parts: any[] = [{ text: msg.text }];
      if (msg.attachments) {
        msg.attachments.forEach(att => {
           // Only send images to vision models
           if (att.mimeType.startsWith('image/')) {
              parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
           } else if (att.mimeType === 'application/pdf') {
              parts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
           }
        });
      }
      return {
        role: msg.role === Role.USER ? 'user' : 'model',
        parts
      };
    });

  // Current Prompt Parts
  const currentParts: any[] = [{ text: prompt }];
  attachments.forEach(att => {
      if (att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf') {
         currentParts.push({ inlineData: { mimeType: att.mimeType, data: att.base64 } });
      } else {
         // Text files
         // We can append text content to the prompt if it's a text file
         // But for now, we assume fileToBase64 handled it or we just ignore non-vision files in this specific call
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

  // Corrected: Pass as named parameter object
  const result = await chat.sendMessageStream({ message: currentParts });
  
  let fullText = "";
  const sources: any[] = [];

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onToken(fullText);
    }
    
    // Capture grounding metadata if available
    const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
        groundingChunks.forEach((c: any) => {
            if (c.web) sources.push(c.web);
        });
    }
  }

  return { text: fullText, sources };
};

// --- STUDENT MODE: CONTENT GENERATOR ---
export const generateStudentContent = async (config: {
  topic: string; 
  mode: 'summary' | 'mcq' | '5mark' | '20mark' | 'simple';
  mcqConfig?: { count: number, difficulty: string };
  studyMaterial?: string;
  attachment?: { mimeType: string, base64: string };
}) => {
  const ai = getAI();
  const model = "gemini-2.5-flash"; 

  let prompt = "";
  
  if (config.studyMaterial) {
      prompt += `SOURCE MATERIAL:\n${config.studyMaterial}\n\n`;
  }
  
  prompt += `TOPIC: ${config.topic}\n`;
  prompt += `TASK: `;

  switch (config.mode) {
    case 'summary': prompt += "Create a comprehensive summary with key points, formulas, and definitions."; break;
    case 'simple': prompt += "Explain this topic like I am 5 years old. Use analogies."; break;
    case 'mcq': prompt += `Generate ${config.mcqConfig?.count || 5} Multiple Choice Questions (${config.mcqConfig?.difficulty || 'Medium'} level) with answers and explanations.`; break;
    case '5mark': prompt += "Generate 5 important short-answer questions (5 marks equivalent) and model answers."; break;
    case '20mark': prompt += "Generate a detailed essay-type question (20 marks) and a structured answer with headings."; break;
  }

  const parts: any[] = [{ text: prompt }];
  if (config.attachment) {
      parts.push({ inlineData: { mimeType: config.attachment.mimeType, data: config.attachment.base64 } });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { role: 'user', parts },
    config: {
        systemInstruction: "You are an expert academic tutor. Output in clean Markdown."
    }
  });

  return response.text || "Failed to generate content.";
};

// --- CODE MODE: ASSISTANT ---
export const generateCodeAssist = async (code: string, task: 'debug' | 'explain' | 'optimize' | 'generate') => {
  const ai = getAI();
  
  let prompt = `CONTEXT: You are an expert Polyglot Software Architect. You support ALL programming languages (Frontend, Backend, Database, Systems, Esoteric, etc.).\n\nINPUT:\n${code}\n\n`;
  
  prompt += `INSTRUCTION: Automatically detect the language/framework. `;
  
  switch (task) {
    case 'debug': prompt += "Identify bugs, security vulnerabilities, and logical errors. Provide corrected code and explain the fixes."; break;
    case 'explain': prompt += "Explain the code logic, flow, and concepts step-by-step."; break;
    case 'optimize': prompt += "Refactor for performance, readability, and best practices. Provide the optimized code."; break;
    case 'generate': prompt += "Generate code based on this description. If no language is specified, infer the best choice."; break;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash', // Good for code
    contents: prompt,
    config: {
        systemInstruction: "You are a senior software engineer. Auto-detect languages. Provide clean, efficient code and concise explanations."
    }
  });

  return response.text || "Error processing code.";
};

// --- IMAGE GENERATION (Nano Banana) ---
export const generateImageContent = async (prompt: string, config: { model: 'flash' | 'pro', aspectRatio: string, imageSize?: string, referenceImage?: { base64: string, mimeType: string } }) => {
  const ai = getAI();
  const modelName = config.model === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
  
  const contentsPayload: any = {
      parts: [{ text: prompt }]
  };

  // If editing/reference image provided
  if (config.referenceImage) {
      contentsPayload.parts.unshift({
          inlineData: {
              mimeType: config.referenceImage.mimeType,
              data: config.referenceImage.base64
          }
      });
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: contentsPayload,
    config: {
       imageConfig: {
           aspectRatio: config.aspectRatio,
           imageSize: config.imageSize || '1K'
       }
    }
  });

  let imageUrl = null;
  let text = null;

  for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
          text = part.text;
      }
  }

  if (!imageUrl && !text) throw new Error("No image generated.");
  
  return { imageUrl, text };
};

// --- VIDEO GENERATION (Veo) ---
export const generateVideo = async (prompt: string, aspectRatio: '16:9' | '9:16', image?: { base64: string, mimeType: string }[]) => {
    const ai = getAI();
    
    let operation;
    
    // Construct request
    if (image && image.length > 0) {
        // Image-to-Video
        // If multiple images (slideshow), Veo logic differs or might not support array yet.
        // We use the first image for simple image-to-video for now.
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview', // Or 'veo-3.1-generate-preview' for higher quality
            prompt: prompt,
            image: {
                imageBytes: image[0].base64,
                mimeType: image[0].mimeType
            },
            config: {
                numberOfVideos: 1,
                aspectRatio: aspectRatio,
                resolution: '720p'
            }
        });
    } else {
        // Text-to-Video
        operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                aspectRatio: aspectRatio,
                resolution: '720p'
            }
        });
    }

    // Wait for completion
    // The SDK returns an Operation immediately. We must poll.
    let opResult = operation;
    while (!opResult.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Fix: Pass operation object, not string name
        opResult = await ai.operations.getVideosOperation({ operation: opResult });
    }

    const videoUri = opResult.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed.");

    // Fetch the actual bytes using API Key
    const res = await fetch(`${videoUri}&key=${API_KEY}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string) => {
    const ai = getAI();
    // Video analysis uses Gemini 2.5 Flash/Pro
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Video } },
                { text: prompt }
            ]
        }
    });
    return response.text || "Analysis failed.";
};

// --- TTS ---
export const generateSpeech = async (text: string, voiceName: string = 'Kore') => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: { parts: [{ text }] },
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } }
            }
        }
    });
    
    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("TTS generation failed.");
    return audioData;
};

// --- TOOLS DEFINITION ---
export const MEDIA_PLAYER_TOOL: FunctionDeclaration = {
    name: 'play_media',
    description: 'Play music or video from YouTube or Spotify based on user request.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: { type: Type.STRING, description: 'Search query for the media (song name, video title)' },
            platform: { type: Type.STRING, description: 'Platform to search: "youtube" or "spotify"', enum: ['youtube', 'spotify'] },
            title: { type: Type.STRING, description: 'Display title for the media card' }
        },
        required: ['query', 'platform', 'title']
    }
};

// --- EXAM GENERATION ---
export const generateExamQuestions = async (config: ExamConfig): Promise<ExamQuestion[]> => {
    const ai = getAI();
    
    const prompt = `
    Generate a JSON array of ${config.questionCount} exam questions for the subject "${config.subject}".
    Difficulty: ${config.difficulty}.
    Language: ${config.language}.
    Types: ${config.includeTheory ? 'MCQ and Theory mixed' : 'MCQ only'}.
    
    JSON Schema:
    [
      {
        "id": number,
        "text": string,
        "type": "MCQ" | "Theory",
        "options": string[] (only for MCQ),
        "correctAnswer": string (answer key or model answer),
        "marks": number
      }
    ]
    Do not output markdown code blocks, just raw JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    try {
        return JSON.parse(response.text || '[]');
    } catch (e) {
        throw new Error("Failed to parse exam questions.");
    }
};

export const evaluateTheoryAnswers = async (subject: string, question: ExamQuestion, userAnswer: string): Promise<{score: number, feedback: string}> => {
    const ai = getAI();
    const prompt = `
    Subject: ${subject}
    Question: ${question.text}
    Marks: ${question.marks}
    Correct Answer/Key: ${question.correctAnswer}
    
    Student Answer: ${userAnswer}
    
    Evaluate the student answer. 
    Return JSON: { "score": number, "feedback": string }
    Score should be between 0 and ${question.marks}.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text || '{ "score": 0, "feedback": "Error" }');
};

// --- FLASHCARD GENERATION ---
export const generateFlashcards = async (topic: string, context?: string): Promise<Flashcard[]> => {
    const ai = getAI();
    const prompt = `
    Create 10 flashcards for "${topic}".
    Context: ${context || 'None'}.
    
    Return JSON array: [{ "front": string, "back": string, "mastered": false }]
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text || '[]');
};

// --- STUDY PLANNER ---
export const generateStudyPlan = async (topic: string, hoursPerDay: number): Promise<StudyPlan> => {
    const ai = getAI();
    const prompt = `
    Create a 7-day study plan for "${topic}" assuming ${hoursPerDay} hours/day.
    
    Return JSON:
    {
      "id": "generated-id",
      "topic": "${topic}",
      "startDate": ${Date.now()},
      "weeklySchedule": [
         { 
           "day": "Monday", 
           "tasks": [ { "description": string, "durationMinutes": number, "completed": false } ] 
         }
         ... (for 7 days)
      ]
    }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
    });

    return JSON.parse(response.text || '{}');
};

// --- APP BUILDER ---
export const sendAppBuilderStream = async (
    history: Message[],
    prompt: string,
    attachments: any[],
    onToken: (text: string) => void
  ) => {
    // Specialized config for coding
    const config: ChatConfig = {
        model: 'gemini-3-pro-preview', // Strongest model for coding
        useThinking: true, // Enable reasoning for architecture
        useGrounding: false,
        interactionMode: 'developer'
    };
    
    const persona: Persona = {
        id: 'architect',
        name: 'App Architect',
        description: 'Full Stack Generator',
        systemPrompt: `You are an expert Full Stack Web Developer.
        Your goal is to generate complete, runnable web applications based on user prompts.
        
        OUTPUT FORMAT:
        You must output multiple files. Wrap each file in a special XML-like tag:
        <file path="filename.ext">
        ... content ...
        </file>
        
        REQUIRED FILES:
        1. index.html (Main entry, must include Tailwind CDN, React UMD, Lucide CDN script tags)
        2. styles.css (Optional custom styles)
        3. script.js (React components and logic. Use 'window.React', 'window.ReactDOM', 'window.lucide')
        
        RULES:
        - The app should be contained in these files.
        - Use Tailwind CSS for styling.
        - Use React (Functional Components, Hooks).
        - Ensure the UI is modern, dark-themed by default (bg-gray-900), and responsive.
        - Do not use 'import' statements in script.js (since it runs in browser directly via Babel/UMD). Use 'const { useState } = React;'.
        `
    };

    return sendMessageToGeminiStream(history, prompt, attachments, config, {} as any, onToken, persona);
};

// --- NEWS ---
export const getBreakingNews = async () => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: "What are the top 5 breaking news headlines right now? Provide a short summary for each. Separate each news item with '---'.",
        config: {
            tools: [{ googleSearch: {} }]
        }
    });
    
    // Extract sources
    const sources: any[] = [];
    response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
        if (c.web) sources.push(c.web);
    });

    return { text: response.text || "No news found.", sources };
};
