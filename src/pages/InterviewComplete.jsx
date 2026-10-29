import { useEffect, useState } from 'react';
import { CheckCircle, Clock, Shield, BarChart2, Zap } from 'lucide-react';

const InterviewComplete = () => {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), 100); return () => clearTimeout(t); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      {/* background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className={`relative z-10 w-full max-w-lg transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* success icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse-ring">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-glow">
                <CheckCircle className="w-9 h-9 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        {/* card */}
        <div className="glass-dark rounded-2xl p-8 text-center text-white">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-7 h-7 gradient-animate rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest text-white/60 uppercase">INTERVUEX</span>
          </div>

          <h1 className="text-3xl font-black mb-3 mt-4">Interview Complete!</h1>
          <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto">
            Your responses have been recorded and submitted for evaluation.
            Our AI system will analyse your performance across multiple dimensions.
          </p>

          {/* steps */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { icon: CheckCircle, label: 'Submitted',   sub: 'All responses saved',      color: 'text-emerald-400' },
              { icon: BarChart2,   label: 'Evaluating',  sub: 'AI scoring in progress',   color: 'text-brand-400' },
              { icon: Shield,      label: 'Integrity',   sub: 'Analysis complete',         color: 'text-purple-400' },
            ].map(({ icon: Icon, label, sub, color }, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${i*0.1+0.3}s` }}>
                <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                <p className="font-bold text-sm">{label}</p>
                <p className="text-xs text-white/40 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          {/* what's next */}
          <div className="mt-8 p-4 bg-white/5 rounded-xl text-left space-y-2">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wide mb-3">What happens next</p>
            {[
              'AI evaluates your technical depth and communication',
              'Recruiter reviews your performance report',
              'You may be contacted within 3–5 business days',
              'If shortlisted, expect an invitation for the next round',
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                <span className="text-emerald-400 font-bold mt-0.5 flex-shrink-0">›</span> {s}
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-white/30">
            You may now close this window. Good luck!
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterviewComplete;
