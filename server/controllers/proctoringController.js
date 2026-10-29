/**
 * Proctoring Controller
 * Handles violation logging and proctoring data
 */

import { query } from '../config/database.js';
import { uploadToS3 } from '../services/fileStorage.js';

/**
 * Log a violation
 */
export const logViolation = async (req, res) => {
  try {
    const { sessionId, violation } = req.body;

    if (!sessionId || !violation) {
      return res.status(400).json({ error: 'sessionId and violation are required' });
    }

    // Map violation object to schema columns: type, severity, details (JSONB), timestamp, screenshot (TEXT)
    const details = {
      message: violation.message,
      impactScore: violation.impactScore || 0,
      metadata: violation.metadata || null,
      audioData: violation.audioData || null
    };

    // Insert violation into database using actual schema columns
    const result = await query(
      `INSERT INTO violations (
        session_id, type, severity, details, timestamp, screenshot
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        sessionId,
        violation.type,
        violation.severity,
        JSON.stringify(details),
        violation.timestamp ? new Date(violation.timestamp) : new Date(),
        violation.screenshot || null
      ]
    );

    const violationId = result.rows[0].id;

    // Calculate updated integrity score
    const integrityScore = await calculateCurrentIntegrityScore(sessionId);

    // Log audit event
    await query(
      `INSERT INTO audit_logs (session_id, action, details)
       VALUES ($1, $2, $3)`,
      [sessionId, 'VIOLATION_LOGGED', JSON.stringify({ violationId, type: violation.type })]
    );

    res.json({
      violationId,
      integrityScore,
      acknowledged: true
    });
  } catch (error) {
    console.error('Log violation error:', error);
    res.status(500).json({ error: 'Failed to log violation' });
  }
};

/**
 * Upload screenshot
 */
export const uploadScreenshot = async (req, res) => {
  try {
    const { sessionId, screenshot, violationType } = req.body;

    // Upload to S3 or local storage
    const screenshotUrl = await uploadToS3(screenshot, `screenshots/${sessionId}/${Date.now()}.jpg`);

    res.json({ screenshotUrl });
  } catch (error) {
    console.error('Upload screenshot error:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
};

/**
 * Get violations for a session
 */
export const getViolations = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await query(
      `SELECT * FROM violations 
       WHERE session_id = $1 
       ORDER BY timestamp ASC`,
      [sessionId]
    );

    const violations = result.rows;
    const totalCount = violations.length;

    // Group by severity
    const bySeverity = {
      CRITICAL: violations.filter(v => v.severity === 'CRITICAL').length,
      HIGH: violations.filter(v => v.severity === 'HIGH').length,
      MEDIUM: violations.filter(v => v.severity === 'MEDIUM').length,
      LOW: violations.filter(v => v.severity === 'LOW').length
    };

    res.json({
      violations,
      totalCount,
      bySeverity
    });
  } catch (error) {
    console.error('Get violations error:', error);
    res.status(500).json({ error: 'Failed to get violations' });
  }
};

/**
 * Heartbeat - keep session alive
 */
export const heartbeat = async (req, res) => {
  try {
    const { sessionId, status } = req.body;

    // Update session last activity
    await query(
      `UPDATE interview_sessions 
       SET updated_at = NOW() 
       WHERE id = $1`,
      [sessionId]
    );

    res.json({ acknowledged: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
};

/**
 * Calculate current integrity score
 */
const calculateCurrentIntegrityScore = async (sessionId) => {
  try {
    const result = await query(
      `SELECT severity, COUNT(*) as count
       FROM violations
       WHERE session_id = $1
       GROUP BY severity`,
      [sessionId]
    );

    let riskScore = 0;
    result.rows.forEach(row => {
      const count = parseInt(row.count);
      switch (row.severity) {
        case 'CRITICAL':
          riskScore += count * 15;
          break;
        case 'HIGH':
          riskScore += count * 10;
          break;
        case 'MEDIUM':
          riskScore += count * 5;
          break;
        case 'LOW':
          riskScore += count * 2;
          break;
      }
    });

    const integrityScore = Math.max(0, 100 - riskScore);
    return integrityScore;
  } catch (error) {
    console.error('Calculate integrity score error:', error);
    return 100;
  }
};
