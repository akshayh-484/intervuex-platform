/**
 * Recruiter Controller
 * Handles recruiter dashboard and candidate management
 */

import { query } from '../config/database.js';
import { parseResume } from '../services/resumeParser.js';
import { generateQuestions } from '../services/questionGenerator.js';
import { sendInterviewInvitation } from '../services/emailService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Get Dashboard Overview
 */
export const getDashboard = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    // Get statistics
    const stats = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'terminated') as terminated
       FROM interview_sessions
       WHERE recruiter_id = $1`,
      [recruiterId]
    );

    // Get recent sessions
    const sessions = await query(
      `SELECT s.*, c.full_name, c.email, sc.final_score, sc.shortlist_status
       FROM interview_sessions s
       JOIN candidates c ON s.candidate_id = c.id
       LEFT JOIN scores sc ON s.id = sc.session_id
       WHERE s.recruiter_id = $1
       ORDER BY s.created_at DESC
       LIMIT 10`,
      [recruiterId]
    );

    // Get shortlist counts
    const shortlistStats = await query(
      `SELECT 
        COUNT(*) FILTER (WHERE shortlist_status = 'SHORTLISTED') as shortlisted,
        COUNT(*) FILTER (WHERE shortlist_status = 'REVIEW') as review,
        COUNT(*) FILTER (WHERE shortlist_status = 'REJECTED') as rejected
       FROM scores sc
       JOIN interview_sessions s ON sc.session_id = s.id
       WHERE s.recruiter_id = $1`,
      [recruiterId]
    );

    res.json({
      stats: stats.rows[0],
      shortlistStats: shortlistStats.rows[0],
      recentSessions: sessions.rows
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

/**
 * Create Candidate
 */
export const createCandidate = async (req, res) => {
  try {
    const { fullName, email, phone } = req.body;
    const recruiterId = req.user.id;

    let resumeData = {
      fileUrl: null,
      parsed: {},
      skills: []
    };

    // Parse resume if provided
    if (req.file) {
      try {
        resumeData = await parseResume(req.file);
      } catch (parseError) {
        console.warn('Resume parsing failed, continuing without resume data:', parseError);
      }
    }

    // Create candidate
    const result = await query(
      `INSERT INTO candidates (
        full_name, email, phone, resume_url, 
        resume_parsed_data, skills, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        fullName,
        email,
        phone,
        resumeData.fileUrl,
        JSON.stringify(resumeData.parsed),
        JSON.stringify(resumeData.skills),
        recruiterId
      ]
    );

    res.status(201).json({
      success: true,
      candidate: result.rows[0]
    });
  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(500).json({ error: 'Failed to create candidate', details: error.message });
  }
};

/**
 * Get All Candidates
 */
export const getCandidates = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const result = await query(
      `SELECT c.*, 
        COUNT(s.id) as total_interviews,
        MAX(sc.final_score) as best_score
       FROM candidates c
       LEFT JOIN interview_sessions s ON c.id = s.candidate_id
       LEFT JOIN scores sc ON s.id = sc.session_id
       WHERE c.created_by = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [recruiterId]
    );

    res.json({ candidates: result.rows });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({ error: 'Failed to get candidates' });
  }
};

/**
 * Get Candidate Details
 */
export const getCandidateDetails = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const recruiterId = req.user.id;

    // Get candidate info - verify recruiter owns this candidate
    const candidate = await query(
      'SELECT * FROM candidates WHERE id = $1 AND created_by = $2',
      [candidateId, recruiterId]
    );

    if (candidate.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Get interview history
    const interviews = await query(
      `SELECT s.*, sc.final_score, sc.shortlist_status
       FROM interview_sessions s
       LEFT JOIN scores sc ON s.id = sc.session_id
       WHERE s.candidate_id = $1
       ORDER BY s.created_at DESC`,
      [candidateId]
    );

    res.json({
      candidate: candidate.rows[0],
      interviews: interviews.rows
    });
  } catch (error) {
    console.error('Get candidate details error:', error);
    res.status(500).json({ error: 'Failed to get candidate details' });
  }
};

/**
 * Get Interview Report
 */
export const getInterviewReport = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const recruiterId = req.user.id;

    // Get session details - filter by recruiter_id to prevent unauthorized access
    const session = await query(
      `SELECT s.*, c.full_name, c.email, c.resume_parsed_data
       FROM interview_sessions s
       JOIN candidates c ON s.candidate_id = c.id
       WHERE s.id = $1 AND s.recruiter_id = $2`,
      [sessionId, recruiterId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Get scores
    const scores = await query(
      'SELECT * FROM scores WHERE session_id = $1',
      [sessionId]
    );

    // Get violations
    const violations = await query(
      `SELECT * FROM violations 
       WHERE session_id = $1 
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    // Get answers
    const sessionData = session.rows[0];

    res.json({
      session: sessionData,
      scores: scores.rows[0],
      violations: violations.rows,
      questions: sessionData.questions,
      answers: sessionData.answers
    });
  } catch (error) {
    console.error('Get interview report error:', error);
    res.status(500).json({ error: 'Failed to get interview report' });
  }
};

