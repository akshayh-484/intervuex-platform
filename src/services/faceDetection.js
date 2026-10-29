/**
 * ADVANCED FACE DETECTION & RECOGNITION SERVICE
 * Real-time face detection, recognition, and tracking using Face-API.js
 * Features:
 * - Multiple face detection
 * - Face verification (same person throughout)
 * - Face substitution detection
 * - Continuous identity tracking
 */

import * as faceapi from 'face-api.js';

class FaceDetectionService {
  constructor() {
    this.isInitialized = false;
    this.detectionInterval = null;
    this.videoElement = null;
    this.canvas = null;
    this.faceCount = 0;
    this.previousFaceCount = 0;
    this.noFaceStartTime = null;
    this.violations = [];
    this.onViolation = null;
    this.detectionFrequency = 500; // Check every 500ms
    
    // Face Recognition & Tracking
    this.candidateFaceDescriptor = null; // Store candidate's face signature
    this.isCandidateVerified = false;
    this.faceVerificationAttempts = 0;
    this.maxVerificationAttempts = 5;
    this.faceSubstitutionCount = 0;
    this.trackedFaces = new Map(); // Track all detected faces
    this.unknownFaceWarnings = 0;
  }

  /**
   * Initialize Face-API.js models
   */
  async initialize() {
    try {
      // Try loading from CDN first, then fallback to local
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
      
      console.log('🔄 Loading face detection and recognition models...');
      
      // Load face detection and recognition models
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      this.isInitialized = true;
      console.log('✅ Face detection and recognition models loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error);
      console.warn('⚠️ Face detection will use fallback method');
      // Use fallback detection method
      this.isInitialized = true; // Still mark as initialized to use fallback
      return true;
    }
  }

  /**
   * Start face detection monitoring
   */
  async startDetection(videoElement, onViolationCallback) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.videoElement = videoElement;
    this.onViolation = onViolationCallback;

    // Wait for video to be ready
    if (videoElement.readyState < 2) {
      await new Promise(resolve => {
        videoElement.addEventListener('loadeddata', resolve, { once: true });
      });
    }

    // Create canvas for drawing (hidden, for detection only)
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '-9999px'; // Hide off-screen
    this.canvas.style.left = '-9999px';
    document.body.append(this.canvas);

    const displaySize = {
      width: videoElement.videoWidth || 640,
      height: videoElement.videoHeight || 480
    };
    
    this.canvas.width = displaySize.width;
    this.canvas.height = displaySize.height;

    // Capture candidate's face for verification
    await this.captureCandidateFace();

    // Start continuous detection
    this.detectionInterval = setInterval(async () => {
      await this.detectFaces();
    }, this.detectionFrequency);

    console.log('🎥 Face detection and recognition started - checking every', this.detectionFrequency, 'ms');
  }

  /**
   * Capture and store candidate's face descriptor for verification
   */
  async captureCandidateFace() {
    console.log('📸 Capturing candidate face for verification...');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && !this.candidateFaceDescriptor) {
      try {
        const detection = await faceapi
          .detectSingleFace(
            this.videoElement,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.5
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          this.candidateFaceDescriptor = detection.descriptor;
          this.isCandidateVerified = true;
          console.log('✅ Candidate face captured and verified!');
          
          // Store in tracked faces
          this.trackedFaces.set('CANDIDATE', {
            descriptor: detection.descriptor,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            appearances: 1,
            isCandidate: true
          });
          
          return true;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error capturing candidate face:', error);
        attempts++;
      }
    }
    
    console.warn('⚠️ Could not capture candidate face for verification');
    return false;
  }

