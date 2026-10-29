import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProctoringEngine from '../components/proctoring/ProctoringEngine.jsx';
import QuestionPanel    from '../components/interview/QuestionPanel.jsx';
import AnswerRecorder   from '../components/interview/AnswerRecorder.jsx';
import Timer            from '../components/interview/Timer.jsx';
import { Clock, AlertCircle, CheckCircle, Loader2, Zap, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const authFetch = (url, opts = {}) => fetch(url, {
  ...opts,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    ...(opts.headers || {}),
  },
});

const InterviewSession = () => {
  const { token }  = useParams();
  const navigate   = useNavigate();

  const [phase, setPhase]         = useState('loading'); // loading | active | submitting | done
  const [session, setSession]     = useState(null);
  const [currentQ, setCurrentQ]   = useState(null);
  const [qIndex, setQIndex]       = useState(0);
  const [answers, setAnswers]     = useState([]);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [violations, setViolations] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(1800);
  const [sessionId, setSessionId] = useState(null);
  const [toast, setToast]         = useState(null); // { message, type }

  /* refs to avoid stale closures */
  const violationsRef    = useRef([]);
  const sessionIdRef     = useRef(null);
  const integrityRef     = useRef(100);

  /* show a non-blocking toast */
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  /* ── fullscreen helpers ── */
  const enterFS = () => {
    const el = document.documentElement;
    (el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen)?.call(el)
      .catch(() => {});
  };
  const exitFS = () => {
    (document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen)
      ?.call(document).catch(() => {});
  };

  /* ── beforeunload guard ── */
  useEffect(() => {
    const fn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', fn);
    return () => window.removeEventListener('beforeunload', fn);
  }, []);

  /* ── bootstrap ── */
  useEffect(() => {
    init();
    enterFS();
    return () => exitFS();
  }, []);

  const init = async () => {
    try {
      /* 1. candidate login */
      const authRes = await fetch(`${API_BASE}/auth/candidate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          deviceFingerprint: { userAgent: navigator.userAgent, language: navigator.language, platform: navigator.platform },
        }),
      });
      if (!authRes.ok) {
        const e = await authRes.json();
        throw new Error(e.error || 'Invalid or expired interview link');
      }
      const authData = await authRes.json();
      localStorage.setItem('token', authData.token);
      setSessionId(authData.session.id);
      sessionIdRef.current = authData.session.id;
      setTimeRemaining(authData.session.duration);

      /* 2. start session */
      const startRes = await authFetch(`${API_BASE}/interview/start`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: authData.session.id,
          deviceFingerprint: { userAgent: navigator.userAgent },
        }),
      });
      if (!startRes.ok) throw new Error('Failed to start interview session');
      const startData = await startRes.json();

      const qs = startData.session.questions;
      if (!qs?.length) throw new Error('No questions found for this interview');

      setSession(startData.session);
      setCurrentQ(qs[0]);
      setPhase('active');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to start interview');
      navigate('/');
    }
  };

  /* ── violation handler ── */
  const handleViolation = (v) => {
    setViolations(prev => {
      const updated = [...prev, v];
      violationsRef.current = updated;
      if (updated.length >= 10) terminateInterview('Too many integrity violations');
      return updated;
    });
    if (v.severity === 'HIGH' || v.severity === 'CRITICAL') {
      showToast(`⚠️ ${v.message}`, 'warning');
    }
  };

  const handleIntegrityUpdate = (score) => {
    setIntegrityScore(score);
    integrityRef.current = score;
  };

  /* ── answer submit ── */
  const handleAnswerSubmit = async (answer) => {
    setPhase('submitting');
    try {
      const res = await authFetch(`${API_BASE}/interview/submit-answer`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId:  sessionIdRef.current,
          questionId: currentQ.id,
          answer,
          timestamp:  new Date().toISOString(),
        }),
      });
      const data = await res.json();
      setAnswers(prev => [...prev, { questionId: currentQ.id, answer, timestamp: new Date().toISOString() }]);

      if (data.nextQuestion) {
        setSession(prev => ({ ...prev, questions: [...prev.questions, data.nextQuestion] }));
        setCurrentQ(data.nextQuestion);
        setQIndex(prev => prev + 1);
      } else if (qIndex < session.questions.length - 1) {
        setQIndex(prev => prev + 1);
        setCurrentQ(session.questions[qIndex + 1]);
      } else {
        await completeInterview();
        return;
      }
    } catch (err) {
      showToast('Failed to submit answer. Please try again.', 'error');
    } finally {
      if (phase !== 'done') setPhase('active');
    }
  };

  /* ── complete ── */
  const completeInterview = async () => {
    setPhase('done');
    try {
      await authFetch(`${API_BASE}/interview/end`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId:      sessionIdRef.current,
          integrityScore: integrityRef.current,
          violations:     violationsRef.current,
          completedAt:    new Date().toISOString(),
        }),
      });
    } catch { /* best-effort */ }
    navigate('/interview-complete');
  };

  /* ── terminate ── */
  const terminateInterview = async (reason) => {
    if (phase === 'done') return;
    setPhase('done');
    try {
      await authFetch(`${API_BASE}/interview/terminate`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId:      sessionIdRef.current,
          reason,
          integrityScore: integrityRef.current,
          violations:     violationsRef.current,
        }),
      });
    } catch { /* best-effort */ }
    navigate('/interview-complete');
  };

  const handleTimerExpiry = () => completeInterview();

  /* ── integrity color ── */
  const integrityColor =
    integrityScore >= 80 ? 'text-emerald-400' :
    integrityScore >= 60 ? 'text-amber-400' : 'text-red-400';

  /* ── loading screen ── */
  if (phase === 'loading') return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 gradient-animate rounded-2xl flex items-center justify-center mx-auto mb-6 animate-float">
          <Zap className="w-10 h-10 text-white" />
        </div>
        <p className="text-white font-semibold text-lg mb-2">Initialising your interview…</p>
        <p className="text-white/50 text-sm">Loading questions and proctoring system</p>
        <div className="flex justify-center gap-1 mt-6">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 no-select">
      {/* Proctoring engine (always active, positioned top-right) */}
      <ProctoringEngine
        sessionId={sessionId}
        onViolation={handleViolation}
        onIntegrityUpdate={handleIntegrityUpdate}
      />

      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-fade-down ${
          toast.type === 'warning' ? 'bg-amber-600 text-white' :
          toast.type === 'error'   ? 'bg-red-600 text-white' :
          'bg-brand-600 text-white'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {toast.message}
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-animate rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-sm">INTERVUEX</span>
              <span className="text-slate-400 text-xs ml-2 font-mono">{sessionId?.slice(0,8)}…</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              <Timer duration={timeRemaining} onExpiry={handleTimerExpiry} />
            </div>

            {/* Integrity score */}
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-400 hidden sm:inline">Integrity</span>
              <span className={`font-bold text-sm ${integrityColor}`}>{integrityScore}%</span>
            </div>

            {/* End interview */}
            <button
              onClick={() => {
                if (confirm('End the interview now? You cannot resume.')) completeInterview();
              }}
              className="btn-danger py-1.5 px-3 text-xs"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Submit
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Progress bar */}
        {session && (
          <div className="mb-6 animate-fade-down">
            <div className="flex justify-between text-xs text-gray-500 mb-2">
              <span className="font-medium">Question {qIndex + 1} of {session.questions.length}</span>
              <span>{Math.round(((qIndex + 1) / session.questions.length) * 100)}% complete</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${((qIndex + 1) / session.questions.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Question */}
        {currentQ && (
          <div key={currentQ.id} className="animate-fade-up">
            <QuestionPanel question={currentQ} questionNumber={qIndex + 1} />
          </div>
        )}

        {/* Answer */}
        <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <AnswerRecorder
            key={currentQ?.id}
            questionType={currentQ?.type}
            onSubmit={handleAnswerSubmit}
            isSubmitting={phase === 'submitting'}
          />
        </div>

        {/* Integrity warning */}
        {integrityScore < 70 && (
          <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Integrity Warning</p>
              <p className="text-xs text-red-600 mt-0.5">
                Multiple violations detected. Ensure you are alone, facing the camera, and not using any external resources.
                Continued violations may terminate your interview.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSession;
