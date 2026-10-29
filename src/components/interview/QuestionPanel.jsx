import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle, Code, MessageSquare, Briefcase,
  Volume2, VolumeX, BookOpen
} from 'lucide-react';

/* difficulty config */
const DIFFICULTY = {
  easy:   { label: 'Easy',   cls: 'badge-easy',   bar: 'bg-emerald-500', pct: '33%' },
  medium: { label: 'Medium', cls: 'badge-medium',  bar: 'bg-amber-500',   pct: '66%' },
  hard:   { label: 'Hard',   cls: 'badge-hard',    bar: 'bg-red-500',     pct: '100%' },
};

const typeIcon = (type) => {
  const cls = 'w-5 h-5';
  switch (type) {
    case 'coding':    return <Code          className={`${cls} text-blue-500`} />;
    case 'technical': return <HelpCircle    className={`${cls} text-purple-500`} />;
    case 'scenario':  return <Briefcase     className={`${cls} text-green-500`} />;
    case 'resume':    return <BookOpen      className={`${cls} text-orange-500`} />;
    default:          return <MessageSquare className={`${cls} text-gray-500`} />;
  }
};

const QuestionPanel = ({ question, questionNumber }) => {
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => { setTtsSupported('speechSynthesis' in window); }, []);

  /* auto-read every new question */
  useEffect(() => {
    if (!question?.question) return;
    window.speechSynthesis?.cancel();
    const t = setTimeout(() => speakQuestion(question.question), 500);
    return () => { clearTimeout(t); window.speechSynthesis?.cancel(); };
  }, [question?.id]);

  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang    = 'en-US';
    utt.rate    = 0.9;
    utt.pitch   = 1.0;
    utt.volume  = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.lang === 'en-US' && (
        v.name.includes('Google') || v.name.includes('Natural') ||
        v.name.includes('Samantha') || v.name.includes('Daniel')
      )
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend   = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  const toggleSpeech = () => {
    if (!ttsSupported) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
    else             speakQuestion(question.question);
  };

  const diff = DIFFICULTY[question.difficulty] || null;

  return (
    <div className="card p-6 mb-5">
      {/* header row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Q number */}
          <span className="px-3 py-1 bg-brand-600 text-white text-xs font-bold rounded-full">
            Q{questionNumber}
          </span>

          {/* type badge */}
          <span className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
            {typeIcon(question.type)}
            {question.type ? question.type.charAt(0).toUpperCase() + question.type.slice(1) : 'General'}
          </span>

          {/* difficulty badge */}
          {diff && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${diff.cls}`}>
              {diff.label}
            </span>
          )}
        </div>

        {/* TTS button */}
        {ttsSupported && (
          <button
            type="button"
            onClick={toggleSpeech}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
              isSpeaking
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-600'
            }`}
            title={isSpeaking ? 'Stop reading' : 'Read question aloud'}
          >
            {isSpeaking ? <><VolumeX className="w-3.5 h-3.5" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Read</>}
          </button>
        )}
      </div>

      {/* difficulty bar */}
      {diff && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-gray-400 w-14">Difficulty</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${diff.bar}`}
              style={{ width: diff.pct }}
            />
          </div>
          <span className="text-xs text-gray-400 w-8">{diff.pct}</span>
        </div>
      )}

      {/* question text */}
      <h2 className="text-xl font-bold text-gray-900 leading-snug mb-3">
        {question.question}
      </h2>

      {/* speaking indicator */}
      {isSpeaking && (
        <div className="flex items-center gap-2 text-brand-600 text-xs font-medium">
          <div className="flex gap-0.5 items-end h-3">
            {[1,2,3,4,3,2].map((h,i) => (
              <div key={i}
                className="w-1 bg-brand-500 rounded-full animate-bounce"
                style={{ height:`${h*3}px`, animationDelay:`${i*0.08}s` }}
              />
            ))}
          </div>
          Reading aloud…
        </div>
      )}

      {/* context / hints */}
      {question.context && (
        <div className="mt-4 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 leading-relaxed">
          {question.context}
        </div>
      )}
      {question.hints?.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Hints</p>
          <ul className="space-y-1">
            {question.hints.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-brand-400 font-bold mt-0.5">›</span> {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuestionPanel;
