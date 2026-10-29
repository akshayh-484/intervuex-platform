import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Camera, Mic, Monitor, AlertTriangle } from 'lucide-react';

/**
 * CANDIDATE LOGIN PAGE
 * Secure entry point for candidates with interview token
 */
const CandidateLogin = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      // Verify token and get session
      const response = await fetch(`${API_BASE}/auth/candidate/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          deviceFingerprint: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired interview link');
      }
      
      // Store auth token — controller returns { token, session: { id, ... } }
      localStorage.setItem('token', data.token);
      localStorage.setItem('sessionId', data.session.id);

      // Navigate to terms page with the access token (not session ID)
      navigate(`/interview-terms/${token}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">INTERVUEX</h1>
          <p className="text-lg text-gray-600">AI-Powered Virtual Interview Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Enter Interview</h2>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interview Access Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter your unique interview token"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                This token was sent to you via email
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-red-800">Error</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Start Interview'}
            </button>
          </form>
        </div>

        {/* System Requirements */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-600" />
            System Requirements
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Webcam Access Required</p>
                <p className="text-sm text-gray-600">Your camera will be monitored throughout the interview</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mic className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Microphone Access Required</p>
                <p className="text-sm text-gray-600">Audio monitoring for integrity verification</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-900">Proctoring Active</p>
                <p className="text-sm text-gray-600">AI-powered monitoring detects violations</p>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">Important Guidelines</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Ensure you are alone in a quiet room</li>
              <li>• Keep your face visible to the camera at all times</li>
              <li>• Do not switch tabs or minimize the window</li>
              <li>• Multiple faces or voices will be flagged as violations</li>
              <li>• All activities are recorded and monitored</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>© 2024 INTERVUEX. Enterprise Interview Platform.</p>
          <p className="mt-1">All interviews are monitored and recorded for quality assurance.</p>
        </div>
      </div>
    </div>
  );
};

export default CandidateLogin;
