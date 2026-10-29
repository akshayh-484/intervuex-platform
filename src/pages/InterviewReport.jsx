import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { recruiterAPI } from '../services/api.js';
import { ArrowLeft, User, Clock, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

const InterviewReport = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [sessionId]);

  const loadReport = async () => {
    try {
      const response = await recruiterAPI.getInterviewReport(sessionId);
      setReport(response.data);
    } catch (error) {
      console.error('Load report error:', error);
      alert('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading report...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl text-red-600">Report not found</div>
      </div>
    );
  }

  const { session, scores, violations, questions, answers } = report;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/recruiter/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Interview Report</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Candidate Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <User className="w-12 h-12 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold">{session.full_name}</h2>
              <p className="text-gray-600">{session.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="font-semibold text-green-600">{session.status}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="font-semibold">{Math.floor(session.duration_seconds / 60)} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed At</p>
              <p className="font-semibold">{new Date(session.end_time).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Scores */}
        {scores && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">Evaluation Scores</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Technical</p>
                <p className="text-3xl font-bold text-blue-600">{scores.technical_score}</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Problem Solving</p>
                <p className="text-3xl font-bold text-purple-600">{scores.problem_solving_score}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Communication</p>
                <p className="text-3xl font-bold text-green-600">{scores.communication_score}</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Resume Auth</p>
                <p className="text-3xl font-bold text-orange-600">{scores.resume_authenticity_score}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Integrity Risk</p>
                <p className="text-3xl font-bold text-red-600">{scores.integrity_risk_score}</p>
              </div>
            </div>
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white text-center">
              <p className="text-sm mb-2">Final Score</p>
              <p className="text-5xl font-bold">{scores.final_score}</p>
              <p className="mt-4 text-lg font-semibold">
                Status: {scores.shortlist_status}
              </p>
            </div>
          </div>
        )}

        {/* Violations */}
        {violations && violations.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Violations ({violations.length})
            </h3>
            <div className="space-y-3">
              {violations.map((violation, index) => (
                <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-red-800">{violation.type}</p>
                      <p className="text-sm text-red-600">
                        {typeof violation.details === 'object'
                          ? violation.details?.message || JSON.stringify(violation.details)
                          : violation.details}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      violation.severity === 'HIGH' ? 'bg-red-200 text-red-800' :
                      violation.severity === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                      'bg-gray-200 text-gray-800'
                    }`}>
                      {violation.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(violation.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Questions & Answers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Questions & Answers
          </h3>
          <div className="space-y-6">
            {questions && questions.map((question, index) => (
              <div key={index} className="border-b pb-6 last:border-b-0">
                <div className="flex items-start gap-3 mb-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                    Q{index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{question.question}</p>
                    <p className="text-sm text-gray-500 mt-1">Type: {question.type}</p>
                  </div>
                </div>
                <div className="ml-12 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Answer:</p>
                  <p className="text-gray-800">
                    {answers && (
                      answers.find(a => a.questionId === question.id)?.answer ||
                      (answers[index] ? answers[index].answer : 'No answer provided')
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewReport;
