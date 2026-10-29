import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Camera, Mic, Monitor, AlertCircle, ArrowRight, Loader2, KeyRound, Zap } from 'lucide-react';

const CandidateLogin = () => {
  const navigate   = useNavigate();
  const [token, setToken]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!token.trim()) { setError('Please enter your interview access token.'); return; }
    setIsLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/auth/candidate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.trim(),
          deviceFingerprint: {
            userAgent: navigator.userAgent,
            language:  navigator.language,
            platform:  navigator.platform,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid or expired interview link');
      localStorage.setItem('token',     data.token);
      localStorage.setItem('sessionId', data.session.id);
      navigate(`/interview-terms/${token.trim()}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-4xl grid lg:grid-cols-5 gap-6">
        {/* Left info card */}
        <div className="lg:col-span-2 glass-dark rounded-2xl p-6 text-white hidden lg:flex flex-col justify-between animate-slide-in-left">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 gradient-animate rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-black">INTERVUEX</span>
            </div>
            <h2 className="text-2xl font-bold mb-3 leading-snug">Your interview is ready</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Enter the access token from your invitation email to begin your AI-powered interview session.
            </p>
          </div>

          <div className="space-y-3 mt-8">
            {[
              { icon: Camera,  label: 'Camera monitoring active' },
              { icon: Mic,     label: 'Voice input supported' },
              { icon: Monitor, label: 'Fullscreen required' },
              { icon: Shield,  label: 'End-to-end encrypted' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3.5 h-3.5 text-white/80" />
                </div>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div className="lg:col-span-3 glass rounded-2xl p-8 animate-slide-in-right">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-9 h-9 gradient-animate rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900">INTERVUEX</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Enter your access token</h1>
            <p className="text-gray-500 mt-1 text-sm">Check your invitation email for the unique token</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Interview Access Token</label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  placeholder="e.g. 3f9a2c1d-8e7b-4a6f-…"
                  className="input-field pl-10 font-mono text-sm"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-scale-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading || !token.trim()} className="btn-primary w-full">
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Verifying token…</>
              ) : (
                <>Continue to Interview <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Requirements */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 mb-2">Before you begin</p>
            <ul className="text-xs text-amber-700 space-y-1">
              <li>• Use <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> for best experience</li>
              <li>• Ensure you're in a <strong>quiet, well-lit room</strong> — alone</li>
              <li>• Allow <strong>camera and microphone</strong> access when prompted</li>
              <li>• Do <strong>not</strong> close or refresh the browser during the interview</li>
            </ul>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 INTERVUEX · Enterprise Interview Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateLogin;