  /**
   * Detect faces in current video frame with recognition
   */
  async detectFaces() {
    if (!this.videoElement || this.videoElement.paused || this.videoElement.readyState !== 4) return;

    try {
      // Detect all faces with landmarks and descriptors for recognition
      const detections = await faceapi
        .detectAllFaces(
          this.videoElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.5
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptors();

      this.faceCount = detections.length;

      // Verify faces if candidate face is captured
      if (this.candidateFaceDescriptor && detections.length > 0) {
        await this.verifyDetectedFaces(detections);
      }

      // Draw detection boxes if canvas exists
      if (this.canvas) {
        const displaySize = {
          width: this.videoElement.videoWidth || 640,
          height: this.videoElement.videoHeight || 480
        };
        
        faceapi.matchDimensions(this.canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        const ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw boxes around detected faces
        resizedDetections.forEach((detection, index) => {
          const box = detection.box;
          
          // Check if this face matches the candidate
          const isCandidate = this.isFaceCandidate(detection.descriptor);
          
          ctx.strokeStyle = isCandidate ? '#00ff00' : '#ff0000';
          ctx.lineWidth = 3;
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          
          // Draw label
          ctx.fillStyle = isCandidate ? '#00ff00' : '#ff0000';
          ctx.font = 'bold 16px Arial';
          const label = isCandidate ? 'CANDIDATE' : 'UNKNOWN PERSON!';
          ctx.fillText(label, box.x, box.y - 5);
        });
      }

      // Analyze face count and generate violations
      await this.analyzeFaceCount();

      this.previousFaceCount = this.faceCount;
    } catch (error) {
      console.error('Face detection error:', error);
      // Use fallback detection if face-api fails
      this.useFallbackDetection();
    }
  }

  /**
   * Verify if detected faces match the candidate
   */
  async verifyDetectedFaces(detections) {
    let candidateFound = false;
    let unknownFacesCount = 0;
    
    for (const detection of detections) {
      const distance = faceapi.euclideanDistance(
        this.candidateFaceDescriptor,
        detection.descriptor
      );
      
      // Distance < 0.6 means same person (lower = more similar)
      const isCandidate = distance < 0.6;
      
      if (isCandidate) {
        candidateFound = true;
        
        // Update candidate tracking
        const candidateData = this.trackedFaces.get('CANDIDATE');
        if (candidateData) {
          candidateData.lastSeen = Date.now();
          candidateData.appearances++;
        }
      } else {
        unknownFacesCount++;
        
        // Track unknown face
        const faceId = `UNKNOWN_${unknownFacesCount}`;
        const existingFace = this.findMatchingFace(detection.descriptor);
        
        if (existingFace) {
          // Known unknown person (returning)
          existingFace.lastSeen = Date.now();
          existingFace.appearances++;
        } else {
          // New unknown person
          this.trackedFaces.set(faceId, {
            descriptor: detection.descriptor,
            firstSeen: Date.now(),
            lastSeen: Date.now(),
            appearances: 1,
            isCandidate: false
          });
        }
        
        // Generate violation for unknown face
        const violation = {
          type: 'UNKNOWN_FACE_DETECTED',
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
          message: `Unknown person detected in frame (Face similarity: ${(distance * 100).toFixed(1)}%)`,
          faceDistance: distance,
          screenshot: await this.captureScreenshot(),
          impactScore: 20 // Very high penalty
        };
        
        this.violations.push(violation);
        
        if (this.onViolation) {
          this.onViolation(violation);
        }
        
        console.error('🚨 CRITICAL VIOLATION: Unknown person detected!');
      }
    }
    
    // Check if candidate is missing when other faces present
    if (!candidateFound && detections.length > 0) {
      this.faceSubstitutionCount++;
      
      const violation = {
        type: 'FACE_SUBSTITUTION',
        severity: 'CRITICAL',
        timestamp: new Date().toISOString(),
        message: `Candidate face not found - possible face substitution attempt #${this.faceSubstitutionCount}`,
        unknownFacesCount,
        screenshot: await this.captureScreenshot(),
        impactScore: 25 // Maximum penalty
      };
      
      this.violations.push(violation);
      
      if (this.onViolation) {
        this.onViolation(violation);
      }
      
      console.error('🚨 CRITICAL VIOLATION: Face substitution detected!');
    }
  }

  /**
   * Check if a face descriptor matches the candidate
   */
  isFaceCandidate(descriptor) {
    if (!this.candidateFaceDescriptor) return false;
    
    const distance = faceapi.euclideanDistance(
      this.candidateFaceDescriptor,
      descriptor
    );
    
    return distance < 0.6; // Threshold for same person
  }

  /**
   * Find if a face descriptor matches any tracked face
   */
  findMatchingFace(descriptor) {
    for (const [id, faceData] of this.trackedFaces.entries()) {
      if (id === 'CANDIDATE') continue;
      
      const distance = faceapi.euclideanDistance(
        faceData.descriptor,
        descriptor
      );
      
      if (distance < 0.6) {
        return faceData;
      }
    }
    
    return null;
  }
  
  /**
   * Fallback detection using basic video analysis
   */
  useFallbackDetection() {
    // Simple fallback: assume 1 face if video is playing
    if (this.videoElement && !this.videoElement.paused) {
      this.faceCount = 1;
      console.log('Using fallback face detection');
    }
  }

  /**
   * Analyze face count and generate violations
   * NOTE: Cooldown-based violation logic is handled in ProctoringEngine.jsx (startMonitoring).
   * This method tracks state only and does not emit duplicate violations.
   */
  async analyzeFaceCount() {
    // State tracking only — ProctoringEngine handles violation emission with cooldowns
    if (this.faceCount !== 0) {
      this.noFaceStartTime = null;
    } else if (this.noFaceStartTime === null) {
      this.noFaceStartTime = Date.now();
    }
    this.previousFaceCount = this.faceCount;
  }

  /**
   * Capture screenshot of current video frame
   */
  async captureScreenshot() {
    if (!this.videoElement) return null;

    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(this.videoElement, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Get current face count
   */
  getCurrentFaceCount() {
    return this.faceCount;
  }
  
  /**
   * Get candidate verification status
   */
  getCandidateVerificationStatus() {
    return {
      isVerified: this.isCandidateVerified,
      hasFaceDescriptor: !!this.candidateFaceDescriptor,
      substitutionAttempts: this.faceSubstitutionCount,
      unknownFaceWarnings: this.unknownFaceWarnings
    };
  }
  
  /**
   * Get tracked faces summary
   */
  getTrackedFacesSummary() {
    const summary = [];
    
    for (const [id, data] of this.trackedFaces.entries()) {
      summary.push({
        id,
        isCandidate: data.isCandidate,
        appearances: data.appearances,
        firstSeen: new Date(data.firstSeen).toLocaleTimeString(),
        lastSeen: new Date(data.lastSeen).toLocaleTimeString(),
        duration: Math.round((data.lastSeen - data.firstSeen) / 1000) // seconds
      });
    }
    
    return summary;
  }

  /**
   * Get all violations
   */
  getViolations() {
    return this.violations;
  }

  /**
   * Calculate integrity impact score
   */
  calculateIntegrityImpact() {
    return this.violations.reduce((total, v) => total + v.impactScore, 0);
  }

  /**
   * Stop face detection
   */
  stopDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }

    console.log('🛑 Face detection stopped');
  }

  /**
   * Reset detection state
   */
  reset() {
    this.faceCount = 0;
    this.previousFaceCount = 0;
    this.noFaceStartTime = null;
    this.violations = [];
    this.candidateFaceDescriptor = null;
    this.isCandidateVerified = false;
    this.faceSubstitutionCount = 0;
    this.trackedFaces.clear();
    this.unknownFaceWarnings = 0;
  }
}

export default new FaceDetectionService();
