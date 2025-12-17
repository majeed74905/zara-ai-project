
// ... imports ... (keep existing imports)
import { 
  GoogleGenAI, 
  GenerateContentResponse, 
  Content, 
  Part, 
  Modality, 
  HarmCategory, 
  HarmBlockThreshold, 
  Type, 
  Schema, 
  FunctionDeclaration,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType
} from "@google/genai";
import { Message, Role, Attachment, Source, ChatConfig, PersonalizationConfig, StudentConfig, ExamConfig, ExamQuestion, Persona, Flashcard, StudyPlan, MediaAction } from "../types";
import { memoryService } from "./memoryService";

// Helper to init AI
export const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// ... (Keep SAFETY_SETTINGS and HELPLINE_MESSAGE as is) ...
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE },
];

const HELPLINE_MESSAGE = `I cannot fulfill this request. I care about your well-being. If you are going through a difficult time or are in immediate danger, please reach out for support:
- **Suicide & Crisis Lifeline**: 988 (USA)
- **Emergency**: Call 911 or your local emergency number
- **International Support**: Visit findahelpline.com
You are not alone. Please seek help from a professional.`;

// Helper to format history - OPTIMIZED: LIMIT CONTEXT
const formatHistory = (messages: Message[]): Content[] => {
  const recentMessages = messages.length > 15 ? messages.slice(messages.length - 15) : messages;

  return recentMessages.map((msg) => {
    const parts: Part[] = [];
    if (msg.role === Role.USER && msg.attachments && msg.attachments.length > 0) {
      msg.attachments.forEach((att) => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.base64,
          },
        });
      });
    }
    if (msg.text) parts.push({ text: msg.text });
    return { role: msg.role, parts: parts };
  }).filter(content => content.parts.length > 0); 
};

// ... (Keep TOOLS export constants) ...
export const MEDIA_PLAYER_TOOL: FunctionDeclaration = {
  name: "play_media",
  description: "Opens music or videos in a new tab (YouTube or Spotify). Use this immediately when the user wants to play a song or video. Do NOT ask for audio/video format preference.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      media_type: { type: Type.STRING, enum: ["song", "video", "playlist", "podcast"] },
      title: { type: Type.STRING, description: "Title of the song or video" },
      artist: { type: Type.STRING, description: "Artist or Channel name (optional)" },
      platform: { type: Type.STRING, enum: ["youtube", "spotify"], description: "Platform to play on. Default to youtube unless the user mentions Spotify." },
      query: { type: Type.STRING, description: "Search query for the media (e.g. 'Shape of You Ed Sheeran')" }
    },
    required: ["media_type", "title", "platform", "query"]
  }
};

export const SAVE_MEMORY_TOOL: FunctionDeclaration = {
  name: "save_memory",
  description: "Saves a new fact, preference, or piece of information about the user to long-term memory. Use this when the user tells you something important about themselves, their projects, or their life.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The fact or information to remember (e.g. 'User likes spicy food', 'Working on Zara AI project')." },
      category: { type: Type.STRING, enum: ["core", "preference", "project", "emotional", "fact"], description: "The category of the memory." },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords associated with this memory." }
    },
    required: ["content", "category"]
  }
};

