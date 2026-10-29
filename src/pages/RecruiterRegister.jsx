import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api.js';
import { User, Mail, Lock, Building2, ArrowRight, Loader2, AlertCircle, CheckCircle, Zap } from 'lucide-react';

const RecruiterRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', company: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const passwordStrength = () => {
    const p = formData.password;
    if (!p) return null;
    if (p.length < 6) return { label: 'Too short', color: 'bg-red-500', width: '25%' };
    if (p.length < 8 || !/[A-Z]/.test(p) || !/\d/.test(p))
      return { label: 'Weak', color: 'bg-amber-500', width: '50%' };
    if (p.length >= 8 && /[A-Z]/.test(p) && /\d/.test(p) && /[^a-zA-Z0-9]/.test(p))
      return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
    return { label: 'Good', color: 'bg-blue-500', width: '75%' };
  };

  const pwdStr = passwordStrength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const res = await authAPI.recruiterRegister(
        formData.fullName, formData.email, formData.password, formData.company
      );
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.recruiter));
      navigate('/recruiter/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-animate flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-glow animate-float">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-5xl font-black tracking-tight mb-3">INTERVUEX</h1>
          <p className="text-xl text-white/80 font-medium mb-10">Enterprise AI Interview Platform</p>
          <div className="space-y-3 text-left max-w-xs mx-auto">
            {['Free to set up — no credit card required', 'Invite unlimited candidates', 'AI-generated questions from any resume', 'Fully automated scoring & reports'].map((t, i) => (
              <div key={i} className="flex items-center gap-3 animate-fade-up" style={{ animationDelay: `${i*0.1}s` }}>
                <CheckCircle className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                <span className="text-sm text-white/90">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-up py-8">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-10 h-10 gradient-animate rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-black text-gray-900">INTERVUEX</span>
            </div>
          </div>

          <div className="card p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
              <p className="text-gray-500 mt-1">Start hiring smarter with AI</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 animate-scale-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { icon: User,     label: 'Full Name',  name: 'fullName', type: 'text',     placeholder: 'Jane Smith' },
                { icon: Mail,     label: 'Work Email', name: 'email',    type: 'email',    placeholder: 'jane@company.com' },
                { icon: Building2,label: 'Company',    name: 'company',  type: 'text',     placeholder: 'Acme Corporation' },
              ].map(({ icon: Icon, label, name, type, placeholder }) => (
                <div key={name}>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={type} name={name} value={formData[name]}
                      onChange={handleChange} required
                      className="input-field pl-10"
                      placeholder={placeholder}
                    />
                  </div>
                </div>
              ))}

              {/* Password with strength meter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPwd ? 'text' : 'password'} name="password"
                    value={formData.password} onChange={handleChange}
                    required minLength={6}
                    className="input-field pl-10 pr-12" placeholder="Min. 6 characters"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>
                {pwdStr && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${pwdStr.color}`} style={{ width: pwdStr.width }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pwdStr.label}</p>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                ) : (
                  <>Create Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{' '}
                <button onClick={() => navigate('/recruiter/login')}
                  className="text-brand-600 hover:text-brand-700 font-semibold">
                  Sign in
                </button>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By creating an account you agree to our Terms of Service & Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecruiterRegister;
