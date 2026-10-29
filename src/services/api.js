/**
 * API Service
 * Centralized API calls to backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Redirect to recruiter login (not candidate login)
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/interview')) {
        window.location.href = '/recruiter/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication APIs
export const authAPI = {
  candidateLogin: (token, deviceFingerprint) =>
    api.post('/auth/candidate/login', { token, deviceFingerprint }),
  
  recruiterLogin: (email, password) =>
    api.post('/auth/recruiter/login', { email, password }),
  
  recruiterRegister: (fullName, email, password, company) =>
    api.post('/auth/recruiter/register', { fullName, email, password, company }),
  
  verifyToken: () =>
    api.get('/auth/verify'),
  
  generateLink: (candidateId, duration, expiresIn) =>
    api.post('/auth/generate-link', { candidateId, duration, expiresIn })
};

// Interview APIs
export const interviewAPI = {
  startInterview: (sessionId, deviceFingerprint) =>
    api.post('/interview/start', { sessionId, deviceFingerprint }),
  
  getInterview: (sessionId) =>
    api.get(`/interview/${sessionId}`),
  
  submitAnswer: (sessionId, questionId, answer) =>
    api.post('/interview/submit-answer', { sessionId, questionId, answer }),
  
  getTimeRemaining: (sessionId) =>
    api.get(`/interview/${sessionId}/time`),
  
  endInterview: (sessionId, reason) =>
    api.post('/interview/end', { sessionId, reason }),
  
  terminateInterview: (sessionId, reason, integrityScore, violations) =>
    api.post('/interview/terminate', { sessionId, reason, integrityScore, violations })
};

// Proctoring APIs
export const proctoringAPI = {
  // Backend expects { sessionId, violation } object
  logViolation: (sessionId, violation) =>
    api.post('/proctoring/violation', { sessionId, violation }),
  
  getViolations: (sessionId) =>
    api.get(`/proctoring/violations/${sessionId}`)
};

// Scoring APIs
export const scoringAPI = {
  getScoreBreakdown: (sessionId) =>
    api.get(`/scoring/${sessionId}`)
};

// Recruiter APIs
export const recruiterAPI = {
  getDashboard: () =>
    api.get('/recruiter/dashboard'),
  
  createCandidate: (candidateData) => {
    // Handle FormData separately
    const config = candidateData instanceof FormData 
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};
    return api.post('/recruiter/candidates', candidateData, config);
  },
  
  getCandidates: () =>
    api.get('/recruiter/candidates'),
  
  getCandidateDetails: (candidateId) =>
    api.get(`/recruiter/candidates/${candidateId}`),
  
  scheduleInterview: (candidateId, duration, expiresIn, validFrom, validUntil) =>
    api.post('/recruiter/schedule', { candidateId, duration, expiresIn, validFrom, validUntil }),
  
  getInterviewReport: (sessionId) =>
    api.get(`/recruiter/report/${sessionId}`),
  
  updateShortlistStatus: (sessionId, status, notes) =>
    api.put(`/recruiter/shortlist/${sessionId}`, { status, notes }),
  
  deleteCandidate: (candidateId) =>
    api.delete(`/recruiter/candidates/${candidateId}`),
  
  deleteInterview: (sessionId) =>
    api.delete(`/recruiter/interviews/${sessionId}`),
  
  getShortlistedCandidates: () =>
    api.get('/recruiter/shortlisted')
};

export default api;
