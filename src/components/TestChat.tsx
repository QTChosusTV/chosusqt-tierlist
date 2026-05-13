'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  sender: string;
  text: string;
  at: number;
}

interface TestChatProps {
  entryId: string;
  myName: string;
  otherName: string;
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
    return () => { supabase.removeChannel(channel); };
  }, [entryId]);

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
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      background: '#0d0d12',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '9px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: '#111118',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* Live dot */}
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#4ade80',
          boxShadow: '0 0 6px rgba(74,222,128,0.8)',
          display: 'inline-block', flexShrink: 0,
        }} />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
        }}>
          Chat
        </span>
        <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 10 }}>·</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>
          {otherName}
        </span>
      </div>

      {/* Messages */}
      <div style={{
        height: 220, overflowY: 'auto', padding: '10px 12px',
        display: 'flex', flexDirection: 'column', gap: 6,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.08) transparent',
      }}>
        {messages.length === 0 && (
          <div style={{
            color: 'rgba(255,255,255,0.12)', fontSize: 12, textAlign: 'center',
            marginTop: 70, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>
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
                maxWidth: '80%', padding: '7px 11px',
                // sharp on the "tail" corner, rounded elsewhere — game chat feel
                borderRadius: isMe ? '6px 0 6px 6px' : '0 6px 6px 6px',
                background: isMe
                  ? 'linear-gradient(135deg, #4aa3ff, #b56bff)'
                  : 'rgba(255,255,255,0.06)',
                border: isMe ? 'none' : '1px solid rgba(255,255,255,0.07)',
                color: '#fff', fontSize: 13, lineHeight: 1.45, wordBreak: 'break-word',
              }}>
                {msg.text}
              </div>
              <span style={{
                fontSize: 10, color: 'rgba(255,255,255,0.18)', marginTop: 3,
                letterSpacing: '0.03em',
              }}>
                {msg.sender} · {new Date(msg.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: '#0f0f14',
        display: 'flex', gap: 0,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{
            flex: 1, padding: '8px 12px',
            borderRadius: 0,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRight: 'none',
            color: '#fff', fontSize: 13, outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            padding: '8px 16px', borderRadius: 0, border: 'none',
            background: input.trim()
              ? 'linear-gradient(135deg, #4aa3ff, #b56bff)'
              : 'rgba(255,255,255,0.05)',
            color: input.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
            fontWeight: 700, fontSize: 11,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.12s',
            whiteSpace: 'nowrap',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}