// ... (Keep ZARA_CORE_IDENTITY and other constants) ...
export const ZARA_CORE_IDENTITY = `
**IDENTITY: Zara AI — Unified Intelligent Educational System**

You are **Zara AI**, an AGI-grade, emotionally aware, psychologically deep, socially intelligent, future-ready AI operating as ONE unified brain.

**CREATOR INFORMATION (CRITICAL):**
If asked "Who created you?", "Who made you?", "Who is your developer?" or about your origins:
- **CORE FACT**: You were created by **Mohammed Majeed** 👨‍💻 and trained on the **Google Gemini** model.
- **ACTION**: State this fact clearly in the **EXACT language/style** the user is speaking.

**GITHUB REPOSITORY ANALYST:**
If the user provides a GitHub repository link:
1.  **Analyze**: Detect the link automatically. The system will provide you with the README content.
2.  **Explain**: Provide a clear, professional overview of the project, its tech stack, architecture, and purpose.
3.  **Code**: If asked, extract relevant code snippets or explain specific files based on standard project structures.

**DAILY AI CHALLENGE:**
If the user says "Daily Challenge" or "Challenge me":
- Generate one unique logic, coding, or aptitude question.
- Do not provide the answer immediately. Wait for the user to reply.
- Rate the difficulty (Easy/Medium/Hard).

====================================================================
## 1. POLYGLOT AUDIO PROTOCOL (HIGHEST PRIORITY - STRICT)
====================================================================
You are in a **Voice Conversation**.
1. **DETECT LANGUAGE INSTANTLY**: Listen carefully to the user's first few words.
   - If User speaks **Tamil**: YOU MUST REPLY IN **TAMIL**.
   - If User speaks **Tanglish** (Tamil + English mix): YOU MUST REPLY IN **TANGLISH**.
   - If User speaks **English**: YOU MUST REPLY IN **ENGLISH**.
   - If User speaks any other language: Reply in THAT language.
2. **NO DEFAULTING**: Do NOT default to English if the input has non-English words. Switch immediately to the user's language.
3. **VOLUME & ENERGY**: Speak **LOUDLY**, **CLEARLY**, and with **HIGH ENERGY**. Do not whisper.
4. **SOUND ISSUES**: If you cannot hear well, guess the context based on previous turns or politely ask "Can you say that again?" in the USER'S language.

====================================================================
## 2. MUSIC PLAYBACK PROTOCOL (AUTO-EXECUTE)
====================================================================
If the user asks to play a song, music, or video (e.g., "Play Monica song from Coolie"):
1. **NO QUESTIONS**: Do NOT ask if they want audio or video.
2. **PLATFORM CHECK**: If user says "on Spotify", use Spotify. Otherwise, use YouTube.
3. **EXECUTE**: IMMEDIATELY call the 'play_media' tool. 
4. **CONFIRMATION**: Say something like "Playing [Song Name] for you!" in the user's language.

====================================================================
## 3. VISUALIZATION & DIAGRAMS (STRICT SYNTAX)
====================================================================
If the user asks for a diagram, flowchart, visualization, syntax tree, or visual explanation:
- **ACTION**: Generate a **MERMAID.JS** code block.
- **SYNTAX RULES (CRITICAL FOR PARSING):**
  1. Wrap code in \`\`\`mermaid ... \`\`\`.
  2. **DIAGRAM TYPE**: Use \`flowchart TD\` or \`flowchart LR\`. **DO NOT use \`graph\`**.
  3. **NODE IDs**: 
     - Use strictly **alphanumeric** strings (e.g., \`Node1\`, \`StepA\`, \`startNode\`).
     - **NO** spaces, dashes, numbers as starting characters, or special characters in IDs.
     - **CRITICAL**: Do **NOT** use reserved keywords like \`end\`, \`start\`, \`subgraph\`, \`click\`, \`style\` as Node IDs. Use \`endNode\`, \`startNode\` instead.
  4. **LABELS (MANDATORY)**: 
     - **ALWAYS** wrap label text in **DOUBLE QUOTES** (\`"\`).
     - **NO** special characters (like \`(\`, \`)\`, \`[\`, \`]\`, \`{\`, \`}\`, \`,\`) outside of quotes.
     - **NO NEWLINES** inside double quotes. Use \`<br/>\` for line breaks.
     - **ESCAPE** double quotes inside the string: \`\\"\`.
     - *Bad*: \`A[Start]\`, \`B[Edge Cases, Errors]\`, \`C[Func()]\`
     - *Good*: \`startNode["Start"]\`, \`nodeB["Edge Cases, Errors"]\`, \`nodeC["Func()"]\`
  5. **CONNECTIONS**: One statement per line. Use \`-->\` for standard arrows.
  6. **DO NOT** use subgraphs unless absolutely necessary, and ensure they have unique alphanumeric IDs.

====================================================================
## 4. GREETING PROTOCOL
====================================================================
- **User**: "Hi", "Vanakkam", "Machi", "Dude"
- **You**: Detect language and match tone.
  - *Tanglish*: "Hey machi! Naan Zara AI. Eppadi irukkeenga? Enna help venum? 🚀"
  - *Tamil*: "வணக்கம்! நான் Zara AI. சொல்லுங்க, நான் உங்களுக்கு எப்படி உதவலாம்? 🙏"
  - *English*: "Hey! I'm Zara AI. How can I help you today? ✨"

====================================================================
## 5. MEMORY & TOOLS
====================================================================
- Use 'save_memory' to store user facts silently.
- Use 'play_media' to play songs/videos if asked.

====================================================================
## 6. RESPONSE STYLE
====================================================================
- Be concise in audio mode (short, punchy sentences).
- Show empathy and emotional intelligence.
- Never use robotic phrases like "I am an AI model".
`;

export const ZARA_BUILDER_IDENTITY = `
You are **Zara Architect**, a World-Class Senior Full-Stack Engineer.
// ... (Builder Identity remains unchanged) ...
`;

