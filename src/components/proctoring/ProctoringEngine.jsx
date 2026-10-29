import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import faceDetectionService from '../../services/faceDetection.js';
import noiseDetectionService from '../../services/noiseDetection.js';
import { proctoringAPI } from '../../services/api.js';
import { AlertTriangle, Camera, Mic, Eye, Monitor, Move, Maximize2, Minimize2, Shield } from 'lucide-react';

/**
 * PROCTORING ENGINE COMPONENT
 * Orchestrates all proctoring services and displays real-time monitoring
 * Runs continuously throughout the interview session
 * NOW WITH DRAGGABLE AND RESIZABLE FUNCTIONALITY
 */
const ProctoringEngine = ({ sessionId, onViolation, onIntegrityUpdate }) => {
  const webcamRef = useRef(null);
  const panelRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [violations, setViolations] = useState([]);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [audioLevel, setAudioLevel] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [faceVerified, setFaceVerified] = useState(false);
  const [substitutionAttempts, setSubstitutionAttempts] = useState(0);
  const [copyPasteCount, setCopyPasteCount] = useState(0);
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Start at top-left, user can move anywhere
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [size, setSize] = useState({ width: 320, height: 'auto' });
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    initializeProctoring();
    
    // Monitor fullscreen and re-enter if exited
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && 
          !document.webkitFullscreenElement && 
          !document.msFullscreenElement) {
        // Fullscreen was exited, try to re-enter
        setTimeout(() => {
          const elem = document.documentElement;
          if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.warn('Could not re-enter fullscreen:', err));
          } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
          } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
          }
        }, 100);
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    
    return () => {
      cleanup();
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  useEffect(() => {
    // Add mouse event listeners for dragging
    const handleMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Allow movement anywhere on screen (no bounds restriction)
        setPosition({
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        });
      }
      
      if (isResizing) {
        const newWidth = Math.max(250, Math.min(500, e.clientX - position.x + 20));
        setSize({ ...size, width: newWidth });
      }
    };
    
    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, isResizing, dragStart, position, size]);
  
  /**
   * Handle mouse down on header (start dragging)
   */
  const handleHeaderMouseDown = (e) => {
    // Don't start dragging if clicking on buttons
    if (e.target.closest('button')) {
      return;
    }
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };
  
  /**
   * Handle resize start
   */
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
  };
  
  /**
   * Toggle minimize
   */
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  /**
   * Initialize all proctoring services
   */
  const initializeProctoring = async () => {
    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Initialize face detection
      await faceDetectionService.initialize();
      
      // Initialize noise detection
      await noiseDetectionService.initialize(stream);

      // Start monitoring
      startMonitoring();

      // Setup browser monitoring
      setupBrowserMonitoring();

      setIsActive(true);
      console.log('✅ Proctoring engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize proctoring:', error);
      alert('Camera and microphone access required for interview');
    }
  }

  /**
   * Start all monitoring services
   */
  const startMonitoring = () => {
    // Start face detection with violation callback
    if (webcamRef.current && webcamRef.current.video) {
      faceDetectionService.startDetection(
        webcamRef.current.video,
        (violation) => {
          // Only handle violations from face detection service itself
          // Don't create duplicate violations here
          handleViolation(violation);
        }
      );
    }

    // Start noise detection - DISABLED (too sensitive)
    // noiseDetectionService.startMonitoring(handleViolation);

    // Track consecutive no-face detections to avoid false positives
    let consecutiveNoFace = 0;
    let consecutiveMultipleFaces = 0;
    let lastViolationTime = {
      noFace: 0,
      multipleFaces: 0
    };

    // Update face count every 500ms for real-time detection
    setInterval(() => {
      const count = faceDetectionService.getCurrentFaceCount();
      setFaceCount(count);
      
      // Get verification status
      const verificationStatus = faceDetectionService.getCandidateVerificationStatus();
      setFaceVerified(verificationStatus.isVerified);
      setSubstitutionAttempts(verificationStatus.substitutionAttempts);
      
      const now = Date.now();
      
      // MULTIPLE FACES: Trigger after 6 consecutive (3 seconds) with 20s cooldown
      if (count > 1) {
        consecutiveMultipleFaces++;
        consecutiveNoFace = 0;
        
        if (consecutiveMultipleFaces >= 6 && (now - lastViolationTime.multipleFaces) > 20000) {
          handleViolation({
            type: 'MULTIPLE_FACES',
            severity: 'MEDIUM',
            timestamp: new Date().toISOString(),
            message: `${count} faces detected - only 1 allowed`,
            impactScore: 10 // Reduced from 15
          });
          lastViolationTime.multipleFaces = now;
          consecutiveMultipleFaces = 0;
        }
      } else if (count === 0) {
        consecutiveNoFace++;
        consecutiveMultipleFaces = 0;
        
        // NO FACE: Trigger after 20 consecutive (10 seconds) with 30s cooldown
        if (consecutiveNoFace >= 20 && (now - lastViolationTime.noFace) > 30000) {
          handleViolation({
            type: 'NO_FACE',
            severity: 'LOW',
            timestamp: new Date().toISOString(),
            message: 'No face detected - candidate not visible',
            impactScore: 2 // Reduced from 3
          });
          lastViolationTime.noFace = now;
          consecutiveNoFace = 0;
        }
      } else {
        // Face detected correctly, reset counters
        consecutiveNoFace = 0;
        consecutiveMultipleFaces = 0;
      }
    }, 500);
  }

  /**
   * Setup browser and device monitoring
   */
  const setupBrowserMonitoring = () => {
    // Tab switch detection
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Window focus detection
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Copy-paste detection
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);

    // Developer tools detection
    detectDevTools();

    // Prevent right-click
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /**
   * Handle violation from any service
   */
  const handleViolation = (violation) => {
    setViolations(prev => [...prev, violation]);
    
    // Update integrity score
    const newScore = calculateIntegrityScore([...violations, violation]);
    setIntegrityScore(newScore);

    // Notify parent component
    if (onViolation) {
      onViolation(violation);
    }

    if (onIntegrityUpdate) {
      onIntegrityUpdate(newScore);
    }

    // Send to backend
    sendViolationToBackend(violation);
  }

  /**
   * Calculate integrity score based on violations
   */
  const calculateIntegrityScore = (allViolations) => {
    const faceImpact = faceDetectionService.calculateIntegrityImpact();
    const noiseImpact = noiseDetectionService.calculateIntegrityImpact();
    const browserImpact = tabSwitches * 3;

    const totalImpact = faceImpact + noiseImpact + browserImpact;
    const score = Math.max(0, Math.min(100, 100 - totalImpact));

    return score;
  }

  /**
   * Handle tab/window visibility change
   */
  const handleVisibilityChange = () => {
    if (document.hidden) {
      setTabSwitches(prev => prev + 1);
      
      const violation = {
        type: 'TAB_SWITCH',
        severity: 'LOW',
        timestamp: new Date().toISOString(),
        message: 'Candidate switched tabs or minimized window',
        impactScore: 2 // Reduced from 3
      };

      handleViolation(violation);
    }
  }

  /**
   * Handle window blur (focus lost)
   */
  const handleWindowBlur = () => {
    // Don't create violation for window blur - too sensitive
    // Tab switching is already tracked separately
    console.log('Window lost focus (not creating violation)');
  }

  /**
   * Handle window focus
   */
  const handleWindowFocus = () => {
    console.log('Window regained focus');
  }

  /**
   * Handle copy-paste events
   */
  const handleCopyPaste = (e) => {
    setCopyPasteCount(prev => prev + 1);
    
    const violation = {
      type: 'COPY_PASTE',
      severity: 'LOW',
      timestamp: new Date().toISOString(),
      message: `Copy/Paste detected: ${e.type}`,
      impactScore: 3 // Reduced from 5
    };

    handleViolation(violation);
  }

  /**
   * Detect developer tools — with cooldown to avoid spamming violations
   */
  const detectDevTools = () => {
    const threshold = 160;
    let devToolsLastReported = 0;
    const DEVTOOLS_COOLDOWN_MS = 30000; // Only report once per 30 seconds

    setInterval(() => {
      if (
        window.outerWidth - window.innerWidth > threshold ||
        window.outerHeight - window.innerHeight > threshold
      ) {
        const now = Date.now();
        if (now - devToolsLastReported > DEVTOOLS_COOLDOWN_MS) {
          devToolsLastReported = now;
          const violation = {
            type: 'DEV_TOOLS',
            severity: 'HIGH',
            timestamp: new Date().toISOString(),
            message: 'Developer tools detected',
            impactScore: 10
          };
          handleViolation(violation);
        }
      }
    }, 1000);
  }

  /**
   * Send violation to backend using the API service (with auth header)
   */
  const sendViolationToBackend = async (violation) => {
    if (!sessionId) return;
    try {
      await proctoringAPI.logViolation(sessionId, violation);
    } catch (error) {
      console.error('Failed to send violation:', error);
    }
  }

  /**
   * Cleanup all monitoring
   */
  const cleanup = () => {
    faceDetectionService.stopDetection();
    // noiseDetectionService.stopMonitoring(); // DISABLED
    
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('copy', handleCopyPaste);
    document.removeEventListener('paste', handleCopyPaste);
  }

  return (
    <div 
      ref={panelRef}
      className="fixed z-50 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`
      }}
    >
      {/* Professional Proctoring Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl shadow-2xl overflow-hidden border border-slate-700">
        {/* Draggable Header */}
        <div 
          className="drag-handle bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-3 flex items-center justify-between"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleHeaderMouseDown}
        >
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-white opacity-70" />
            <h3 className="font-semibold text-white text-sm tracking-wide">AI PROCTORING</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMinimize}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded transition-all"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-white/90 font-medium">{isActive ? 'ACTIVE' : 'INACTIVE'}</span>
            </div>
          </div>
        </div>

        {/* Panel Content (collapsible) */}
        {!isMinimized && (
          <div className="p-4 space-y-4">
            {/* Webcam Preview with Professional Frame */}
            <div className="relative rounded-lg overflow-hidden border-2 border-slate-700 shadow-lg">
              <Webcam
                ref={webcamRef}
                audio={false}
                className="w-full"
                mirrored={true}
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: "user"
                }}
              />
              <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="tracking-wider">RECORDING</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                <div className="text-white text-xs font-medium">Live Monitoring Active</div>
              </div>
            </div>

            {/* Professional Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* Face Count */}
              <div className={`backdrop-blur-sm border rounded-lg p-3 hover:bg-slate-800/70 transition-all ${
                faceCount === 1 ? 'bg-green-900/20 border-green-700' : 
                faceCount > 1 ? 'bg-red-900/30 border-red-700 animate-pulse' : 
                'bg-slate-800/50 border-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <Camera className={`w-4 h-4 ${
                    faceCount === 1 ? 'text-green-400' : 
                    faceCount > 1 ? 'text-red-400' : 
                    'text-yellow-400'
                  }`} />
                  <span className={`text-lg font-bold ${
                    faceCount === 1 ? 'text-green-400' : 
                    faceCount > 1 ? 'text-red-400' : 
                    'text-yellow-400'
                  }`}>
                    {faceCount}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {faceCount === 1 ? 'Face ✓' : faceCount > 1 ? 'MULTIPLE!' : 'No Face'}
                </div>
              </div>

              {/* Face Verification Status */}
              <div className={`backdrop-blur-sm border rounded-lg p-3 hover:bg-slate-800/70 transition-all ${
                faceVerified ? 'bg-green-900/20 border-green-700' : 'bg-yellow-900/20 border-yellow-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <Shield className={`w-4 h-4 ${faceVerified ? 'text-green-400' : 'text-yellow-400'}`} />
                  <span className={`text-lg font-bold ${faceVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                    {faceVerified ? '✓' : '...'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {faceVerified ? 'Verified' : 'Verifying'}
                </div>
              </div>

              {/* Integrity Score */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 hover:bg-slate-800/70 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className={`text-lg font-bold ${
                    integrityScore >= 80 ? 'text-green-400' :
                    integrityScore >= 60 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {integrityScore}%
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-medium">Integrity</div>
              </div>

              {/* Violations */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 hover:bg-slate-800/70 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  <span className="text-lg font-bold text-red-400">{violations.length}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium">Violations</div>
              </div>

              {/* Tab Switches */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 hover:bg-slate-800/70 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <Monitor className="w-4 h-4 text-orange-400" />
                  <span className="text-lg font-bold text-orange-400">{tabSwitches}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium">Tab Switches</div>
              </div>

              {/* Copy/Paste Count */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3 hover:bg-slate-800/70 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-lg font-bold text-yellow-400">{copyPasteCount}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium">Copy/Paste</div>
              </div>
              
              {/* Substitution Attempts */}
              {substitutionAttempts > 0 && (
                <div className="bg-red-900/30 backdrop-blur-sm border border-red-700 rounded-lg p-3 hover:bg-red-900/40 transition-all animate-pulse">
                  <div className="flex items-center justify-between mb-1">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-lg font-bold text-red-400">{substitutionAttempts}</span>
                  </div>
                  <div className="text-xs text-red-300 font-medium">Substitutions!</div>
                </div>
              )}
            </div>

            {/* Recent Violations with Professional Styling */}
            {violations.length > 0 && (
              <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-red-400" />
                  RECENT VIOLATIONS
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {violations.slice(-3).reverse().map((v, i) => (
                    <div key={i} className="bg-red-900/20 border border-red-800/30 rounded-md p-2 flex items-start gap-2">
                      <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-red-400 text-xs">{v.type.replace(/_/g, ' ')}</div>
                        <div className="text-slate-400 text-xs truncate">{v.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Professional Warning Banner */}
            <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-700/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-300">Security Notice:</strong> All activities are monitored and recorded for integrity verification.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Professional Resize Handle */}
        <div 
          className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize hover:bg-indigo-500/20 transition-colors group"
          style={{ borderRadius: '0 0 12px 0' }}
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        >
          <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-slate-600 group-hover:border-indigo-400 transition-colors" />
        </div>
      </div>
      
      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>
    </div>
  );
};

export default ProctoringEngine;
