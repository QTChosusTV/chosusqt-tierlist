'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MODES } from '@/types/tierlist';
import type { ModeKey } from '@/types/tierlist';

export type FilterMode = ModeKey | 'overall';

interface ModeFilterProps {
  selectedMode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
}

export default function ModeFilter({ selectedMode, onModeChange }: ModeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allOptions = [
    { key: 'overall' as const, label: 'Overall', icon: null },
    ...MODES.map(mode => ({ key: mode.key, label: mode.key.toUpperCase(), icon: mode.icon }))
  ];

  const selectedOption = allOptions.find(opt => opt.key === selectedMode);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '220px' }}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'linear-gradient(180deg, #1a1a24, #14141a)',
          border: '2px solid #2a2a35',
          borderRadius: '12px',
          color: 'white',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#4aa3ff';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(74,163,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#2a2a35';
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedOption?.icon && (
            <Image
              src={selectedOption.icon}
              alt={selectedOption.label}
              width={24}
              height={24}
              style={{ objectFit: 'contain' }}
            />
          )}
          {selectedOption?.icon === null && (
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 800
            }}>
              ★
            </div>
          )}
          <span>{selectedOption?.label}</span>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: '#1a1a24',
            border: '2px solid #2a2a35',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 1000,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {allOptions.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                onModeChange(option.key);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: selectedMode === option.key ? 'rgba(74,163,255,0.15)' : 'transparent',
                border: 'none',
                borderBottom: '1px solid #2a2a35',
                color: 'white',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.15s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                if (selectedMode !== option.key) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedMode !== option.key) {
                  e.currentTarget.style.background = 'transparent';
                } else {
                  e.currentTarget.style.background = 'rgba(74,163,255,0.15)';
                }
              }}
            >
              {option.icon && (
                <Image
                  src={option.icon}
                  alt={option.label}
                  width={24}
                  height={24}
                  style={{ objectFit: 'contain' }}
                />
              )}
              {option.icon === null && (
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4aa3ff, #b56bff, #ff4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 800
                }}>
                  ★
                </div>
              )}
              <span>{option.label}</span>
              {selectedMode === option.key && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ marginLeft: 'auto' }}
                >
                  <path
                    d="M13.5 4L6 11.5L2.5 8"
                    stroke="#4aa3ff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}