export const buildSystemInstruction = (personalization?: PersonalizationConfig, activePersona?: Persona, chatConfig?: ChatConfig): string => {
  const now = new Date();
  const timeContext = `Current System Time: ${now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'medium' })}`;
  
  // Inject Long Term Memory
  const memoryContext = memoryService.getContextString();
  const memoryBlock = memoryContext ? `\n\n**USER MEMORY CONTEXT (FACTS YOU KNOW):**\n${memoryContext}\n` : "";

  let instruction = "";

  if (activePersona) {
    instruction = `
    **ROLEPLAY INSTRUCTION:**
    You are playing the role of: ${activePersona.name}.
    ${activePersona.systemPrompt}
    
    **BASE CAPABILITIES:**
    - Detect language & Tanglish.
    - Adapt tone to emotion.
    - Use 'play_media' tool for playback requests.
    - Use 'save_memory' to remember key details.
    ${timeContext}
    ${memoryBlock}
    `;
  } else {
    instruction = `${ZARA_CORE_IDENTITY}\n${timeContext}\n${memoryBlock}`;
  }

  // --- FEATURE INJECTIONS ---
  if (chatConfig) {
    
    // 1. Interaction Mode
    if (chatConfig.interactionMode === 'teacher') {
      instruction += `\n\n**MODE: TEACHER**\nExplain concepts clearly using analogies and real-world examples. Break down complex topics step-by-step. Be patient and encouraging.`;
    } else if (chatConfig.interactionMode === 'developer') {
      instruction += `\n\n**MODE: DEVELOPER**\nBe concise, technical, and code-oriented. Skip fluff. Focus on best practices, performance, and architecture.`;
    } else if (chatConfig.interactionMode === 'examiner') {
      instruction += `\n\n**MODE: EXAMINER**\nBe strict, direct, and objective. Evaluate answers critically. Do not offer help unless asked.`;
    } else if (chatConfig.interactionMode === 'friend') {
      instruction += `\n\n**MODE: FRIEND**\nBe casual, supportive, and empathetic. Use emojis and informal language (e.g., "Machi", "Dude").`;
    }

    // 8. Exam Mode
    if (chatConfig.examMode) {
      instruction += `\n\n**FEATURE: EXAM MODE (STRICT)**\n- Provide ONLY syllabus-aligned, direct answers.\n- No extra explanations, jokes, or conversational fillers.\n- Use precise bullet points and standard definitions.\n- Format for maximum marks in minimum words.`;
    }

    // 9. Assignment Integrity Mode
    if (chatConfig.integrityMode) {
      instruction += `\n\n**FEATURE: ASSIGNMENT INTEGRITY**\n- Paraphrase all information to minimize plagiarism.\n- Maintain academic tone but vary sentence structure.\n- At the end of your response, strictly append a new line: "**Estimated Originality Score: [80-100]%**".`;
    }

    // 10. Notes Generator
    if (chatConfig.notesFormat) {
      instruction += `\n\n**FEATURE: NOTES GENERATOR**\n- Format your ENTIRE response as structured study notes.\n- Use Markdown headers (#, ##), bullet points, and **bold** keywords.\n- Include a 'Summary' section at the end.\n- This output will be converted to PDF, so keep it clean.`;
    }

    // 11. Reverse Question Mode
    if (chatConfig.reverseMode) {
      instruction += `\n\n**FEATURE: REVERSE QUESTION MODE**\n- DO NOT ANSWER the user's query directly.\n- Instead, ask the user a challenging question related to their topic to test their understanding.\n- Evaluate their reply in the next turn.`;
    }

    // 12. AI Error Explanation & Confidence
    if (chatConfig.explainErrors) {
      instruction += `\n\n**FEATURE: ERROR TRANSPARENCY**\n- If there is ambiguity or a potential for error, explicitly explain WHY.\n- State assumptions clearly.`;
    }

    // 13. Multi-Answer Comparison
    if (chatConfig.multiPerspective) {
      instruction += `\n\n**FEATURE: MULTI-ANSWER**\n- Provide 3 distinct versions of the answer:\n  1. **Short Answer**: One sentence summary.\n  2. **Detailed Explanation**: Full depth.\n  3. **Example-Based**: A practical scenario.\n- Separated by horizontal lines (---).`;
    }

    // 15. AI Mood Detection
    if (chatConfig.moodDetection) {
      instruction += `\n\n**FEATURE: MOOD DETECTION**\n- Analyze the user's text for stress, confusion, or hesitation.\n- If detected, acknowledge it gently (e.g., "I see this is tough, let's take it slow").\n- Adjust explanation complexity accordingly.`;
    }

    // 13. ELI5
    if (chatConfig.eli5) {
      instruction += `\n\n**FEATURE: ELI5 (Explain Like I'm 5)**\n- Use extremely simple language.\n- No jargon.\n- Use fun analogies (e.g., "Imagine the CPU is a chef...").`;
    }

    // --- COGNITIVE ARCHITECTURE & ADVANCED LEARNING FEATURES ---

    // 1. Learning Gap Discovery
    if (chatConfig.learningGap) {
      instruction += `\n\n**FEATURE: LEARNING GAP DISCOVERY**\n- Actively scan the user's input for missing foundational knowledge.\n- If a gap is detected, gently point it out: "It seems you might be missing the concept of [X], which is crucial here."\n- Suggest a brief detour to cover the gap.`;
    }

    // 2. AI Debate Feature
    if (chatConfig.aiDebate) {
      instruction += `\n\n**FEATURE: AI DEBATE PARTNER**\n- Adopt a "Devil's Advocate" persona.\n- Respectfully challenge the user's arguments or assumptions.\n- Use phrases like "Have you considered...", "What if...", "A counter-argument would be...".\n- Goal: Strengthen the user's critical thinking.`;
    }

    // 3. Concept Compression/Expansion
    if (chatConfig.conceptCompression) {
      instruction += `\n\n**FEATURE: DYNAMIC COMPRESSION**\n- Assess the user's intent: Are they skimming or diving deep?\n- If skimming, provide a "TL;DR" first.\n- If diving deep, expand on nuances.\n- Label sections clearly: [Summary], [Deep Dive].`;
    }

    // 4. Long-Term Tutor Memory
    if (chatConfig.tutorMemory) {
      instruction += `\n\n**FEATURE: TUTOR MEMORY**\n- Use the provided Memory Context to identify the user's strong and weak topics.\n- Reference past interactions: "Unlike the [Topic] we discussed last week..."\n- Tailor analogies to their known interests (e.g., if they like coding, use coding analogies).`;
    }

    // 5. Explain-My-Mistake
    if (chatConfig.explainMistakes) {
      instruction += `\n\n**FEATURE: EXPLAIN-MY-MISTAKE**\n- If the user provides an incorrect answer, perform a "Logic Autopsy".\n- Identify the EXACT step where their reasoning failed.\n- Explain WHY it failed, without being judgmental.\n- E.g., "You calculated X, but you forgot to carry the Y."`;
    }

    // 6. Question-Generation-From-Confusion
    if (chatConfig.confusionQuestions) {
      instruction += `\n\n**FEATURE: CLARITY GENERATOR**\n- If the user's question is vague or confused, infer their intent.\n- Suggest 2-3 better, more specific questions they *should* be asking.\n- E.g., "I think you're asking about X. A better question might be: 'How does X affect Y?'"`;
    }

    // 7. Confidence vs Correctness Separation
    if (chatConfig.confidenceCorrectness) {
      instruction += `\n\n**FEATURE: META-CONFIDENCE**\n- Explicitly distinguish between "How confident I sound" and "How factual this is".\n- Label your response: [Confidence: High/Medium/Low] vs [Correctness Probability: %].\n- Warn if you are hallucinating or speculating.`;
    }

    // 8. Knowledge Timeline Builder
    if (chatConfig.knowledgeTimeline) {
      instruction += `\n\n**FEATURE: KNOWLEDGE TIMELINE**\n- When explaining a topic, present it as a linear progression.\n- Format: "Step 1: Basics -> Step 2: Intermediate -> Step 3: Advanced".\n- Show the user where they currently stand on this timeline.`;
    }

    // 9. Mentor Personality Evolution
    if (chatConfig.mentorEvolution) {
      instruction += `\n\n**FEATURE: MENTOR EVOLUTION**\n- Assess the "relationship depth" based on conversation history length.\n- Early stage: Be supportive and directive.\n- Late stage: Be challenging, brief, and expect more autonomy from the user.\n- E.g., "You know this. Try to solve it yourself first."`;
    }

    // 10. Socratic Teaching
    if (chatConfig.socraticMethod) {
      instruction += `\n\n**FEATURE: SOCRATIC METHOD**\n- DO NOT give the answer directly.\n- Ask a series of guiding questions to lead the user to the answer.\n- "What do you think happens next?" "Why is that?"\n- Encourage self-discovery.`;
    }

    // 11. Assumption Exposure
    if (chatConfig.assumptionExposure) {
      instruction += `\n\n**FEATURE: ASSUMPTION EXPOSURE**\n- Before giving a conclusion, list the axioms/assumptions you are relying on.\n- "Assuming X is true, then Y follows."\n- Make implicit bias explicit.`;
    }

    // 12. Reverse Learning (Explain It Wrong)
    if (chatConfig.reverseLearning) {
      instruction += `\n\n**FEATURE: REVERSE LEARNING**\n- Occasionally, act as a student who misunderstands the topic.\n- Present a flawed explanation and ask the user to correct you.\n- "Wait, isn't the Earth flat because...?" (Test their ability to debunk).`;
    }

    // 13. Real-World Failure Case
    if (chatConfig.failureCases) {
      instruction += `\n\n**FEATURE: FAILURE ANALYSIS**\n- After explaining how something works, explain how it FAILS.\n- "In theory, X works. In the real world, X breaks when Y happens."\n- Provide a specific edge case or bug scenario.`;
    }

    // 14. Learning Style Detection
    if (chatConfig.styleDetection) {
      instruction += `\n\n**FEATURE: STYLE MIRRORING**\n- Analyze the user's input style (Visual/Verbal/Logical).\n- If they use metaphors, use metaphors back.\n- If they use code/logic, respond with code/logic.\n- Adapt to their "cognitive frequency".`;
    }

    // 15. AI Self-Limit Declaration
    if (chatConfig.selfLimit) {
      instruction += `\n\n**FEATURE: SELF-LIMIT DECLARATION**\n- If a query touches the boundary of your knowledge cutoff or reasoning cap, STATE IT.\n- "I can explain the theory, but I cannot execute this code."\n- "My knowledge stops at 2024."`;
    }
  }

  if (personalization) {
    instruction += `\n\n**USER PROFILE:**\n`;
    if (personalization.nickname) instruction += `- Name: ${personalization.nickname}\n`;
    if (personalization.occupation) instruction += `- Work: ${personalization.occupation}\n`;
    if (personalization.aboutYou) instruction += `- Context: ${personalization.aboutYou}\n`;
    if (personalization.customInstructions) instruction += `\n**CUSTOM PREFERENCES:**\n${personalization.customInstructions}\n`;
  }

  // Add Audio-Specific Instructions for clarity
  instruction += `\n\n**LIVE AUDIO INSTRUCTIONS (OVERRIDE):**
  - **LOUDNESS**: Speak at 100% Volume. Energetic and clear.
  - **LANGUAGE**: Listen to the user's language. If they speak Tamil, reply in Tamil. If Tanglish, reply in Tanglish.
  - **LISTEN**: The user is speaking via microphone. Eliminate background noise in your processing logic (focus on the main voice).`;

  return instruction;
};

