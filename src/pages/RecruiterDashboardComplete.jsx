import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recruiterAPI } from '../services/api.js';
import {
  Users, Calendar, CheckCircle, TrendingUp, Plus, Search,
  Trash2, Eye, LogOut, Clock, AlertTriangle, BarChart2,
  ChevronRight, Loader2, X, Upload, Zap, Star, Activity
} from 'lucide-react';

/* ── small reusable stat card ── */
const StatCard = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <div
    className="card p-6 animate-fade-up flex items-start gap-4"
    style={{ animationDelay: `${delay}s` }}
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-3xl font-bold text-gray-900 animate-count-up">{value}</p>
    </div>
  </div>
);

/* ── status badge ── */
const StatusBadge = ({ status }) => {
  const map = {
    scheduled:  'status-scheduled',
    active:     'status-active',
    completed:  'status-completed',
    terminated: 'status-terminated',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.toUpperCase()}
    </span>
  );
};

const ShortlistBadge = ({ status }) => {
  const map = {
    SHORTLISTED: 'shortlist-shortlisted',
    REVIEW:      'shortlist-review',
    REJECTED:    'shortlist-rejected',
  };
  return status ? (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  ) : null;
};

/* ── difficulty badge ── */
const DifficultyBadge = ({ level }) => {
  const map = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };
  return level ? (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[level] || 'bg-gray-100 text-gray-600'}`}>
      {level?.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  ) : null;
};

/* ── modal wrapper ── */
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════ */
const RecruiterDashboardComplete = () => {
  const navigate  = useNavigate();
  const [stats, setStats]       = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [activeTab, setActiveTab] = useState('candidates'); // candidates | interviews

  /* add-candidate modal */
  const [showAdd, setShowAdd]   = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ fullName: '', email: '', phone: '' });
  const [resumeFile, setResumeFile] = useState(null);

  /* schedule modal */
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedCandidateId, setSchedCandidateId] = useState(null);
  const [schedMode, setSchedMode] = useState('24hour');
  const [schedDifficulty, setSchedDifficulty] = useState('medium');
  const [schedWindow, setSchedWindow] = useState({ from: '', until: '' });
  const [schedLoading, setSchedLoading] = useState(false);
  const [lastLink, setLastLink] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/recruiter/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        recruiterAPI.getDashboard(),
        recruiterAPI.getCandidates(),
      ]);
      setStats(d.data);
      setCandidates(c.data.candidates || []);
    } catch (err) {
      if (err.response?.status === 401) { handleLogout(); }
    } finally {
      setLoading(false);
    }
  };

  /* ── computed totals ── */
  const total = stats ? (
    +stats.stats.scheduled + +stats.stats.active +
    +stats.stats.completed + +stats.stats.terminated
  ) : 0;

  /* ── add candidate ── */
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const fd = new FormData();
      fd.append('fullName', newCandidate.fullName);
      fd.append('email',    newCandidate.email);
      fd.append('phone',    newCandidate.phone);
      if (resumeFile) fd.append('resume', resumeFile);
      await recruiterAPI.createCandidate(fd);
      setShowAdd(false);
      setNewCandidate({ fullName: '', email: '', phone: '' });
      setResumeFile(null);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add candidate');
    } finally {
      setAddLoading(false);
    }
  };

  /* ── schedule interview ── */
  const openSchedule = (id) => {
    setSchedCandidateId(id);
    setSchedMode('24hour');
    setSchedDifficulty('medium');
    setSchedWindow({ from: '', until: '' });
    setShowSchedule(true);
    setLastLink(null);
  };

  const handleSchedule = async () => {
    setSchedLoading(true);
    try {
      const payload = {
        candidateId:  schedCandidateId,
        duration:     1800,
        expiresIn:    24,
        difficulty:   schedDifficulty,
        ...(schedMode === 'timewindow' && {
          validFrom:  schedWindow.from,
          validUntil: schedWindow.until,
        }),
      };
      const res = await recruiterAPI.scheduleInterview(
        payload.candidateId, payload.duration, payload.expiresIn,
        payload.validFrom, payload.validUntil, payload.difficulty
      );
      navigator.clipboard.writeText(res.data.interviewUrl).catch(() => {});
      setLastLink(res.data);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to schedule interview');
      setShowSchedule(false);
    } finally {
      setSchedLoading(false);
    }
  };

  /* ── delete ── */
  const deleteCandidate = async (id, name) => {
    if (!confirm(`Delete ${name}? This also deletes all their interviews.`)) return;
    try { await recruiterAPI.deleteCandidate(id); load(); }
    catch { alert('Failed to delete candidate'); }
  };

  const deleteInterview = async (id) => {
    if (!confirm('Delete this interview session?')) return;
    try { await recruiterAPI.deleteInterview(id); load(); }
    catch { alert('Failed to delete interview'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/recruiter/login');
  };

  /* ── filtered candidates ── */
  const filtered = candidates.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 gradient-animate rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-500 font-medium">Loading dashboard…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Top Nav ── */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 gradient-animate rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">INTERVUEX</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-400">{user.company}</p>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Greeting ── */}
        <div className="mb-8 animate-fade-up">
          <h1 className="text-2xl font-bold text-gray-900">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            {user.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's your hiring overview for today.</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users}      label="Total Interviews"  value={total}                          color="bg-brand-500"    delay={0} />
          <StatCard icon={CheckCircle} label="Completed"        value={stats?.stats?.completed  || 0}  color="bg-emerald-500"  delay={0.05} />
          <StatCard icon={Star}        label="Shortlisted"      value={stats?.shortlistStats?.shortlisted || 0} color="bg-amber-500" delay={0.1} />
          <StatCard icon={Activity}    label="Active Now"       value={stats?.stats?.active     || 0}  color="bg-red-500"     delay={0.15} />
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
          {['candidates','interviews'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ════════ CANDIDATES TAB ════════ */}
        {activeTab === 'candidates' && (
          <div className="card animate-fade-up">
            {/* header */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Candidates</h2>
                <p className="text-sm text-gray-400">{filtered.length} total</p>
              </div>
              <div className="flex items-center gap-3 sm:ml-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search candidates…"
                    className="input-field pl-9 py-2 text-sm w-56"
                  />
                </div>
                <button onClick={() => setShowAdd(true)} className="btn-primary py-2 px-4 text-sm">
                  <Plus className="w-4 h-4" /> Add Candidate
                </button>
              </div>
            </div>

            {/* list */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No candidates yet</p>
                <p className="text-sm text-gray-300 mt-1">Click "Add Candidate" to get started</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filtered.map((c, i) => (
                  <li key={c.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors animate-fade-up" style={{ animationDelay: `${i*0.04}s` }}>
                    {/* avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {c.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{c.full_name}</p>
                      <p className="text-sm text-gray-400 truncate">{c.email}</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {c.total_interviews || 0} interview{c.total_interviews !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openSchedule(c.id)}
                        className="btn-primary py-1.5 px-3 text-xs"
                      >
                        <Calendar className="w-3.5 h-3.5" /> Schedule
                      </button>
                      <button
                        onClick={() => deleteCandidate(c.id, c.full_name)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ════════ INTERVIEWS TAB ════════ */}
        {activeTab === 'interviews' && (
          <div className="card animate-fade-up">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">All Interviews</h2>
              <p className="text-sm text-gray-400">{stats?.recentSessions?.length || 0} recent sessions</p>
            </div>

            {!stats?.recentSessions?.length ? (
              <div className="py-16 text-center">
                <BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No interviews yet</p>
                <p className="text-sm text-gray-300 mt-1">Schedule an interview to see it here</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {stats.recentSessions.map((s, i) => (
                  <li key={s.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors animate-fade-up" style={{ animationDelay: `${i*0.04}s` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-900">{s.full_name}</p>
                          <StatusBadge status={s.status} />
                          {s.final_score != null && (
                            <span className="px-2.5 py-0.5 bg-brand-50 text-brand-700 rounded-full text-xs font-bold">
                              Score: {s.final_score}
                            </span>
                          )}
                          <ShortlistBadge status={s.shortlist_status} />
                        </div>
                        <p className="text-sm text-gray-400">{s.email}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <Clock className="w-3.5 h-3.5" />
                          {s.end_time
                            ? `Completed ${new Date(s.end_time).toLocaleString()}`
                            : s.start_time
                            ? `Started ${new Date(s.start_time).toLocaleString()}`
                            : `Created ${new Date(s.created_at).toLocaleString()}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {s.status === 'completed' && (
                          <button
                            onClick={() => navigate(`/recruiter/report/${s.id}`)}
                            className="btn-primary py-1.5 px-3 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> Report
                          </button>
                        )}
                        <button
                          onClick={() => deleteInterview(s.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {/* ════ ADD CANDIDATE MODAL ════ */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Candidate">
        <form onSubmit={handleAddCandidate} className="space-y-4">
          {[
            { label: 'Full Name', key: 'fullName', type: 'text',  placeholder: 'Jane Smith' },
            { label: 'Email',     key: 'email',    type: 'email', placeholder: 'jane@example.com' },
            { label: 'Phone',     key: 'phone',    type: 'tel',   placeholder: '+1 234 567 8900' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
              <input type={f.type} required placeholder={f.placeholder}
                value={newCandidate[f.key]}
                onChange={e => setNewCandidate({ ...newCandidate, [f.key]: e.target.value })}
                className="input-field" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Resume (PDF) <span className="text-gray-400 font-normal">— optional, improves AI questions</span>
            </label>
            <label className="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-brand-400 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">
                {resumeFile ? resumeFile.name : 'Click to upload PDF'}
              </span>
              <input type="file" accept=".pdf" className="hidden"
                onChange={e => setResumeFile(e.target.files[0])} />
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={addLoading} className="btn-primary flex-1">
              {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Adding…</> : <>Add Candidate</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* ════ SCHEDULE MODAL ════ */}
      <Modal open={showSchedule} onClose={() => { setShowSchedule(false); setLastLink(null); }} title="Schedule Interview">
        {lastLink ? (
          /* ── success state ── */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-lg">Interview Scheduled!</p>
              <p className="text-sm text-gray-500 mt-1">
                {lastLink.emailSent
                  ? lastLink.emailMode === 'production'
                    ? '✅ Email sent to candidate automatically'
                    : '📧 Email logged to console (test mode)'
                  : '⚠️ Email not configured — copy the link below'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-left">
              <p className="text-xs font-semibold text-gray-500 mb-1">Interview Link</p>
              <p className="text-xs text-brand-600 break-all font-mono">{lastLink.interviewUrl}</p>
            </div>
            <button className="btn-primary w-full"
              onClick={() => { navigator.clipboard.writeText(lastLink.interviewUrl).catch(()=>{}); alert('Copied!'); }}>
              Copy Link
            </button>
            <button className="btn-secondary w-full" onClick={() => { setShowSchedule(false); setLastLink(null); }}>Done</button>
          </div>
        ) : (
          /* ── form state ── */
          <div className="space-y-5">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Question Difficulty
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'easy',   label: 'Easy',   desc: 'Foundational', color: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
                  { value: 'medium', label: 'Medium', desc: 'Intermediate', color: 'border-amber-400 bg-amber-50 text-amber-700' },
                  { value: 'hard',   label: 'Hard',   desc: 'Advanced',     color: 'border-red-400 bg-red-50 text-red-700' },
                ].map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setSchedDifficulty(d.value)}
                    className={`border-2 rounded-xl p-3 text-center transition-all duration-150 ${
                      schedDifficulty === d.value
                        ? d.color + ' ring-2 ring-offset-1 ' + d.color.split(' ')[0].replace('border','ring')
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <p className="font-bold text-sm">{d.label}</p>
                    <p className="text-xs mt-0.5 opacity-75">{d.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Link expiry mode */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Link Validity</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '24hour',    label: '24-Hour Link', desc: 'Expires tomorrow' },
                  { value: 'timewindow', label: 'Time Window', desc: 'Set exact slot' },
                ].map(m => (
                  <button key={m.value} type="button" onClick={() => setSchedMode(m.value)}
                    className={`border-2 rounded-xl p-3 text-left transition-all ${
                      schedMode === m.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}>
                    <p className="font-bold text-sm">{m.label}</p>
                    <p className="text-xs mt-0.5 opacity-75">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {schedMode === 'timewindow' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valid From</label>
                  <input type="datetime-local" className="input-field text-sm py-2"
                    value={schedWindow.from}
                    onChange={e => setSchedWindow({ ...schedWindow, from: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Valid Until</label>
                  <input type="datetime-local" className="input-field text-sm py-2"
                    value={schedWindow.until}
                    onChange={e => setSchedWindow({ ...schedWindow, until: e.target.value })} />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowSchedule(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                type="button"
                onClick={handleSchedule}
                disabled={schedLoading || (schedMode === 'timewindow' && (!schedWindow.from || !schedWindow.until))}
                className="btn-primary flex-1"
              >
                {schedLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Scheduling…</> : <>Schedule &amp; Generate Questions</>}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecruiterDashboardComplete;
