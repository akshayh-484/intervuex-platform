import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProctoringEngine from '../components/proctoring/ProctoringEngine.jsx';
import QuestionPanel from '../components/interview/QuestionPanel.jsx';
import AnswerRecorder from '../components/interview/AnswerRecorder.jsx';
import Timer from '../components/interview/Timer.jsx';
import { Clock, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * INTERVIEW SESSION PAGE
 * Main interview interface with integrated proctoring
 * Handles question flow, answer submission, and real-time monitoring
 */
const InterviewSession = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [violations, setViolations] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(1800); // 30 minutes
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  // Refs to avoid stale closures in callbacks
  const violationsRef = useRef([]);
  const sessionIdRef = useRef(null);
  const integrityScoreRef = useRef(100);

  useEffect(() => {
    initializeSession();
    preventNavigation();
    enterFullscreen();
    
    return () => {
      cleanup();
      exitFullscreen();
    };
  }, []);

  /**
   * Enter fullscreen mode
   */
  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.warn('Could not enter fullscreen:', err);
      });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
  };

  /**
   * Exit fullscreen mode
   */
  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.warn('Exit fullscreen error:', err));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  };

  /**
   * Initialize interview session
   */
  const initializeSession = async () => {
    try {
      // First, authenticate with the token
      const authResponse = await fetch(`${API_BASE}/auth/candidate/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token,
          deviceFingerprint: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          }
        })
      });

      if (!authResponse.ok) {
        const error = await authResponse.json();
        throw new Error(error.error || 'Invalid or expired interview link');
      }

      const authData = await authResponse.json();
      
      // Store auth token and session info
      localStorage.setItem('token', authData.token);
      setSessionId(authData.session.id);
      sessionIdRef.current = authData.session.id;
      setTimeRemaining(authData.session.duration);

      // Start the interview session
      const startResponse = await fetch(`${API_BASE}/interview/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify({
          sessionId: authData.session.id,
          deviceFingerprint: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          }
        })
      });

      if (!startResponse.ok) {
        throw new Error('Failed to start interview');
      }

      const startData = await startResponse.json();
      setSession(startData.session);
      
      // Set first question
      if (startData.session.questions && startData.session.questions.length > 0) {
        setCurrentQuestion(startData.session.questions[0]);
      } else {
        throw new Error('No questions available for this interview');
      }

    } catch (error) {
      console.error('Failed to initialize session:', error);
      alert(error.message || 'Invalid or expired interview link');
      navigate('/');
    }
  }

  /**
   * Prevent navigation during interview
   */
  const preventNavigation = () => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your interview will be terminated.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  /**
   * Handle violation from proctoring engine
   */
  const handleViolation = (violation) => {
    setViolations(prev => {
      const updated = [...prev, violation];
      violationsRef.current = updated;
      // Auto-terminate if too many violations (use ref length to avoid stale state)
      if (updated.length >= 10) {
        terminateInterview('Too many integrity violations');
      }
      return updated;
    });
    
    // Show warning to candidate
    if (violation.severity === 'HIGH') {
      showViolationWarning(violation);
    }
  }

  /**
   * Show violation warning
   */
  const showViolationWarning = (violation) => {
    // You can implement a toast notification here
    console.warn('VIOLATION WARNING:', violation.message);
  }

  /**
   * Handle integrity score update
   */
  const handleIntegrityUpdate = (score) => {
    setIntegrityScore(score);
    integrityScoreRef.current = score;
  }

  /**
   * Handle answer submission
   */
  const handleAnswerSubmit = async (answer) => {
    setIsSubmitting(true);

    try {
      // Submit answer to backend
      const response = await fetch(`${API_BASE}/interview/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId,
          questionId: currentQuestion.id,
          answer,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();

      // Store answer locally
      setAnswers(prev => [...prev, {
        questionId: currentQuestion.id,
        answer,
        timestamp: new Date().toISOString()
      }]);

      // Check if there's a next question (dynamically generated or from original list)
      if (data.nextQuestion) {
        // Add dynamically generated question to session
        setSession(prev => ({
          ...prev,
          questions: [...prev.questions, data.nextQuestion]
        }));
        setCurrentQuestion(data.nextQuestion);
        setQuestionIndex(prev => prev + 1);
      } else if (questionIndex < session.questions.length - 1) {
        // Move to next pre-generated question
        setQuestionIndex(prev => prev + 1);
        setCurrentQuestion(session.questions[questionIndex + 1]);
      } else {
        // Interview complete - all questions answered
        completeInterview();
      }

    } catch (error) {
      console.error('Failed to submit answer:', error);
      alert('Failed to submit answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Complete interview
   */
  const completeInterview = async () => {
    try {
      const sid = sessionIdRef.current || sessionId;
      await fetch(`${API_BASE}/interview/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId: sid,
          integrityScore: integrityScoreRef.current,
          violations: violationsRef.current,
          completedAt: new Date().toISOString()
        })
      });

      alert('Interview completed successfully! Thank you.');
      navigate('/interview-complete');
    } catch (error) {
      console.error('Failed to complete interview:', error);
      alert('Interview completed but there was an error saving. Please contact support.');
      navigate('/interview-complete');
    }
  }

  /**
   * Terminate interview due to violations
   */
  const terminateInterview = async (reason) => {
    try {
      const sid = sessionIdRef.current || sessionId;
      await fetch(`${API_BASE}/interview/terminate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionId: sid,
          reason,
          integrityScore: integrityScoreRef.current,
          violations: violationsRef.current
        })
      });

      alert(`Interview terminated: ${reason}`);
      navigate('/');
    } catch (error) {
      console.error('Failed to terminate interview:', error);
    }
  }

  /**
   * Handle timer expiry
   */
  const handleTimerExpiry = () => {
    alert('Time is up! Submitting your interview...');
    completeInterview();
  }

  /**
   * Cleanup on unmount
   */
  const cleanup = () => {
    // Cleanup handled by proctoring engine
  }

  if (!session || !currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Proctoring Engine - Always Active */}
      <ProctoringEngine
        sessionId={sessionId}
        onViolation={handleViolation}
        onIntegrityUpdate={handleIntegrityUpdate}
      />

      {/* Top Bar */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">INTERVUEX Interview</h1>
              <p className="text-sm text-gray-600">Session ID: {sessionId}</p>
            </div>

            <div className="flex items-center gap-6">
              {/* Timer */}
              <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                <Timer
                  duration={timeRemaining}
                  onExpiry={handleTimerExpiry}
                />
              </div>

              {/* Integrity Score */}
              <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-xs text-gray-600">Integrity</div>
                  <div className={`text-lg font-bold ${
                    integrityScore >= 80 ? 'text-green-600' :
                    integrityScore >= 60 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {integrityScore}%
                  </div>
                </div>
              </div>

              {/* End Interview Button */}
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to end the interview? This action cannot be undone.')) {
                    completeInterview();
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                End Interview
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interview Area */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Question {questionIndex + 1} of {session.questions.length}</span>
              <span>{Math.round(((questionIndex + 1) / session.questions.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((questionIndex + 1) / session.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Panel */}
          <QuestionPanel
            question={currentQuestion}
            questionNumber={questionIndex + 1}
          />

          {/* Answer Recorder */}
          <AnswerRecorder
            questionType={currentQuestion.type}
            onSubmit={handleAnswerSubmit}
            isSubmitting={isSubmitting}
          />

          {/* Warning Message */}
          {integrityScore < 70 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-red-800">Integrity Warning</h4>
                <p className="text-sm text-red-700">
                  Your integrity score is low due to detected violations. Please ensure you are alone,
                  facing the camera, and not using any unauthorized resources.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
