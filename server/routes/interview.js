import express from 'express';
import multer from 'multer';
import { authenticate, authenticateSession } from '../middleware/auth.js';
import * as interviewController from '../controllers/interviewController.js';

const router = express.Router();

// Configure multer for audio uploads
const audioStorage = multer.memoryStorage();
const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Start interview session
router.post('/start', authenticate, interviewController.startInterview);

// Get interview details
router.get('/:sessionId', authenticateSession, interviewController.getInterview);

// Submit answer - supports both /submit-answer and /answer for compatibility
router.post('/submit-answer', authenticate, interviewController.submitAnswer);
router.post('/answer', authenticate, interviewController.submitAnswer);

// Get time remaining
router.get('/time-remaining/:sessionId', authenticateSession, interviewController.getTimeRemaining);

// End interview
router.post('/end', authenticate, interviewController.endInterview);

// Terminate interview (violations)
router.post('/terminate', authenticate, interviewController.terminateInterview);

// Speech-to-text conversion
router.post('/speech-to-text', authenticate, audioUpload.single('audio'), interviewController.convertSpeechToText);

export default router;
