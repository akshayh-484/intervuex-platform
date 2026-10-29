/**
 * Scoring Routes
 */

import express from 'express';
import { getScoreBreakdown } from '../services/scoringEngine.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get score breakdown for a session
router.get('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    const userType = req.user.type;

    // Verify ownership: recruiter must own the session, candidate must be session's candidate
    const { query } = await import('../config/database.js');
    let ownershipCheck;
    if (userType === 'recruiter') {
      ownershipCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND recruiter_id = $2',
        [sessionId, userId]
      );
    } else {
      ownershipCheck = await query(
        'SELECT id FROM interview_sessions WHERE id = $1 AND candidate_id = $2',
        [sessionId, userId]
      );
    }
    
    if (ownershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const breakdown = await getScoreBreakdown(sessionId);

    if (!breakdown) {
      return res.status(404).json({ error: 'Scores not found' });
    }

    res.json(breakdown);
  } catch (error) {
    console.error('Get score breakdown error:', error);
    res.status(500).json({ error: 'Failed to get scores' });
  }
});

export default router;
