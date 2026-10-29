import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Camera, Mic, Monitor, Shield, Clock, FileText } from 'lucide-react';

/**
 * INTERVIEW TERMS AND CONDITIONS PAGE
 * Candidates must read and accept all terms before starting the interview
 */
const InterviewTerms = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [acceptedTerms, setAcceptedTerms] = useState({
    proctoring: false,
    recording: false,
    integrity: false,
    technical: false,
    conduct: false,
    privacy: false
  });
  
  const [allAccepted, setAllAccepted] = useState(false);

  /**
   * Handle individual checkbox change
   */
  const handleCheckboxChange = (term) => {
    const newAccepted = {
      ...acceptedTerms,
      [term]: !acceptedTerms[term]
    };
    setAcceptedTerms(newAccepted);
    
    // Check if all terms are accepted
    const allChecked = Object.values(newAccepted).every(val => val === true);
    setAllAccepted(allChecked);
  };

  /**
   * Proceed to interview
   */
  const handleProceed = () => {
    if (allAccepted) {
      // Store acceptance in localStorage
      localStorage.setItem('termsAccepted', JSON.stringify({
        timestamp: new Date().toISOString(),
        token
      }));
      
      // Navigate to interview session
      navigate(`/interview/${token}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Interview Terms & Conditions</h1>
            <p className="text-gray-300 text-lg">Please read carefully and accept all terms to proceed</p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Warning Banner */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
              <div className="flex items-center gap-3 text-white">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold">Important Notice</p>
                  <p className="text-sm">You must accept all terms and conditions to start the interview. This interview is monitored and recorded.</p>
                </div>
              </div>
            </div>

            {/* Terms Content */}
            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
              
              {/* 1. Proctoring and Monitoring */}
              <div className="border-l-4 border-blue-500 pl-6 pr-4 py-4 bg-blue-50 rounded-r-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Camera className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">1. AI-Powered Proctoring & Monitoring</h3>
                    <div className="text-gray-700 space-y-2 text-sm">
                      <p>• <strong>Continuous Video Recording:</strong> Your webcam will record you throughout the entire interview session.</p>
                      <p>• <strong>Face Detection:</strong> AI will detect your face every 500ms. Only ONE face must be visible at all times.</p>
                      <p>• <strong>Multiple Face Detection:</strong> If multiple faces are detected, you will receive a -15 point penalty per occurrence.</p>
                      <p>• <strong>No Face Detection:</strong> If no face is detected, you will receive a -10 point penalty per occurrence.</p>
                      <p>• <strong>Audio Monitoring:</strong> Your microphone activity will be tracked for monitoring purposes.</p>
                      <p>• <strong>Second Voice Detection:</strong> Audio monitoring is currently inactive; integrity is monitored through visual proctoring.</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms.proctoring}
                    onChange={() => handleCheckboxChange('proctoring')}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    I understand and accept the proctoring and monitoring terms
                  </span>
                </label>
              </div>

              {/* 2. Recording and Data Storage */}
              <div className="border-l-4 border-purple-500 pl-6 pr-4 py-4 bg-purple-50 rounded-r-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Mic className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">2. Recording & Data Storage</h3>
                    <div className="text-gray-700 space-y-2 text-sm">
                      <p>• <strong>Video Recording:</strong> All video footage will be recorded and stored securely.</p>
                      <p>• <strong>Audio Recording:</strong> All audio will be recorded, including your voice answers.</p>
                      <p>• <strong>Screen Activity:</strong> Tab switches, window focus changes, and copy-paste actions are logged.</p>
                      <p>• <strong>Answer Storage:</strong> All your text and voice answers will be stored and analyzed.</p>
                      <p>• <strong>Data Retention:</strong> Recordings may be retained for up to 90 days for verification purposes.</p>
                      <p>• <strong>Recruiter Access:</strong> The hiring company will have access to all recordings and data.</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms.recording}
                    onChange={() => handleCheckboxChange('recording')}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                    I consent to recording and storage of all interview data
                  </span>
                </label>
              </div>

              {/* 3. Integrity and Academic Honesty */}
              <div className="border-l-4 border-red-500 pl-6 pr-4 py-4 bg-red-50 rounded-r-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Shield className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">3. Integrity & Academic Honesty</h3>
                    <div className="text-gray-700 space-y-2 text-sm">
                      <p>• <strong>No External Help:</strong> You must complete the interview alone without any assistance.</p>
                      <p>• <strong>No Reference Materials:</strong> You cannot use books, notes, or online resources during the interview.</p>
                      <p>• <strong>No Communication:</strong> You cannot communicate with anyone during the interview.</p>
                      <p>• <strong>Original Answers:</strong> All answers must be your own original work.</p>
                      <p>• <strong>Violation Consequences:</strong> Integrity violations may result in immediate interview termination.</p>
                      <p>• <strong>Integrity Score:</strong> Your integrity score starts at 100% and decreases with each violation.</p>
                      <p>• <strong>Auto-Rejection:</strong> Integrity score below 35% results in automatic rejection.</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms.integrity}
                    onChange={() => handleCheckboxChange('integrity')}
                    className="w-5 h-5 text-red-600 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                    I commit to maintaining complete integrity and honesty
                  </span>
                </label>
              </div>

              {/* 4. Technical Requirements */}
              <div className="border-l-4 border-green-500 pl-6 pr-4 py-4 bg-green-50 rounded-r-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Monitor className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">4. Technical Requirements & Environment</h3>
                    <div className="text-gray-700 space-y-2 text-sm">
                      <p>• <strong>Stable Internet:</strong> You must have a stable internet connection throughout the interview.</p>
                      <p>• <strong>Working Webcam:</strong> A functional webcam is required and must remain on.</p>
                      <p>• <strong>Working Microphone:</strong> A functional microphone is required for voice answers.</p>
                      <p>• <strong>Quiet Environment:</strong> You must be in a quiet, well-lit room without distractions.</p>
                      <p>• <strong>Alone in Room:</strong> You must be alone in the room during the interview.</p>
                      <p>• <strong>No Interruptions:</strong> Ensure you will not be interrupted during the 30-minute session.</p>
                      <p>• <strong>Browser Requirements:</strong> Use Chrome, Firefox, or Edge (latest versions).</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms.technical}
                    onChange={() => handleCheckboxChange('technical')}
                    className="w-5 h-5 text-green-600 rounded focus:ring-2 focus:ring-green-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    I confirm my environment meets all technical requirements
                  </span>
                </label>
              </div>

              {/* 5. Interview Conduct */}
              <div className="border-l-4 border-indigo-500 pl-6 pr-4 py-4 bg-indigo-50 rounded-r-lg">
                <div className="flex items-start gap-3 mb-3">
                  <Clock className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">5. Interview Conduct & Rules</h3>
                    <div className="text-gray-700 space-y-2 text-sm">
                      <p>• <strong>30-Minute Time Limit:</strong> The interview has a strict 30-minute time limit.</p>
                      <p>• <strong>Auto-Submit:</strong> The interview will automatically submit when time expires.</p>
                      <p>• <strong>No Pausing:</strong> You cannot pause or restart the interview once started.</p>
                      <p>• <strong>No Tab Switching:</strong> Switching tabs results in a -3 point penalty per occurrence.</p>
                      <p>• <strong>Stay Focused:</strong> Keep the interview window in focus at all times.</p>
                      <p>• <strong>Answer All Questions:</strong> You should attempt to answer all questions (up to 10).</p>
                      <p>• <strong>Dynamic Questions:</strong> Questions adapt based on your answers and get progressively harder.</p>
                      <p>• <strong>No Retakes:</strong> You get only ONE attempt at this interview.</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms.conduct}
                    onChange={() => handleCheckboxChange('conduct')}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    I understand and will follow all interview conduct rules
                  </span>
                </label>
              </div>

              {/* 6. Privacy and Consent */}
              <div className="border-l-4 border-pink-500 pl-6 pr-4 py-4 bg-pink-50 rounded-r-lg">
                <div className="flex items-start gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-pink-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">6. Privacy & Consent</h3>
                    <div className="text-gray-700 space-y-2 text-sm">
                      <p>• <strong>Data Processing:</strong> Your data will be processed for interview evaluation purposes.</p>
                      <p>• <strong>AI Analysis:</strong> AI will analyze your answers, behavior, and integrity.</p>
                      <p>• <strong>Scoring:</strong> You will receive scores for technical skills, problem-solving, communication, and integrity.</p>
                      <p>• <strong>Recruiter Review:</strong> Recruiters will review your complete interview performance.</p>
                      <p>• <strong>Data Security:</strong> All data is stored securely and encrypted.</p>
                      <p>• <strong>No Sharing:</strong> Your data will not be shared with third parties without consent.</p>
                      <p>• <strong>Right to Access:</strong> You can request access to your interview data.</p>
                    </div>
                  </div>
                </div>
                <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={acceptedTerms.privacy}
                    onChange={() => handleCheckboxChange('privacy')}
                    className="w-5 h-5 text-pink-600 rounded focus:ring-2 focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">
                    I consent to data processing and privacy terms
                  </span>
                </label>
              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 p-6 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {allAccepted ? (
                    <span className="flex items-center gap-2 text-green-600 font-semibold">
                      <CheckCircle className="w-5 h-5" />
                      All terms accepted - You may proceed
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-amber-600 font-semibold">
                      <AlertTriangle className="w-5 h-5" />
                      Please accept all terms to continue
                    </span>
                  )}
                </div>
                <button
                  onClick={handleProceed}
                  disabled={!allAccepted}
                  className={`px-8 py-3 rounded-lg font-bold text-white transition-all transform ${
                    allAccepted
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-lg'
                      : 'bg-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {allAccepted ? 'Proceed to Interview →' : 'Accept All Terms First'}
                </button>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center text-gray-400 text-sm">
            <p>By proceeding, you acknowledge that you have read, understood, and agree to all terms and conditions.</p>
            <p className="mt-2">Interview Link Expires in 24 hours | One-time use only</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewTerms;