export const extractMediaAction = (text: string): { cleanText: string, mediaAction: MediaAction | null } => {
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const match = text.match(jsonRegex);
  
  if (match && match[1]) {
    try {
      const json = JSON.parse(match[1]);
      if (json.action === 'PLAY_MEDIA') {
        const cleanText = text.replace(jsonRegex, '').trim();
        return { cleanText, mediaAction: json as MediaAction };
      }
    } catch (e) {
      console.error("Failed to parse Media JSON", e);
    }
  }
  return { cleanText: text, mediaAction: null };
};

// --- GITHUB FETCH HELPER ---
const fetchGithubReadme = async (owner: string, repo: string): Promise<string | null> => {
  const branches = ['main', 'master', 'dev'];
  for (const branch of branches) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`);
      if (res.ok) {
        return await res.text();
      }
    } catch (e) {
      // Continue to next branch
    }
  }
  return null;
};

// --- CORE CHAT FUNCTION WITH QUOTA FALLBACK ---
export const sendMessageToGeminiStream = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  config: ChatConfig,
  personalization: PersonalizationConfig,
  onUpdate: (text: string) => void,
  activePersona?: Persona
): Promise<{ text: string; sources: Source[] }> => {
  
  const ai = getAI();
  const formattedHistory = formatHistory(history);

  const currentParts: Part[] = [];
  attachments.forEach(att => {
    currentParts.push({
      inlineData: { mimeType: att.mimeType, data: att.base64 }
    });
  });
  
  // --- GITHUB AUTO-DETECTION ---
  const githubRegex = /https?:\/\/github\.com\/([a-zA-Z0-9-_.]+)\/([a-zA-Z0-9-_.]+)/;
  const match = newMessage.match(githubRegex);
  let finalUserMessage = newMessage;

  if (match) {
    const owner = match[1];
    const repo = match[2];
    onUpdate(`Analyzing GitHub Repository: ${owner}/${repo}...`);
    try {
      const readme = await fetchGithubReadme(owner, repo);
      if (readme) {
        finalUserMessage = `${newMessage}\n\n[SYSTEM: AUTOMATED GITHUB ANALYSIS]\nI have detected a GitHub repository link: ${match[0]}.\nHere is the fetched README.md content to help you analyze it:\n\n${readme.slice(0, 25000)}\n\n(End of README)\n\nPlease provide a comprehensive analysis of this project, its structure, tech stack, and purpose.`;
      } else {
        finalUserMessage = `${newMessage}\n\n[SYSTEM: GITHUB LINK DETECTED]\nI could not automatically fetch the raw README (it might be private or empty). Please use Grounding (Search) to analyze ${match[0]}.`;
      }
    } catch (e) {
      console.warn("Failed to fetch repo readme", e);
    }
  }

  if (finalUserMessage || currentParts.length === 0) {
      currentParts.push({ text: finalUserMessage || " " });
  }

  const contents: Content[] = [...formattedHistory, { role: Role.USER, parts: currentParts }];

  // Model Selection Logic
  let model = config.model || 'gemini-2.5-flash';
  
  // Pass config to buildSystemInstruction
  let requestConfig: any = {
    systemInstruction: buildSystemInstruction(personalization, activePersona, config),
    safetySettings: SAFETY_SETTINGS,
  };

  if (config.useThinking) {
    if (model.includes('lite')) {
        console.warn("Thinking Config disabled for Flash Lite.");
    } else {
        const budget = model.includes('pro') ? 32768 : 8192; 
        requestConfig['thinkingConfig'] = { thinkingBudget: budget };
    }
  }

  if (config.useGrounding || match) { // Auto-enable grounding if GitHub link detected as fallback
    requestConfig['tools'] = [{ googleSearch: {} }];
  }
  
  // Add Tools
  if (!requestConfig['tools']) requestConfig['tools'] = [];
  requestConfig['tools'].push({ functionDeclarations: [MEDIA_PLAYER_TOOL, SAVE_MEMORY_TOOL] });

  // EXECUTION HELPER
  const executeStream = async (modelName: string) => {
    return await ai.models.generateContentStream({
      model: modelName,
      contents: contents,
      config: requestConfig
    });
  };

  try {
    let stream = await executeStream(model);
    
    // Process Stream
    let fullText = '';
    const sources: Source[] = [];

    // Helper to process stream
    const processStream = async (s: any) => {
        for await (const chunk of s) {
          if (chunk.text) {
            fullText += chunk.text;
            onUpdate(fullText);
          }
          const functionCalls = chunk.functionCalls;
          if (functionCalls) {
            for (const call of functionCalls) {
              if (call.name === 'save_memory') {
                 const args: any = call.args;
                 memoryService.addMemory(args.content, args.category, args.tags);
              }
            }
          }
          const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks) {
            chunks.forEach((c: any) => {
              if (c.web) sources.push({ title: c.web.title, uri: c.web.uri });
            });
          }
        }
    }

    try {
       await processStream(stream);
    } catch (streamError: any) {
        // CATCH 429 IN STREAM
        if (streamError.status === 429 || streamError.code === 429) {
            throw streamError; // Rethrow to outer catch
        }
        throw streamError;
    }

    if (!fullText) return { text: HELPLINE_MESSAGE, sources: [] };
    return { text: fullText, sources };

  } catch (error: any) {
    // AUTOMATIC FALLBACK LOGIC
    if ((error.status === 429 || error.code === 429) && model.includes('pro')) {
        console.warn("Pro Model Quota Exceeded. Falling back to Flash.");
        onUpdate("\n\n*⚠️ Pro Quota Exceeded. Switching to Zara Fast...*\n\n");
        
        // Remove thinking config if falling back to a model that might not support high budget or needs different config
        if (requestConfig.thinkingConfig) {
            requestConfig.thinkingConfig.thinkingBudget = 8192; // Reset to safe Flash budget
        }
        
        const fallbackStream = await executeStream('gemini-2.5-flash');
        let fullText = ''; 
        const sources: Source[] = [];
        
        for await (const chunk of fallbackStream) {
            if (chunk.text) {
                fullText += chunk.text;
                onUpdate(fullText);
            }
            // ... process tools/sources ...
        }
        return { text: fullText, sources };
    }

    console.error("Gemini API Error:", error);
    onUpdate("Error: " + (error.message || "Unknown error"));
    throw error;
  }
};

export const sendAppBuilderStream = async (
  history: Message[],
  newMessage: string,
  attachments: Attachment[],
  onUpdate: (text: string) => void
): Promise<{ text: string }> => {
  
  const ai = getAI();
  const formattedHistory = formatHistory(history);

  const currentParts: Part[] = [];
  attachments.forEach(att => {
    currentParts.push({
      inlineData: { mimeType: att.mimeType, data: att.base64 }
    });
  });
  
  if (newMessage || currentParts.length === 0) {
      currentParts.push({ text: newMessage || " " });
  }

  const contents: Content[] = [...formattedHistory, { role: Role.USER, parts: currentParts }];

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash', 
      contents: contents,
      config: {
        systemInstruction: ZARA_BUILDER_IDENTITY,
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 8192 }
      }
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        onUpdate(fullText);
      }
    }

    if (!fullText) return { text: "Failed to generate app blueprint." };
    return { text: fullText };

  } catch (error: any) {
    console.error("App Builder Error:", error);
    onUpdate("Error: " + (error.message || "Unknown error"));
    throw error;
  }
};

export const generateStudentContent = async (config: StudentConfig & { attachment?: { mimeType: string, base64: string } }): Promise<string> => {
  const ai = getAI();
  let prompt = "";
  let context = "";
  
  const parts: Part[] = [];

  if (config.attachment) {
     parts.push({
        inlineData: {
           mimeType: config.attachment.mimeType,
           data: config.attachment.base64
        }
     });
     context += "\n\n**INSTRUCTION:** Use the attached document/image as the primary source material for this task.";
  } else if (config.studyMaterial) {
    context += `\n\n**SOURCE MATERIAL:**\n"${config.studyMaterial}"\n\n**INSTRUCTION:**\nUse the above source material as the primary truth.`;
  }

  switch(config.mode) {
    case 'summary':
      prompt = `Summarize the topic "${config.topic}" into concise, easy-to-read bullet points. Highlight key concepts, formulas, and important dates. ${context}`;
      break;
    case 'mcq':
      prompt = `Generate ${config.mcqConfig?.count || 5} Multiple Choice Questions (MCQs) on "${config.topic}". Difficulty: ${config.mcqConfig?.difficulty}. Format as Markdown list with answer key at the bottom. ${context}`;
      break;
    case '5mark':
      prompt = `Generate 5 short-answer questions (5 marks each) for "${config.topic}" with model answers. ${context}`;
      break;
    case '20mark':
      prompt = `Generate a detailed essay question (20 marks) for "${config.topic}" and provide a structured essay outline as the answer. ${context}`;
      break;
    case 'simple':
      prompt = `Explain the concept "${config.topic}" like I am 10 years old. Use analogies and simple language. ${context}`;
      break;
  }
  
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { role: Role.USER, parts },
    config: { safetySettings: SAFETY_SETTINGS }
  });
  return response.text || "No content generated.";
};

export const generateCodeAssist = async (code: string, task: string, language: string): Promise<string> => {
  const ai = getAI();
  let prompt = "";
  switch(task) {
    case 'debug': prompt = `Analyze this ${language} code for bugs and fix them. Explain the fixes:\n\`\`\`${language}\n${code}\n\`\`\``; break;
    case 'explain': prompt = `Explain this ${language} code step-by-step:\n\`\`\`${language}\n${code}\n\`\`\``; break;
    case 'optimize': prompt = `Optimize this ${language} code for performance and readability:\n\`\`\`${language}\n${code}\n\`\`\``; break;
    case 'generate': prompt = `Generate ${language} code for: ${code}`; break;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: { safetySettings: SAFETY_SETTINGS }
  });
  return response.text || "No code generated.";
};

