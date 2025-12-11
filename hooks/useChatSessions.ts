
import { useState, useEffect, useRef } from 'react';
import { ChatSession, Message, Role } from '../types';

const STORAGE_KEY_SESSIONS = 'zara_chat_sessions';

export const useChatSessions = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (stored) {
      try {
        setSessions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load sessions", e);
      }
    }
  }, []);

  // Debounced Save to LocalStorage
  // Prevents blocking the main thread on every single token streamed from the AI
  const saveToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
    }, 1000); // 1 second debounce
  };

  const createSession = (initialMessages: Message[]) => {
    const newId = crypto.randomUUID();
    
    // Auto-generate title
    const firstUserMsg = initialMessages.find(m => m.role === Role.USER);
    const text = firstUserMsg?.text || "New Chat";
    const title = text.length > 30 ? text.substring(0, 30) + '...' : text;

    const newSession: ChatSession = {
      id: newId,
      title,
      messages: initialMessages,
      updatedAt: Date.now()
    };

    const updated = [newSession, ...sessions];
    saveToStorage(updated);
    setCurrentSessionId(newId);
    return newId;
  };

  const updateSession = (id: string, messages: Message[]) => {
    const existingIndex = sessions.findIndex(s => s.id === id);
    if (existingIndex === -1) {
      // If session doesn't exist, create it
      return createSession(messages);
    }

    // Optimization: Don't sort the array on every stream chunk update.
    // Only sort if needed, or rely on client-side sorting when rendering the list.
    // Here we construct a new array efficiently.
    const newSessions = [...sessions];
    newSessions[existingIndex] = { 
        ...newSessions[existingIndex], 
        messages, 
        updatedAt: Date.now() 
    };
    
    // Move to top if it's not already
    if (existingIndex > 0) {
        const item = newSessions[existingIndex];
        newSessions.splice(existingIndex, 1);
        newSessions.unshift(item);
    }

    saveToStorage(newSessions);
    return id;
  };

  const deleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    saveToStorage(updated);
    if (currentSessionId === id) {
      setCurrentSessionId(null);
    }
  };

  const renameSession = (id: string, newTitle: string) => {
    const updated = sessions.map(s => 
      s.id === id ? { ...s, title: newTitle } : s
    );
    saveToStorage(updated);
  };

  const loadSession = (id: string) => {
    setCurrentSessionId(id);
    const session = sessions.find(s => s.id === id);
    return session ? session.messages : [];
  };

  const clearCurrentSession = () => {
    setCurrentSessionId(null);
  };

  return {
    sessions,
    currentSessionId,
    createSession,
    updateSession,
    deleteSession,
    renameSession,
    loadSession,
    clearCurrentSession
  };
};
