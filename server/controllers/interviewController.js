/**
 * Interview Controller
 * Handles interview session management and orchestration
 */

import { query, transaction } from '../config/database.js';
import { calculateScores } from '../services/scoringEngine.js';
import { generateNextQuestion, analyzeAnswerQuality, convertSpeechToText as convertAudioToText } from '../services/dynamicQuestionGenerator.js';
import { sendInterviewCompletionNotification } from '../services/emailService.js';

// Start interview session
export const startInterview = async (req, res) => {
  try {
    const { sessionId, deviceFingerprint } = req.body;
    const candidateId = req.user.id;

    // Verify session exists and belongs to candidate
    const sessionResult = await query(
      `SELECT * FROM interview_sessions 
       WHERE id = $1 AND candidate_id = $2 AND status = 'scheduled'`,
      [sessionId, candidateId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or already started' });
    }

    const session = sessionResult.rows[0];

    // Update session to active
    const startTime = new Date();
    await query(
      `UPDATE interview_sessions 
       SET status = 'active', 
           start_time = $1, 
           device_fingerprint = $2,
           ip_address = $3
       WHERE id = $4`,
      [startTime, JSON.stringify(deviceFingerprint), req.ip, sessionId]
    );

    // Log audit event
    await query(
      `INSERT INTO audit_logs (user_id, session_id, action, details, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [candidateId, sessionId, 'INTERVIEW_STARTED', JSON.stringify({ startTime }), req.ip]
    );

    res.json({
      success: true,
      session: {
        id: sessionId,
        startTime,
        duration: session.duration_seconds,
        questions: typeof session.questions === 'string' ? JSON.parse(session.questions) : session.questions,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ error: 'Failed to start interview' });
  }
};

// Get interview details
export const getInterview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = req.session;

    // Calculate time remaining
    const now = new Date();
    const startTime = new Date(session.start_time);
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const timeRemaining = Math.max(0, session.duration_seconds - elapsedSeconds);

    // Auto-submit if time expired
    if (timeRemaining === 0 && session.status === 'active') {
      await autoSubmitInterview(sessionId);
      return res.json({
        session: { ...session, status: 'completed' },
        timeRemaining: 0,
        autoSubmitted: true
      });
    }

    res.json({
      session,
      timeRemaining,
      questions: session.questions
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ error: 'Failed to get interview details' });
  }
};

// Submit answer
export const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, answer } = req.body;

    // Get current session data
    const sessionResult = await query(
      'SELECT answers, questions, candidate_id FROM interview_sessions WHERE id = $1',
      [sessionId]
    );

    const session = sessionResult.rows[0];
    const currentAnswers = session.answers || [];
    const currentQuestions = session.questions || [];
    
    // Analyze answer quality
    const answerAnalysis = analyzeAnswerQuality(answer);
    
    const newAnswer = {
      questionId,
      answer,
      timestamp: new Date().toISOString(),
      quality: answerAnalysis.quality,
      score: answerAnalysis.score
    };

    currentAnswers.push(newAnswer);

    // Get candidate profile for dynamic question generation
    const candidateResult = await query(
      'SELECT skills, resume_parsed_data FROM candidates WHERE id = $1',
      [session.candidate_id]
    );
    
    const candidateProfile = {
      skills: candidateResult.rows[0]?.skills || [],
      experience: candidateResult.rows[0]?.resume_parsed_data?.experience || ''
    };

    // Get current question and build question history
    const currentQuestionIndex = currentAnswers.length - 1;
    const currentQuestion = currentQuestions[currentQuestionIndex];
    const questionHistory = currentQuestions.map(q => q.question);
    
    let nextQuestion = null;
    
    // Generate dynamic follow-up question (limit to 10 questions total)
    if (currentAnswers.length < 10) {
      const dynamicQuestion = await generateNextQuestion(
        currentQuestion.question,
        answer,
        candidateProfile,
        questionHistory,
        questionHistory // Pass full history for uniqueness check
      );
      
      // Verify uniqueness before adding
      const isDuplicate = questionHistory.some(q => 
        q.toLowerCase() === dynamicQuestion.question.toLowerCase() ||
        q.toLowerCase().includes(dynamicQuestion.question.toLowerCase().substring(0, 50))
      );
      
      if (!isDuplicate) {
        currentQuestions.push(dynamicQuestion);
        nextQuestion = dynamicQuestion;
      } else {
        console.warn('Duplicate question detected, generating new one');
        // Try one more time with higher randomness
        const retryQuestion = await generateNextQuestion(
          currentQuestion.question,
          answer + ' (retry)',
          candidateProfile,
          questionHistory,
          questionHistory
        );
        currentQuestions.push(retryQuestion);
        nextQuestion = retryQuestion;
      }
    }

    // Update session with new answer and questions
    await query(
      'UPDATE interview_sessions SET answers = $1, questions = $2, updated_at = NOW() WHERE id = $3',
      [JSON.stringify(currentAnswers), JSON.stringify(currentQuestions), sessionId]
    );

    res.json({
      success: true,
      nextQuestion,
      progress: {
        answered: currentAnswers.length,
        total: currentQuestions.length,
        percentage: Math.round((currentAnswers.length / 10) * 100)
      },
      answerAnalysis: {
        quality: answerAnalysis.quality,
        score: answerAnalysis.score
      }
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Failed to submit answer', details: error.message });
  }
};

// Get time remaining
export const getTimeRemaining = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = req.session;

    const now = new Date();
    const startTime = new Date(session.start_time);
    const elapsedSeconds = Math.floor((now - startTime) / 1000);
    const timeRemaining = Math.max(0, session.duration_seconds - elapsedSeconds);

    // Generate warnings
    const warnings = [];
    if (timeRemaining <= 300 && timeRemaining > 295) {
      warnings.push('5 minutes remaining');
    }
    if (timeRemaining <= 600 && timeRemaining > 595) {
      warnings.push('10 minutes remaining');
    }

    res.json({ timeRemaining, warnings });
  } catch (error) {
    console.error('Get time remaining error:', error);
    res.status(500).json({ error: 'Failed to get time remaining' });
  }
};

// End interview
export const endInterview = async (req, res) => {
  try {
    const { sessionId, reason } = req.body;
    const candidateId = req.user.id;

    // Verify session belongs to this candidate
    const sessionCheck = await query(
      'SELECT id FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
      [sessionId, candidateId]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Session not found or access denied' });
    }

    await transaction(async (client) => {
      // Update session status
      await client.query(
        `UPDATE interview_sessions 
         SET status = 'completed', end_time = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );

      // Calculate scores
      const scores = await calculateScores(sessionId);

      // Store scores
      await client.query(
        `INSERT INTO scores (
          session_id, technical_score, problem_solving_score,
          communication_score, confidence_score, resume_authenticity_score,
          integrity_risk_score, final_score, shortlist_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sessionId,
          scores.technical,
          scores.problemSolving,
          scores.communication,
          scores.confidence,
          scores.resumeAuthenticity,
          scores.integrityRisk,
          scores.final,
          scores.shortlistStatus
        ]
      );

      // Log audit event
      await client.query(
        `INSERT INTO audit_logs (session_id, action, details)
         VALUES ($1, $2, $3)`,
        [sessionId, 'INTERVIEW_COMPLETED', JSON.stringify({ reason, scores })]
      );

      // Get candidate and recruiter info for email notification
      const sessionInfo = await client.query(
        `SELECT 
          c.full_name as candidate_name,
          r.email as recruiter_email,
          r.full_name as recruiter_name
         FROM interview_sessions s
         JOIN candidates c ON s.candidate_id = c.id
         JOIN recruiters r ON s.recruiter_id = r.id
         WHERE s.id = $1`,
        [sessionId]
      );

      if (sessionInfo.rows.length > 0) {
        const { candidate_name, recruiter_email, recruiter_name } = sessionInfo.rows[0];
        
        // Send completion notification to recruiter
        const emailResult = await sendInterviewCompletionNotification(
          recruiter_email,
          recruiter_name,
          candidate_name,
          sessionId
        );

        if (emailResult.success) {
          console.log(`✅ Completion notification sent to ${recruiter_email}`);
        } else {
          console.warn(`⚠️  Failed to send completion notification:`, emailResult.error);
        }
      }
    });

    res.json({ success: true, message: 'Interview completed successfully' });
  } catch (error) {
    console.error('End interview error:', error);
    res.status(500).json({ error: 'Failed to end interview' });
  }
};

// Terminate interview (due to violations)
export const terminateInterview = async (req, res) => {
  try {
    const { sessionId, reason, integrityScore, violations } = req.body;
    const candidateId = req.user.id;

    // Verify session belongs to this candidate
    const sessionCheck = await query(
      'SELECT id FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
      [sessionId, candidateId]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Session not found or access denied' });
    }

    await query(
      `UPDATE interview_sessions 
       SET status = 'terminated', end_time = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    // Store termination reason
    await query(
      `INSERT INTO audit_logs (session_id, action, details)
       VALUES ($1, $2, $3)`,
      [sessionId, 'INTERVIEW_TERMINATED', JSON.stringify({ reason, integrityScore, violations })]
    );

    res.json({ success: true, message: 'Interview terminated' });
  } catch (error) {
    console.error('Terminate interview error:', error);
    res.status(500).json({ error: 'Failed to terminate interview' });
  }
};

// Auto-submit interview when time expires
const autoSubmitInterview = async (sessionId) => {
  try {
    await query(
      `UPDATE interview_sessions 
       SET status = 'completed', end_time = NOW()
       WHERE id = $1`,
      [sessionId]
    );

    // Calculate and store scores
    const scores = await calculateScores(sessionId);
    await query(
      `INSERT INTO scores (
        session_id, technical_score, problem_solving_score,
        communication_score, confidence_score, resume_authenticity_score,
        integrity_risk_score, final_score, shortlist_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sessionId,
        scores.technical,
        scores.problemSolving,
        scores.communication,
        scores.confidence,
        scores.resumeAuthenticity,
        scores.integrityRisk,
        scores.final,
        scores.shortlistStatus
      ]
    );

    console.log(`Interview ${sessionId} auto-submitted due to timeout`);
  } catch (error) {
    console.error('Auto-submit error:', error);
  }
};

// Convert speech to text
export const convertSpeechToText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Get audio buffer from multer
    const audioBuffer = req.file.buffer;
    
    // Convert to text using OpenAI Whisper or fallback
    const text = await convertAudioToText(audioBuffer);
    
    res.json({ 
      success: true, 
      text,
      message: 'Audio transcribed successfully'
    });
    
  } catch (error) {
    console.error('Speech-to-text error:', error);
    res.status(500).json({ 
      error: 'Failed to convert speech to text',
      message: error.message 
    });
  }
};
