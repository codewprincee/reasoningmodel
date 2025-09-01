import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';

import './Chat.css';
import {apiService} from '../services/apiService';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatSettings {
  modelVersion?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  useStreaming: boolean;
}

const Chat: React.FC = () => {
  const { state } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => `chat-${Date.now()}`);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    systemPrompt: 'You are a helpful AI assistant powered by GPT OSS 20B. Provide clear, accurate, and helpful responses.',
    temperature: 0.7,
    maxTokens: 2048,
    useStreaming: true,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random()}`,
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<ChatMessage> | ((prev: ChatMessage) => Partial<ChatMessage>)) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === id) {
        const updateObj = typeof updates === 'function' ? updates(msg) : updates;
        return { ...msg, ...updateObj };
      }
      return msg;
    }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Add user message
    addMessage({
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    try {
      if (settings.useStreaming) {
        // Streaming response
        const assistantMessageId = addMessage({
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        });

        await apiService.sendChatMessageStream(
          userMessage,
          (chunk) => {
            if (chunk.type === 'token' && chunk.content) {
              updateMessage(assistantMessageId, (prevMsg) => ({
                content: (prevMsg.content || '') + chunk.content,
              }));
            } else if (chunk.type === 'complete') {
              updateMessage(assistantMessageId, {
                isStreaming: false,
              });
            }
          },
          {
            conversationId,
            systemPrompt: settings.systemPrompt,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            modelVersion: settings.modelVersion,
          }
        );
      } else {
        // Non-streaming response
        const response = await apiService.sendChatMessage(userMessage, {
          conversationId,
          systemPrompt: settings.systemPrompt,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          modelVersion: settings.modelVersion,
        });

        if (response) {
          addMessage({
            type: 'assistant',
            content: response.response,
            timestamp: new Date(response.timestamp),
          });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage({
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-title">
          <h1>🤖 Chat with GPT OSS 20B</h1>
          <div className="chat-status">
            {state.isBackendAvailable ? (
              <span className="status-online">● Online</span>
            ) : (
              <span className="status-offline">● Offline</span>
            )}
          </div>
        </div>
        <div className="chat-controls">
          <button
            className="btn btn-secondary"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Settings
          </button>
          <button
            className="btn btn-secondary"
            onClick={clearChat}
            disabled={messages.length === 0}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="chat-settings">
          <div className="settings-grid">
            <div className="setting-group">
              <label>System Prompt:</label>
              <textarea
                value={settings.systemPrompt}
                onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                rows={3}
                placeholder="Set the AI's behavior and context..."
              />
            </div>
            <div className="setting-group">
              <label>Temperature: {settings.temperature}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              />
              <small>Higher values make output more creative</small>
            </div>
            <div className="setting-group">
              <label>Max Tokens: {settings.maxTokens}</label>
              <input
                type="range"
                min="100"
                max="4000"
                step="100"
                value={settings.maxTokens}
                onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              />
            </div>
            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.useStreaming}
                  onChange={(e) => setSettings(prev => ({ ...prev, useStreaming: e.target.checked }))}
                />
                Enable Streaming
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="welcome-content">
              <h2>👋 Welcome to GPT OSS 20B Chat!</h2>
              <p>Start a conversation with the AI model. You can ask questions, request help with tasks, or just have a friendly chat.</p>
              <div className="example-prompts">
                <h3>Try asking:</h3>
                <ul>
                  <li>"Explain quantum computing in simple terms"</li>
                  <li>"Write a Python function to sort a list"</li>
                  <li>"What are the benefits of renewable energy?"</li>
                  <li>"Help me brainstorm ideas for a mobile app"</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`message ${message.type}`}>
              <div className="message-header">
                <span className="message-sender">
                  {message.type === 'user' ? '👤 You' : '🤖 GPT OSS 20B'}
                </span>
                <span className="message-time">
                  {formatTimestamp(message.timestamp)}
                </span>
              </div>
              <div className="message-content">
                {message.content}
                {message.isStreaming && <span className="streaming-cursor">▊</span>}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <div className="chat-input">
          <textarea
            ref={inputRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message here... (Press Enter to send, Shift+Enter for new line)"
            rows={1}
            disabled={isLoading || !state.isBackendAvailable}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || !state.isBackendAvailable}
            className="send-button"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
        {!state.isBackendAvailable && (
          <div className="offline-notice">
            ⚠️ Backend is offline. Please check your connection.
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
