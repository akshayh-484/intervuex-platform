import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recruiterAPI } from '../services/api.js';

const RecruiterDashboardComplete = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [completedInterviews, setCompletedInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scheduleMode, setScheduleMode] = useState('24hour'); // '24hour' or 'timewindow'
  const [scheduleData, setScheduleData] = useState({
    validFrom: '',
    validUntil: ''
  });
  const [newCandidate, setNewCandidate] = useState({
    fullName: '',
    email: '',
    phone: '',
    resume: null
  });

  useEffect(() => {
    // Guard: redirect to login if no token
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/recruiter/login');
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dashboardRes, candidatesRes] = await Promise.all([
        recruiterAPI.getDashboard(),
        recruiterAPI.getCandidates()
      ]);
      
      console.log('Dashboard data:', dashboardRes.data);
      console.log('Candidates data:', candidatesRes.data);
      
      setStats(dashboardRes.data);
      setCandidates(candidatesRes.data.candidates || []);
      
      // Extract completed interviews from recent sessions
      if (dashboardRes.data.recentSessions) {
        const completed = dashboardRes.data.recentSessions.filter(s => s.status === 'completed');
        setCompletedInterviews(completed);
      }
    } catch (error) {
      console.error('Load dashboard error:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        alert('Failed to load dashboard. Please try logging in again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('fullName', newCandidate.fullName);
      formData.append('email', newCandidate.email);
      formData.append('phone', newCandidate.phone);
      if (newCandidate.resume) {
        formData.append('resume', newCandidate.resume);
      }

      const response = await recruiterAPI.createCandidate(formData);
      
      if (response.data.success) {
        setShowAddCandidate(false);
        setNewCandidate({ fullName: '', email: '', phone: '', resume: null });
        loadDashboard();
        alert('Candidate added successfully!');
      }
    } catch (error) {
      console.error('Add candidate error:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to add candidate';
        alert(`Error: ${errorMsg}`);
      }
    }
  };

  const handleScheduleInterview = async (candidateId) => {
    setSelectedCandidate(candidateId);
    setShowScheduleModal(true);
    setScheduleMode('24hour');
    setScheduleData({ validFrom: '', validUntil: '' });
  };

  const handleConfirmSchedule = async () => {
    try {
      let schedulePayload = {
        candidateId: selectedCandidate,
        duration: 1800,
        expiresIn: 24
      };

      // Add time window if selected
      if (scheduleMode === 'timewindow') {
        if (!scheduleData.validFrom || !scheduleData.validUntil) {
          alert('Please select both start and end times for the time window');
          return;
        }

        const fromDate = new Date(scheduleData.validFrom);
        const untilDate = new Date(scheduleData.validUntil);

        if (untilDate <= fromDate) {
          alert('End time must be after start time');
          return;
        }

        schedulePayload.validFrom = scheduleData.validFrom;
        schedulePayload.validUntil = scheduleData.validUntil;
      }

      const response = await recruiterAPI.scheduleInterview(
        schedulePayload.candidateId,
        schedulePayload.duration,
        schedulePayload.expiresIn,
        schedulePayload.validFrom,
        schedulePayload.validUntil
      );

      const link = response.data.interviewUrl;
      const emailSent = response.data.emailSent;
      const emailMode = response.data.emailMode;
      
      // Copy to clipboard
      navigator.clipboard.writeText(link);
      
      let message = `Interview scheduled successfully!\n\nInterview Link:\n${link}\n\n`;
      
      if (scheduleMode === 'timewindow') {
        message += `⏰ Valid from: ${new Date(scheduleData.validFrom).toLocaleString()}\n`;
        message += `⏰ Valid until: ${new Date(scheduleData.validUntil).toLocaleString()}\n\n`;
      } else {
        message += `⏰ Link expires in 24 hours\n\n`;
      }
      
      if (emailSent) {
        if (emailMode === 'production') {
          message += '✅ Email sent to candidate automatically!';
        } else {
          message += '📧 Email logged to server console (test mode).\nCopy the link above and send it to the candidate manually.';
        }
      } else {
        message += '⚠️ Email not sent. Copy the link above and send it to the candidate manually.';
      }
      
      message += '\n\nLink copied to clipboard!';
      
      alert(message);
      setShowScheduleModal(false);
      setSelectedCandidate(null);
      loadDashboard();
    } catch (error) {
      console.error('Schedule interview error:', error);
      alert('Failed to schedule interview');
    }
  };

  const handleDeleteCandidate = async (candidateId, candidateName) => {
    if (!confirm(`Are you sure you want to delete ${candidateName}? This will also delete all their interviews.`)) {
      return;
    }
    
    try {
      await recruiterAPI.deleteCandidate(candidateId);
      alert('Candidate deleted successfully');
      loadDashboard();
    } catch (error) {
      alert('Failed to delete candidate');
    }
  };

  const handleDeleteInterview = async (sessionId, candidateName) => {
    if (!confirm(`Are you sure you want to delete the interview for ${candidateName}?`)) {
      return;
    }
    
    try {
      await recruiterAPI.deleteInterview(sessionId);
      alert('Interview deleted successfully');
      loadDashboard();
    } catch (error) {
      alert('Failed to delete interview');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/recruiter/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">INTERVUEX - Recruiter Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total Interviews</div>
            <div className="text-3xl font-bold text-blue-600">
              {(parseInt(stats?.stats?.scheduled || 0) +
                parseInt(stats?.stats?.active || 0) +
                parseInt(stats?.stats?.completed || 0) +
                parseInt(stats?.stats?.terminated || 0))}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Completed</div>
            <div className="text-3xl font-bold text-green-600">{stats?.stats?.completed || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Shortlisted</div>
            <div className="text-3xl font-bold text-purple-600">{stats?.shortlistStats?.shortlisted || 0}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Active</div>
            <div className="text-3xl font-bold text-orange-600">{stats?.stats?.active || 0}</div>
          </div>
        </div>

        {/* Candidates Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Candidates</h2>
            <button
              onClick={() => setShowAddCandidate(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Candidate
            </button>
          </div>

          {/* Candidates List */}
          <div className="space-y-4">
            {candidates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No candidates yet. Add your first candidate to get started!
              </div>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="border rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{candidate.full_name}</div>
                    <div className="text-sm text-gray-600">{candidate.email}</div>
                    <div className="text-sm text-gray-500">{candidate.phone}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleScheduleInterview(candidate.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Schedule Interview
                    </button>
                    <button
                      onClick={() => handleDeleteCandidate(candidate.id, candidate.full_name)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Interviews Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">All Interviews</h2>
          {stats?.recentSessions && stats.recentSessions.length > 0 ? (
            <div className="space-y-4">
              {stats.recentSessions.map((interview) => (
                <div key={interview.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{interview.full_name}</div>
                      <div className="text-sm text-gray-600">{interview.email}</div>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                          interview.status === 'completed' ? 'bg-green-100 text-green-800' :
                          interview.status === 'active' ? 'bg-blue-100 text-blue-800' :
                          interview.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {interview.status.toUpperCase()}
                        </span>
                        {interview.final_score && (
                          <>
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded-full">
                              Score: {interview.final_score}
                            </span>
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                              interview.shortlist_status === 'SHORTLISTED' ? 'bg-green-100 text-green-800' :
                              interview.shortlist_status === 'REVIEW' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {interview.shortlist_status}
                            </span>
                          </>
                        )}
                      </div>
                      {interview.end_time && (
                        <div className="text-sm text-gray-500 mt-2">
                          Completed: {new Date(interview.end_time).toLocaleString()}
                        </div>
                      )}
                      {interview.start_time && !interview.end_time && (
                        <div className="text-sm text-gray-500 mt-2">
                          Started: {new Date(interview.start_time).toLocaleString()}
                        </div>
                      )}
                    </div>
                    {interview.status === 'completed' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/recruiter/report/${interview.id}`)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                        >
                          View Report
                        </button>
                        <button
                          onClick={() => handleDeleteInterview(interview.id, interview.full_name)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                    {interview.status !== 'completed' && (
                      <button
                        onClick={() => handleDeleteInterview(interview.id, interview.full_name)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No interviews yet. Schedule an interview to get started!
            </div>
          )}
        </div>
      </div>

      {/* Add Candidate Modal */}
      {showAddCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add New Candidate</h3>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name</label>
                <input
                  type="text"
                  required
                  value={newCandidate.fullName}
                  onChange={(e) => setNewCandidate({...newCandidate, fullName: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({...newCandidate, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input
                  type="tel"
                  required
                  value={newCandidate.phone}
                  onChange={(e) => setNewCandidate({...newCandidate, phone: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Resume (PDF)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setNewCandidate({...newCandidate, resume: e.target.files[0]})}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Candidate
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCandidate(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Schedule Interview</h3>
            
            <div className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Link Validity Mode</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="24hour"
                      checked={scheduleMode === '24hour'}
                      onChange={(e) => setScheduleMode(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">24-Hour Expiry (Link valid for 24 hours from now)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="scheduleMode"
                      value="timewindow"
                      checked={scheduleMode === 'timewindow'}
                      onChange={(e) => setScheduleMode(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Time Window (Set specific start and end times)</span>
                  </label>
                </div>
              </div>

              {/* Time Window Fields */}
              {scheduleMode === 'timewindow' && (
                <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid From</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleData.validFrom}
                      onChange={(e) => setScheduleData({...scheduleData, validFrom: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Valid Until</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleData.validUntil}
                      onChange={(e) => setScheduleData({...scheduleData, validUntil: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="text-xs text-gray-600 bg-white p-2 rounded">
                    💡 The interview link will only work between these times
                  </div>
                </div>
              )}

              {scheduleMode === '24hour' && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  ℹ️ Link will be valid for 24 hours from the moment you click "Schedule"
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-2">
                <button
                  onClick={handleConfirmSchedule}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Schedule Interview
                </button>
                <button
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedCandidate(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecruiterDashboardComplete;
