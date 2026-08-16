import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register: registerUser } = useAuth();

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

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex items-center justify-center p-4 selection:bg-[#3b82f6]/40 relative overflow-hidden">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#3b82f6]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#bfdbfe]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0d1c2d] border border-[#464555]/30 rounded-2xl shadow-2xl p-6 sm:p-8 relative z-10 animate-fade">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#3b82f6] rounded-2xl shadow-[0_0_20px_rgba(77,68,227,0.4)] mb-3">
            <span className="material-symbols-outlined fill-1 text-white text-2xl">
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

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 text-[#ffb4ab] rounded-xl text-xs flex items-center gap-2 animate-fade">
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
                placeholder="name@domain.com"
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
            disabled={loading}
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
      </div>
    </div>
  );
};