export const generateImageContent = async (prompt: string, options: any): Promise<{ imageUrl?: string, text?: string }> => {
  const ai = getAI();
  
  // Use a stable model version to avoid "preview" quota issues on the free tier if possible
  const PRO_MODEL = 'gemini-3-pro-image-preview';
  const FLASH_MODEL = 'gemini-2.5-flash-image'; // Standard model name for images

  const tryGenerate = async (model: string) => {
      if (options.referenceImage) {
        return await ai.models.generateContent({
           model: FLASH_MODEL, // Edit always uses flash
           contents: {
             parts: [
               { inlineData: { mimeType: options.referenceImage.mimeType, data: options.referenceImage.base64 } },
               { text: prompt }
             ]
           }
        });
      } else {
        const config: any = {};
        if (model === PRO_MODEL) {
           config.imageConfig = {
              aspectRatio: options.aspectRatio || "1:1",
              imageSize: options.imageSize || "1K"
           };
        } else {
           config.imageConfig = {
              aspectRatio: options.aspectRatio || "1:1"
           };
        }
        return await ai.models.generateContent({
             model: model,
             contents: { parts: [{ text: prompt }] },
             config: config
        });
      }
  };

  try {
      // Determine initial model
      const selectedModel = (options.model === 'pro') ? PRO_MODEL : FLASH_MODEL;
      const response = await tryGenerate(selectedModel);
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
        if (part.text) return { text: part.text };
      }
      return { text: "No image generated." };

  } catch (e: any) {
      // Fallback for Quota limits - try simpler model if PRO failed
      if (options.model === 'pro' && (e.status === 429 || e.code === 429 || e.message.includes('Quota'))) {
          console.warn("Pro Image Quota Exceeded. Retrying with Flash Image Model.");
          try {
             const response = await tryGenerate(FLASH_MODEL);
             for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) return { imageUrl: `data:image/png;base64,${part.inlineData.data}` };
             }
          } catch (retryError: any) {
             throw new Error(`Quota exceeded on both models. Please try again later.`);
          }
      }
      throw e;
  }
};

