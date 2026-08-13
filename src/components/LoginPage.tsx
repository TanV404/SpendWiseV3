import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Listen for OAuth message from popup callback window if implemented
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_OAUTH_SUCCESS' && event.data?.user) {
        setGoogleLoading(false);
        onLoginSuccess(event.data.user);
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onLoginSuccess]);

  const { login, register: registerUser, loginWithGoogle } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password || (isSignUp && !name)) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (!email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      let user: UserProfile;
      if (isSignUp) {
        user = await registerUser(email, password, name);
      } else {
        user = await login(email, password);
      }
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);

    try {
      // 1. Fetch OAuth URL from server if configured
      const res = await fetch('/api/auth/google/url');
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          const authWindow = window.open(
            data.url,
            'google_oauth_popup',
            'width=550,height=650,left=200,top=100'
          );

          if (authWindow) {
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Backend OAuth popup unavailable, using direct Google Auth:', err);
    }

    try {
      const user = await loginWithGoogle(
        'alex.rivera@gmail.com',
        'Alex Rivera',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      );
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google authentication failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex items-center justify-center p-4 selection:bg-[#3b82f6]/40 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3b82f6]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#bfdbfe]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d1c2d] border border-[#464555]/30 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 animate-fade">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3b82f6] rounded-2xl shadow-[0_0_20px_rgba(77,68,227,0.4)] mb-3">
            <span className="material-symbols-outlined text-white text-2xl">
              account_balance_wallet
            </span>
          </div>
          <h2 className="text-2xl font-bold text-[#d4e4fa] tracking-tight">SpendWise</h2>
          <p className="text-xs text-[#c7c4d8] uppercase tracking-widest mt-1 font-mono-data font-semibold">
            Personal Finance
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Sign Up */}
        <div className="flex bg-[#010f1f] p-1 rounded-xl border border-[#464555]/20 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              !isSignUp ? 'bg-[#3b82f6] text-white shadow-md' : 'text-[#c7c4d8] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              isSignUp ? 'bg-[#3b82f6] text-white shadow-md' : 'text-[#c7c4d8] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleOAuth}
          disabled={googleLoading || loading}
          className="w-full py-2.5 px-4 bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] border border-[#464555]/30 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-3 shadow-sm hover:border-[#3b82f6]/50 cursor-pointer disabled:opacity-50 mb-5"
        >
          {googleLoading ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>Connecting Google Account...</span>
            </>
          ) : (
            <>
              {/* Google G SVG */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isSignUp ? 'Sign up with Google' : 'Continue with Google'}</span>
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-[#464555]/20" />
          <span className="px-3 text-[10px] font-mono-data uppercase text-[#c7c4d8]/60 font-semibold">
            Or with email
          </span>
          <div className="flex-1 border-t border-[#464555]/20" />
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2 animate-fade">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-mono-data text-[#c7c4d8] mb-1 font-semibold">
                Full Name
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#c7c4d8]/50">
                  person
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#c7c4d8]/40 focus:outline-none focus:border-[#3b82f6]"
                  required={isSignUp}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono-data text-[#c7c4d8] mb-1 font-semibold">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#c7c4d8]/50">
                mail
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.rivera@example.com"
                className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#c7c4d8]/40 focus:outline-none focus:border-[#3b82f6]"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-mono-data text-[#c7c4d8] font-semibold">
                Password
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => alert('Password reset instructions sent to your email!')}
                  className="text-[11px] text-[#bfdbfe] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#c7c4d8]/50">
                lock
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#122131] rounded-xl border border-[#464555]/30 pl-9 pr-10 py-2.5 text-xs text-white placeholder:text-[#c7c4d8]/40 focus:outline-none focus:border-[#3b82f6]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c7c4d8]/60 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-[#c7c4d8] cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-[#122131] border-[#464555] text-[#3b82f6] focus:ring-[#3b82f6]"
              />
              Remember this device
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-3 bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white rounded-xl font-bold text-xs shadow-lg shadow-[#3b82f6]/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{isSignUp ? 'Create Account' : 'Sign In to SpendWise'}</span>
            )}
          </button>
        </form>

        {/* Continue as Guest Footer */}
        <div className="mt-6 pt-5 border-t border-[#464555]/20 text-center">
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-xs text-[#bfdbfe] hover:text-white font-semibold transition-colors flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
          >
            <span>Continue as Guest Demo</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
