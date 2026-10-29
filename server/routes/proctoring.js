import express from 'express';
import { authenticate, authenticateSession } from '../middleware/auth.js';
import * as proctoringController from '../controllers/proctoringController.js';

const router = express.Router();

// Log violation - uses authenticate (sessionId in body, not URL param)
router.post('/violation', authenticate, proctoringController.logViolation);

// Upload screenshot - uses authenticate (sessionId in body)
router.post('/screenshot', authenticate, proctoringController.uploadScreenshot);

// Get violations by sessionId - uses authenticateSession (sessionId in URL)
router.get('/violations/:sessionId', authenticate, proctoringController.getViolations);

// Heartbeat - uses authenticate (sessionId in body)
router.post('/heartbeat', authenticate, proctoringController.heartbeat);

export default router;
