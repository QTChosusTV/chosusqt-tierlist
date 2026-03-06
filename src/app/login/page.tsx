'use client';

import { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/');
  };

  
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #09090f;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          position: relative;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.55;
          pointer-events: none;
          animation: drift 10s ease-in-out infinite alternate;
        }
        .blob-1 {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #ff3cac, #784ba0);
          top: -120px; left: -140px;
          animation-duration: 12s;
        }
        .blob-2 {
          width: 440px; height: 440px;
          background: radial-gradient(circle, #2b86c5, #00d2ff);
          bottom: -100px; right: -100px;
          animation-duration: 9s;
          animation-delay: -4s;
        }
        .blob-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #f9a825, #ff6f00);
          top: 50%; left: 60%;
          animation-duration: 14s;
          animation-delay: -7s;
        }
        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.07); }
        }

        .card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 420px;
          margin: 0 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 44px 36px;
          backdrop-filter: blur(24px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);
          animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .logo-ring {
          width: 56px; height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #ff3cac, #784ba0, #2b86c5);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 8px 24px rgba(255,60,172,0.4);
          font-size: 26px;
        }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: 30px;
          font-weight: 800;
          text-align: center;
          margin: 0 0 6px;
          background: linear-gradient(90deg, #ff3cac, #a855f7, #2b86c5, #00d2ff);
          background-size: 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        @keyframes shimmer {
          from { background-position: 0% center; }
          to   { background-position: 200% center; }
        }

        .subtitle {
          text-align: center;
          color: rgba(255,255,255,0.35);
          font-size: 14px;
          margin: 0 0 36px;
        }

        .field-label {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 8px;
        }

        .field-wrap {
          margin-bottom: 18px;
        }

        .input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          box-sizing: border-box;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input::placeholder { color: rgba(255,255,255,0.2); }
        .input:focus {
          border-color: rgba(168,85,247,0.6);
          box-shadow: 0 0 0 3px rgba(168,85,247,0.15);
        }

        .error-msg {
          font-size: 13px;
          color: #ff6b8a;
          background: rgba(255,107,138,0.08);
          border: 1px solid rgba(255,107,138,0.2);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 16px;
        }

        .btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #ff3cac, #784ba0, #2b86c5);
          background-size: 200%;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 6px 24px rgba(255,60,172,0.35);
          letter-spacing: 0.3px;
          margin-top: 4px;
        }
        .btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 10px 32px rgba(255,60,172,0.45);
        }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .footer-link {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }
        .footer-link a {
          color: #a855f7;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        .footer-link a:hover { color: #c084fc; }

        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 22px 0;
        }
        .divider-line {
          flex: 1; height: 1px;
          background: rgba(255,255,255,0.08);
        }
        .divider-text {
          font-size: 12px;
          color: rgba(255,255,255,0.2);
        }
      `}</style>

      <div className="login-root">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="card">
          <div className="logo-ring">🏆</div>

          <h1 className="title">Welcome back</h1>
          <p className="subtitle">Sign in to your leaderboard account</p>

          <form onSubmit={handleLogin}>
            <div className="field-wrap">
              <div className="field-label">Email</div>
              <input
                className="input"
                type="email"
                placeholder="you@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-wrap">
              <div className="field-label">Password</div>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter'}
                required
              />
            </div>

            {error && <div className="error-msg">{error}</div>}

            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="footer-link">
            Don't have an account? <a href="/register">Register</a>
          </div>
        </div>
      </div>
    </>
  );
}