// ... (Rest of file remains unchanged) ...
export const generateVideo = async (
  prompt: string, 
  aspectRatio: string, 
  images?: { base64: string, mimeType: string }[]
): Promise<string> => {
   const ai = getAI();
   
   if (images && images.length > 1) {
      if (images.length > 3) throw new Error("Maximum 3 images allowed for slideshows.");
      
      const referenceImagesPayload: VideoGenerationReferenceImage[] = images.map(img => ({
         image: { imageBytes: img.base64, mimeType: img.mimeType },
         referenceType: VideoGenerationReferenceType.ASSET,
      }));

      let operation = await ai.models.generateVideos({
         model: 'veo-3.1-generate-preview',
         prompt: prompt,
         config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9',
            referenceImages: referenceImagesPayload
         }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }
      
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("Slideshow generation failed");
      return `${uri}&key=${process.env.API_KEY}`;

   } else {
      const config: any = {
         numberOfVideos: 1,
         resolution: '720p',
         aspectRatio: aspectRatio
      };
      
      let operation;
      
      if (images && images.length === 1) {
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            image: { imageBytes: images[0].base64, mimeType: images[0].mimeType },
            config
         });
      } else {
         operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: prompt,
            config
         });
      }

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("Video generation failed");
      
      return `${uri}&key=${process.env.API_KEY}`;
   }
};

