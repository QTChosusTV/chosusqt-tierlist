'use client';

import { useState, FormEvent, useEffect} from 'react';
import { supabase } from '@/lib/supabase';

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!signUpData.user) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    setSuccess('Account created! Check your email to confirm before signing in.');
    setLoading(false);
  };

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

        .register-root {
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
          width: 500px; height: 500px;
          background: radial-gradient(circle, #a855f7, #6366f1);
          top: -100px; right: -120px;
          animation-duration: 11s;
        }
        .blob-2 {
          width: 460px; height: 460px;
          background: radial-gradient(circle, #ff3cac, #ff6f00);
          bottom: -120px; left: -100px;
          animation-duration: 9s;
          animation-delay: -3s;
        }
        .blob-3 {
          width: 280px; height: 280px;
          background: radial-gradient(circle, #00d2ff, #2b86c5);
          top: 40%; left: 10%;
          animation-duration: 13s;
          animation-delay: -6s;
        }
        @keyframes drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(25px, 18px) scale(1.06); }
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
          background: linear-gradient(135deg, #a855f7, #6366f1, #ff3cac);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 8px 24px rgba(168,85,247,0.4);
          font-size: 26px;
        }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: 30px;
          font-weight: 800;
          text-align: center;
          margin: 0 0 6px;
          background: linear-gradient(90deg, #a855f7, #6366f1, #ff3cac, #ff6f00);
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
          margin: 0 0 32px;
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
          margin-bottom: 16px;
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

        .success-msg {
          font-size: 13px;
          color: #4ade80;
          background: rgba(74,222,128,0.08);
          border: 1px solid rgba(74,222,128,0.2);
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 16px;
        }

        .btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #a855f7, #6366f1, #ff3cac);
          background-size: 200%;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 6px 24px rgba(168,85,247,0.35);
          letter-spacing: 0.3px;
          margin-top: 4px;
        }
        .btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 10px 32px rgba(168,85,247,0.45);
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
      `}</style>

      <div className="register-root">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="card">
          <div className="logo-ring">✨</div>

          <h1 className="title">Create account</h1>
          <p className="subtitle">Join the leaderboard today</p>

          <form onSubmit={handleRegister}>
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
                required
              />
            </div>

            <div className="field-wrap">
              <div className="field-label">Confirm Password</div>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && <div className="error-msg">{error}</div>}
            {success && <div className="success-msg">{success}</div>}

            <button type="submit" className="btn" disabled={loading || !!success}>
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>

          <div className="footer-link">
            Already have an account? <a href="/login">Sign in</a>
          </div>
        </div>
      </div>
    </>
  );
}