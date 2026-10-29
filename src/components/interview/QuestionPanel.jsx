import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Code, MessageSquare, Briefcase, Volume2, VolumeX, Loader } from 'lucide-react';

/**
 * QuestionPanel
 * Displays the current interview question and reads it aloud using
 * the Web Speech Synthesis API (Text-to-Speech).
 */
const QuestionPanel = ({ question, questionNumber }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const utteranceRef = useRef(null);

  // Check TTS support once
  useEffect(() => {
    setTtsSupported('speechSynthesis' in window);
  }, []);

  // Auto-read each new question when it arrives
  useEffect(() => {
    if (!question?.question) return;
    // Cancel any in-progress speech first
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // Small delay so the browser is ready
    const timer = setTimeout(() => {
      speakQuestion(question.question);
    }, 400);
    return () => {
      clearTimeout(timer);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [question?.id]); // re-run when the question changes

  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // stop any previous

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.92;   // slightly slower — easier to follow
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Pick a clear English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      v => v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleSpeech = () => {
    if (!ttsSupported) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      speakQuestion(question.question);
    }
  };

  const getQuestionIcon = (type) => {
    switch (type) {
      case 'coding':    return <Code          className="w-6 h-6 text-blue-600" />;
      case 'technical': return <HelpCircle    className="w-6 h-6 text-purple-600" />;
      case 'scenario':  return <Briefcase     className="w-6 h-6 text-green-600" />;
      default:          return <MessageSquare className="w-6 h-6 text-orange-600" />;
    }
  };

  const getTypeLabel = (type) =>
    type ? type.charAt(0).toUpperCase() + type.slice(1) : 'General';

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">
          {getQuestionIcon(question.type)}
        </div>

        <div className="flex-1">
          {/* Badges row */}
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
              Question {questionNumber}
            </span>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
              {getTypeLabel(question.type)}
            </span>
            {question.difficulty && (
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                question.difficulty === 'easy'   ? 'bg-green-100 text-green-800' :
                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                   'bg-red-100 text-red-800'
              }`}>
                {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
              </span>
            )}

            {/* TTS button */}
            {ttsSupported && (
              <button
                type="button"
                onClick={handleToggleSpeech}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isSpeaking
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isSpeaking ? 'Stop reading' : 'Read question aloud'}
              >
                {isSpeaking ? (
                  <><VolumeX className="w-4 h-4" /> Stop</>
                ) : (
                  <><Volume2 className="w-4 h-4" /> Read aloud</>
                )}
              </button>
            )}
          </div>

          {/* Question text */}
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {question.question}
          </h2>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-3">
              <div className="flex gap-0.5 items-end h-4">
                {[1,2,3,4].map(i => (
                  <div
                    key={i}
                    className="w-1 bg-blue-500 rounded-full animate-bounce"
                    style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              Reading question aloud…
            </div>
          )}

          {question.context && (
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <p className="text-gray-700">{question.context}</p>
            </div>
          )}

          {question.hints && question.hints.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Hints:</p>
              <ul className="list-disc list-inside space-y-1">
                {question.hints.map((hint, i) => (
                  <li key={i} className="text-sm text-gray-600">{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionPanel;
