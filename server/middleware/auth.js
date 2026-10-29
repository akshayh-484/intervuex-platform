/**
 * Authentication Middleware
 * JWT verification and session validation
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check user type and fetch from appropriate table
    if (decoded.type === 'recruiter') {
      const result = await query(
        'SELECT id, email, full_name FROM recruiters WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].full_name,
        type: 'recruiter'
      };
    } else if (decoded.type === 'candidate') {
      const result = await query(
        'SELECT id, email, full_name FROM candidates WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].full_name,
        type: 'candidate',
        sessionId: decoded.sessionId
      };
    } else {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(403).json({ error: 'Authentication failed' });
  }
};

export const authenticateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Support both session-param routes and body-based sessionId
    const resolvedSessionId = sessionId || req.body?.sessionId;

    if (!resolvedSessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Verify session belongs to user and is active
    const result = await query(
      `SELECT * FROM interview_sessions 
       WHERE id = $1 AND candidate_id = $2 AND status IN ('scheduled', 'active')`,
      [resolvedSessionId, decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired session' });
    }

    req.session = result.rows[0];
    req.user = { id: decoded.id, type: decoded.type, sessionId: decoded.sessionId };
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Session authentication failed' });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
