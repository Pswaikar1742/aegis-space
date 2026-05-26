'use client';

import React, { useState, useRef, useEffect } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://aegis-space-backend.onrender.com';

interface AICopilotProps {
  activeRole: 'cfo' | 'manager' | 'tenant_admin' | 'member' | 'front_desk' | 'it_admin' | 'vendor';
  branchId: string;
  memberId: string;
  onRefreshTelemetry: () => void;
}

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const personaPrompts: Record<AICopilotProps['activeRole'], string[]> = {
  cfo: [
    'Summarize revenue this week',
    'What receivables need attention?',
    'How is occupancy trending?',
  ],
  manager: [
    'Show open maintenance issues',
    'What needs attention on the floor?',
    'Summarize today\'s operations',
  ],
  tenant_admin: [
    'How many credits remain?',
    'What bookings are active?',
    'How can I optimize usage?',
  ],
  member: [
    'Find me a desk',
    'Help me book a meeting room',
    'How do I get a gatepass?',
  ],
  front_desk: [
    'Register a visitor',
    'Who is currently checked in?',
    'How do I check someone out?',
  ],
  it_admin: [
    'Show infrastructure health',
    'Which seats need attention?',
    'Summarize visitor flow',
  ],
  vendor: [
    'List open work orders',
    'What is the highest priority task?',
    'Mark a task complete',
  ],
};

export const AICopilot: React.FC<AICopilotProps> = ({ activeRole, branchId, memberId, onRefreshTelemetry }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: `Hi! I'm your Aegis Copilot. As a ${activeRole.replace('_', ' ')}, how can I assist you today?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([
      { sender: 'ai', text: `Hi! I'm your Aegis Copilot. As a ${activeRole.replace('_', ' ')}, how can I assist you today?` }
    ]);
  }, [activeRole]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setErrorMessage('');

    const userText = input;
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Role': activeRole,
          'X-User-ID': memberId,
          'X-Branch-ID': branchId,
        },
        body: JSON.stringify({
          message: userText,
          branch_id: branchId,
          member_id: memberId
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);
        onRefreshTelemetry(); // Refresh metrics in case an action occurred
      } else {
        const detail = typeof data?.detail === 'string' ? data.detail : 'Integration error from backend.';
        setMessages(prev => [...prev, { sender: 'ai', text: `Sorry, I encountered an integration error: ${detail}` }]);
      }
    } catch {
      setErrorMessage(`Connection failed to ${BACKEND_URL}. Verify NEXT_PUBLIC_API_BASE_URL in frontend env and backend CORS.`);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Could not connect to the Aegis Copilot Gateway.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-950 text-white font-bold px-4 py-3 rounded-full shadow-xl transition-all border border-slate-800"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Aegis AI Copilot
      </button>

      {/* Chat Drawer Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 h-[450px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 p-4 border-b border-slate-800 flex justify-between items-center text-white">
            <div>
              <h4 className="font-bold text-sm">Aegis Space Copilot</h4>
              <p className="text-[10px] text-slate-400 capitalize">Active Role: {activeRole.replace('_', ' ')}</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white text-sm font-bold">×</button>
          </div>

          {/* Messages Container */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-50">
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-500">
              Try a quick prompt for the {activeRole.replace('_', ' ')} persona:
              <div className="mt-2 flex flex-wrap gap-2">
                {(personaPrompts[activeRole] || personaPrompts.member).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`p-3 rounded-lg text-xs max-w-[85%] shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-slate-800 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="p-3 bg-white border border-slate-200 text-slate-400 text-xs rounded-lg rounded-bl-none shadow-sm italic animate-pulse">
                  Copilot is processing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot something..."
              disabled={loading}
              className="flex-grow p-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-slate-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-950 text-white font-bold px-3 py-2 rounded-lg text-xs transition-colors"
            >
              Send
            </button>
          </form>
          {errorMessage ? (
            <div className="px-3 pb-3 text-[11px] text-rose-600 bg-white">{errorMessage}</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default AICopilot;