/**
 * Update Shortlist Status
 */
export const updateShortlistStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, notes } = req.body;

    await query(
      `UPDATE scores 
       SET shortlist_status = $1, recruiter_notes = $2, updated_at = NOW()
       WHERE session_id = $3`,
      [status, notes, sessionId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update shortlist status error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

/**
 * Get Shortlisted Candidates
 */
export const getShortlistedCandidates = async (req, res) => {
  try {
    const recruiterId = req.user.id;

    const result = await query(
      `SELECT c.*, s.id as session_id, sc.final_score, sc.shortlist_status
       FROM candidates c
       JOIN interview_sessions s ON c.id = s.candidate_id
       JOIN scores sc ON s.id = sc.session_id
       WHERE s.recruiter_id = $1 AND sc.shortlist_status = 'SHORTLISTED'
       ORDER BY sc.final_score DESC`,
      [recruiterId]
    );

    res.json({ candidates: result.rows });
  } catch (error) {
    console.error('Get shortlisted candidates error:', error);
    res.status(500).json({ error: 'Failed to get shortlisted candidates' });
  }
};

/**
 * Delete Candidate
 */
export const deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    const recruiterId = req.user.id;

    // Verify candidate belongs to recruiter
    const candidate = await query(
      'SELECT * FROM candidates WHERE id = $1 AND created_by = $2',
      [candidateId, recruiterId]
    );

    if (candidate.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    // Delete candidate (cascade will delete related interviews)
    await query('DELETE FROM candidates WHERE id = $1', [candidateId]);

    res.json({ success: true, message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
};

/**
 * Delete Interview Session
 */
export const deleteInterview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const recruiterId = req.user.id;

    // Verify session belongs to recruiter
    const session = await query(
      'SELECT * FROM interview_sessions WHERE id = $1 AND recruiter_id = $2',
      [sessionId, recruiterId]
    );

    if (session.rows.length === 0) {
      return res.status(404).json({ error: 'Interview session not found' });
    }

    // Delete session (cascade will delete related scores and violations)
    await query('DELETE FROM interview_sessions WHERE id = $1', [sessionId]);

    res.json({ success: true, message: 'Interview deleted successfully' });
  } catch (error) {
    console.error('Delete interview error:', error);
    res.status(500).json({ error: 'Failed to delete interview' });
  }
};
export const scheduleInterview = async (req, res) => {
  try {
    const { candidateId, duration, expiresIn, validFrom, validUntil, difficulty = 'medium' } = req.body;
    const recruiterId = req.user.id;

    // Get candidate data - verify recruiter owns this candidate
    const candidateResult = await query(
      'SELECT * FROM candidates WHERE id = $1 AND created_by = $2',
      [candidateId, recruiterId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = candidateResult.rows[0];

    // Get recruiter data for email
    const recruiterResult = await query(
      'SELECT full_name, email, company FROM recruiters WHERE id = $1',
      [recruiterId]
    );

    const recruiter = recruiterResult.rows[0];

    // Generate questions based on resume and selected difficulty
    const questions = await generateQuestions(
      candidate.resume_parsed_data,
      candidate.skills,
      difficulty
    );

    // Generate access token
    const accessToken = uuidv4();

    // Calculate expiration based on mode
    let expiresAt;
    let validFromTime = null;
    let validUntilTime = null;

    if (validFrom && validUntil) {
      // Time window mode
      validFromTime = new Date(validFrom);
      validUntilTime = new Date(validUntil);
      expiresAt = validUntilTime; // Set expires_at to valid_until for consistency
    } else {
      // 24-hour expiry mode
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (expiresIn || 24));
    }

    // Create session
    const result = await query(
      `INSERT INTO interview_sessions (
        candidate_id, recruiter_id, access_token,
        duration_seconds, expires_at, valid_from, valid_until, questions, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
      RETURNING id, access_token`,
      [candidateId, recruiterId, accessToken, duration || 1800, expiresAt, validFromTime, validUntilTime, JSON.stringify(questions)]
    );

    const interviewUrl = `${process.env.FRONTEND_URL}/interview/${accessToken}`;

    // Send email invitation to candidate
    const emailResult = await sendInterviewInvitation(
      candidate.email,
      candidate.full_name,
      interviewUrl,
      recruiter.full_name,
      recruiter.company || 'INTERVUEX'
    );

    if (emailResult.success) {
      console.log(`✅ Interview invitation email sent to ${candidate.email}`);
    } else {
      console.warn(`⚠️  Failed to send email to ${candidate.email}:`, emailResult.error);
    }

    res.json({
      success: true,
      sessionId: result.rows[0].id,
      interviewUrl,
      expiresAt,
      validFrom: validFromTime,
      validUntil: validUntilTime,
      emailSent: emailResult.success,
      emailMode: emailResult.mode // 'test' or 'production'
    });
  } catch (error) {
    console.error('Schedule interview error:', error);
    res.status(500).json({ error: 'Failed to schedule interview' });
  }
};
