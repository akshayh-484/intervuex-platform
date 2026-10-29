import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader, Mic, MicOff, Square } from 'lucide-react';

/**
 * AnswerRecorder
 * Handles both typed answers and real-time Web Speech API voice input.
 * The speech recognition is kept in a ref so the onend handler never
 * reads a stale isListening value.
 */
const AnswerRecorder = ({ questionType, onSubmit, isSubmitting }) => {
  const [answer, setAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState('');

  // Keep isListening in a ref so the onend callback always reads current value
  const isListeningRef = useRef(false);
  const recognitionRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Initialise speech recognition once on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setAnswer(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setSpeechError('Microphone access denied. Please allow mic access and try again.');
        setIsListening(false);
        isListeningRef.current = false;
      } else if (event.error === 'no-speech') {
        // No speech detected — keep listening, don't treat as error
      } else if (event.error === 'aborted') {
        // Intentional stop — ignore
      } else {
        setSpeechError(`Speech error: ${event.error}. Try again.`);
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    // Auto-restart if we're still supposed to be listening
    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // Recognition may still be starting — safe to ignore
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* ignore */ }
    };
  }, []); // empty deps — create once

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setSpeechError('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
    } catch (err) {
      // Already started or other error
      console.error('Start recognition error:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed) return;
    if (isListening) stopListening();
    onSubmit(trimmed);
    setAnswer('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Your Answer</h3>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={
              speechSupported
                ? 'Type your answer here, or click the microphone to speak…'
                : 'Type your answer here…'
            }
            className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
            disabled={isSubmitting}
          />
          {/* Live indicator inside textarea */}
          {isListening && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}
        </div>

        {/* Character count */}
        <div className="flex items-center justify-between mt-2 mb-4">
          <span className="text-xs text-gray-500">{answer.length} characters</span>
          {answer.split(/\s+/).filter(Boolean).length > 0 && (
            <span className="text-xs text-gray-500">
              ~{answer.split(/\s+/).filter(Boolean).length} words
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* Mic button */}
          {speechSupported ? (
            !isListening ? (
              <button
                type="button"
                onClick={startListening}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors font-medium"
                title="Click to start voice input"
              >
                <Mic className="w-5 h-5" />
                Start Speaking
              </button>
            ) : (
              <button
                type="button"
                onClick={stopListening}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                title="Click to stop voice input"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop
              </button>
            )
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm">
              <MicOff className="w-4 h-4" />
              Voice input not supported in this browser
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !answer.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Answer
              </>
            )}
          </button>
        </div>
      </form>

      {/* Error banner */}
      {speechError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {speechError}
        </div>
      )}

      {/* Hint */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          {speechSupported ? (
            <>
              <strong>💡 Voice input:</strong> Click <em>Start Speaking</em> — your words appear in real time.
              Click <em>Stop</em> when done, then edit freely before submitting.
            </>
          ) : (
            <>
              <strong>💡 Tip:</strong> Use Chrome or Edge for voice input support.
            </>
          )}
        </p>
        {isListening && (
          <div className="mt-2 flex items-center gap-2 text-green-700 font-semibold">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            Microphone is active — speak now!
          </div>
        )}
      </div>
    </div>
  );
};

export default AnswerRecorder;