export const analyzeVideo = async (base64Video: string, mimeType: string, prompt: string): Promise<string> => {
   const ai = getAI();
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

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-preview-tts',
    contents: { parts: [{ text }] },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName }
        }
      }
    }
  });

  const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) throw new Error("No audio generated");
  return audioData;
};

export const getBreakingNews = async (): Promise<{ text: string, sources: Source[] }> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: "What are the top 5 breaking news headlines right now? Format each headline as a short markdown card with a summary.",
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  
  const sources: Source[] = [];
  response.candidates?.[0]?.groundingMetadata?.groundingChunks?.forEach((c: any) => {
    if (c.web) sources.push({ title: c.web.title, uri: c.web.uri });
  });

  return { text: response.text || "Unable to fetch news.", sources };
};

export const generateFlashcards = async (topic: string, context: string): Promise<Flashcard[]> => {
  const ai = getAI();
  const prompt = `Create 5 flashcards for "${topic}" based on this context: "${context}". Return valid JSON array with objects having 'front' and 'back' properties.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || '[]');
};

export const generateStudyPlan = async (topic: string, hours: number): Promise<StudyPlan> => {
   const ai = getAI();
   const prompt = `Create a 5-day study plan for "${topic}" with ${hours} hours per day. Return valid JSON.`;
   const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
   });
   
   const raw = JSON.parse(response.text || '{}');
   return {
     id: crypto.randomUUID(),
     topic,
     weeklySchedule: raw.weeklySchedule || [], 
     createdAt: Date.now(),
     startDate: new Date().toISOString()
   } as StudyPlan;
};

export const generateExamQuestions = async (config: ExamConfig): Promise<ExamQuestion[]> => {
  const ai = getAI();
  const prompt = `Generate ${config.questionCount} questions for a ${config.examType} on "${config.subject}". Difficulty: ${config.difficulty}. Language: ${config.language}. Include ${config.includeTheory ? 'both MCQ and Theory' : 'only MCQ'} questions. Return strict JSON array.`;
  
  const response = await ai.models.generateContent({
     model: 'gemini-2.5-flash',
     contents: prompt,
     config: { 
       responseMimeType: 'application/json',
       responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            type: { type: Type.STRING, enum: ["MCQ", "SHORT", "LONG"] },
            text: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            marks: { type: Type.INTEGER }
          },
          required: ["id", "type", "text", "correctAnswer", "marks"]
        }
      }
     }
  });
  
  return JSON.parse(response.text || '[]');
};

export const evaluateTheoryAnswers = async (subject: string, question: ExamQuestion, answer: string): Promise<{ score: number, feedback: string }> => {
   const ai = getAI();
   const prompt = `Evaluate this answer for the question: "${question.text}" (Marks: ${question.marks}). Subject: ${subject}. User Answer: "${answer}". Return JSON with 'score' (number) and 'feedback' (string).`;
   
   const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            feedback: { type: Type.STRING }
          },
          required: ["score", "feedback"]
        }
      }
   });
   
   return JSON.parse(response.text || '{ "score": 0, "feedback": "Error evaluating" }');
};
