import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recruiterAPI } from '../services/api.js';
import {
  ArrowLeft, User, Clock, CheckCircle, AlertTriangle,
  FileText, BarChart2, Shield, Star, Loader2,
  MessageSquare, ChevronDown, ChevronUp, Award
} from 'lucide-react';

/* ── score ring ── */
const ScoreRing = ({ score = 0, size = 88, stroke = 8, color = '#6366f1' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
    </svg>
  );
};

/* ── score card ── */
const ScoreCard = ({ label, value = 0, ringColor }) => (
  <div className="card p-4 flex flex-col items-center gap-2 animate-fade-up">
    <div className="relative w-[88px] h-[88px]">
      <ScoreRing score={value} color={ringColor} />
      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-gray-900">
        {value}
      </span>
    </div>
    <p className="text-xs font-semibold text-gray-500 text-center leading-tight">{label}</p>
  </div>
);

/* ── collapsible Q&A item ── */
const QAItem = ({ question, answer, index }) => {
  const [open, setOpen] = useState(index === 0);
  const diff = question.difficulty;
  const diffCls = diff === 'easy' ? 'badge-easy' : diff === 'medium' ? 'badge-medium' : diff === 'hard' ? 'badge-hard' : '';

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          {diff && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${diffCls}`}>{diff}</span>}
          <p className="text-sm font-semibold text-gray-900 truncate">{question.question}</p>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 bg-gray-50/50 border-t border-gray-100 animate-fade-down">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-2">Candidate's Answer</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {answer?.answer || <span className="italic text-gray-400">No answer provided</span>}
          </p>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════ */
const InterviewReport = () => {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const [report,  setReport]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => { loadReport(); }, [sessionId]);

  const loadReport = async () => {
    try {
      const res = await recruiterAPI.getInterviewReport(sessionId);
      setReport(res.data);
      setNotes(res.data.scores?.recruiter_notes || '');
    } catch { alert('Failed to load report'); }
    finally  { setLoading(false); }
  };

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await recruiterAPI.updateShortlistStatus(sessionId, status, notes);
      await loadReport();
      setNotesSaved(false);
    } catch { alert('Failed to update status'); }
    finally { setUpdating(false); }
  };

  const saveNotes = async () => {
    if (!report?.scores) return;
    setUpdating(true);
    try {
      await recruiterAPI.updateShortlistStatus(sessionId, report.scores.shortlist_status, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    } catch { alert('Failed to save notes'); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  );

  if (!report) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-red-500 font-semibold">Report not found</p>
    </div>
  );

  const { session, scores, violations, questions, answers } = report;
  const allQ = Array.isArray(questions) ? questions : (typeof questions === 'string' ? JSON.parse(questions) : []);
  const allA = Array.isArray(answers)   ? answers   : (typeof answers   === 'string' ? JSON.parse(answers)   : []);

  const statusMap = {
    SHORTLISTED: { cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '✅' },
    REVIEW:      { cls: 'bg-amber-100   text-amber-800   border-amber-200',   icon: '🔍' },
    REJECTED:    { cls: 'bg-red-100     text-red-800     border-red-200',     icon: '❌' },
  };
  const curStatus = statusMap[scores?.shortlist_status];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <button onClick={() => navigate('/recruiter/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-600 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-700">Interview Report</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {/* ── Candidate header ── */}
        <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5 animate-fade-up">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {session.full_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{session.full_name}</h1>
            <p className="text-gray-400 text-sm">{session.email}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {session.end_time ? new Date(session.end_time).toLocaleString() : 'In progress'}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                {Math.floor(session.duration_seconds / 60)} min session
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                session.status === 'completed' ? 'status-completed' : 'status-terminated'}`}>
                {session.status?.toUpperCase()}
              </span>
            </div>
          </div>
          {scores && (
            <div className="text-center flex-shrink-0">
              <div className="relative w-24 h-24">
                <ScoreRing score={scores.final_score || 0} size={96} stroke={8}
                  color={scores.final_score >= 70 ? '#22c55e' : scores.final_score >= 50 ? '#f59e0b' : '#ef4444'} />
                <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-gray-900">
                  {scores.final_score || 0}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-medium">Final Score</p>
            </div>
          )}
        </div>

        {/* ── Score breakdown ── */}
        {scores && (
          <section className="animate-fade-up" style={{ animationDelay: '0.05s' }}>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-brand-500" /> Score Breakdown
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <ScoreCard label="Technical"       value={scores.technical_score}           ringColor="#6366f1" />
              <ScoreCard label="Problem Solving" value={scores.problem_solving_score}     ringColor="#8b5cf6" />
              <ScoreCard label="Communication"   value={scores.communication_score}       ringColor="#22c55e" />
              <ScoreCard label="Confidence"      value={scores.confidence_score}          ringColor="#f59e0b" />
              <ScoreCard label="Resume Auth."    value={scores.resume_authenticity_score} ringColor="#0ea5e9" />
              <ScoreCard label="Integrity Risk"  value={scores.integrity_risk_score}      ringColor="#ef4444" />
            </div>
            {/* formula note */}
            <p className="text-xs text-gray-400 mt-3 text-right">
              Final = (Tech×0.45) + (PS×0.25) + (Comm×0.15) + (Auth×0.15) − (Risk×0.30)
            </p>
          </section>
        )}

        {/* ── Decision panel ── */}
        {scores && (
          <section className="card p-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-brand-500" /> Hiring Decision
            </h2>
            <div className="flex flex-wrap gap-3 mb-5">
              {['SHORTLISTED','REVIEW','REJECTED'].map(s => (
                <button key={s} disabled={updating} onClick={() => updateStatus(s)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    scores.shortlist_status === s
                      ? statusMap[s].cls + ' border-current ring-2 ring-offset-1'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {statusMap[s].icon} {s}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Recruiter Notes</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                className="input-field text-sm resize-none"
                placeholder="Add your observations about this candidate…"
              />
              <div className="flex items-center justify-between mt-2">
                {notesSaved && <span className="text-xs text-emerald-600 font-medium">✓ Notes saved</span>}
                <button onClick={saveNotes} disabled={updating} className="btn-primary ml-auto py-1.5 px-4 text-sm">
                  {updating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : 'Save Notes'}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Violations ── */}
        {violations?.length > 0 && (
          <section className="card p-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" /> Integrity Violations ({violations.length})
            </h2>
            {/* severity summary */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {['CRITICAL','HIGH','MEDIUM','LOW'].map(sev => {
                const cnt = violations.filter(v => v.severity === sev).length;
                const cls = sev==='CRITICAL'?'bg-red-100 text-red-700':sev==='HIGH'?'bg-orange-100 text-orange-700':sev==='MEDIUM'?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-600';
                return (
                  <div key={sev} className={`rounded-xl p-3 text-center ${cls}`}>
                    <p className="text-2xl font-black">{cnt}</p>
                    <p className="text-xs font-semibold">{sev}</p>
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {violations.map((v, i) => {
                const msg = typeof v.details === 'object'
                  ? v.details?.message || JSON.stringify(v.details)
                  : v.details;
                const sevCls = v.severity==='CRITICAL'?'text-red-700 bg-red-50 border-red-200':v.severity==='HIGH'?'text-orange-700 bg-orange-50 border-orange-200':v.severity==='MEDIUM'?'text-amber-700 bg-amber-50 border-amber-200':'text-gray-600 bg-gray-50 border-gray-200';
                return (
                  <div key={i} className={`flex items-start justify-between gap-4 px-4 py-2.5 rounded-xl border ${sevCls} text-sm`}>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold">{v.type?.replace(/_/g,' ')}</span>
                      {msg && <span className="text-xs ml-2 opacity-75">— {msg}</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-white/50">{v.severity}</span>
                      <span className="text-xs opacity-60">{new Date(v.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Q & A ── */}
        <section className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-500" /> Questions &amp; Answers ({allQ.length})
          </h2>
          <div className="space-y-2">
            {allQ.map((q, i) => {
              const matchedAnswer = allA.find(a => a.questionId === q.id) || allA[i];
              return <QAItem key={q.id || i} question={q} answer={matchedAnswer} index={i} />;
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default InterviewReport;
