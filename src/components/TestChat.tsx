'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  sender: string;
  text: string;
  at: number;
}

interface TestChatProps {
  entryId: string;       // unique per test session — channel name
  myName: string;        // tester username or player username
  otherName: string;     // the other party's name (for display)
}

export default function TestChat({ entryId, myName, otherName }: TestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`chat:${entryId}`, {
      config: { broadcast: { self: true } },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload as Message]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entryId]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage() {
    if (!input.trim() || !channelRef.current) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: { sender: myName, text: input.trim(), at: Date.now() },
    });
    setInput('');
  }

  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.02)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        fontSize: 12, fontWeight: 700,
        color: 'rgba(255,255,255,0.4)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.8)', display: 'inline-block' }} />
        Chat with {otherName}
      </div>

      {/* Messages */}
      <div style={{
        height: 220, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {messages.length === 0 && (
          <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13, textAlign: 'center', marginTop: 60 }}>
            No messages yet
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender === myName;
          return (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isMe ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '80%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background: isMe ? 'linear-gradient(135deg, #4aa3ff, #b56bff)' : 'rgba(255,255,255,0.07)',
                color: '#fff', fontSize: 13, lineHeight: 1.4, wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>
                {msg.sender} · {new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '10px 12px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: input.trim() ? 'linear-gradient(135deg, #4aa3ff, #b56bff)' : 'rgba(255,255,255,0.06)',
            color: input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
            fontWeight: 700, fontSize: 13, cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}