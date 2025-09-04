"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, AlertCircle, CheckCircle, Camera, Mic } from 'lucide-react';

interface VideoRecorderProps {
  sessionId: string;
  questionId: string;
  questionText: string;
  timeLimit: number; // in seconds
  onRecordingComplete: (blob: Blob) => void;
  onNext: () => void;
}

export default function VideoRecorder({ 
  sessionId,
  questionId,
  questionText, 
  timeLimit, 
  onRecordingComplete, 
  onNext 
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Database progress tracking
  const [hasRecorded, setHasRecorded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load progress from database on component mount
  useEffect(() => {
    setRecordedBlob(null);
    setHasRecorded(false);
    setIsCompleted(false);
    setError('');
    setTimeRemaining(timeLimit);
    loadProgress();
    setupCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionId, questionId]);

  const loadProgress = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/question/${questionId}/progress`
      );
      
      if (response.ok) {
        const data = await response.json();
        setIsCompleted(data.isCompleted);
        setHasRecorded(data.isCompleted);
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const setupCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
    } catch (err) {
      setError('Camera access denied. Please allow camera and microphone permissions.');
      console.error('Camera setup error:', err);
    }
  };

  const recordAttempt = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/question/${questionId}/attempt`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        return true;
      } else {
        const data = await response.json();
        setError(data.error || 'Cannot record for this question');
        return false;
      }
    } catch (error) {
      setError('Failed to record attempt');
      return false;
    }
  };

  const startRecording = async () => {
    if (!streamRef.current || isStarting || isRecording) {
      return;
    }

    if (hasRecorded || isCompleted) {
      setError('You have already answered this question');
      return;
    }

    setIsStarting(true);
    setError('');

    try {
      const canRecord = await recordAttempt();
      if (!canRecord) {
        setIsStarting(false);
        return;
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setHasRecorded(true);
        onRecordingComplete(blob);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setTimeRemaining(timeLimit);
      setIsStarting(false);

      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      setError('Failed to start recording');
      setIsStarting(false);
      console.error('Recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSubmit = async () => {
    if (!recordedBlob || isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('video', recordedBlob, `video_${questionId}_${Date.now()}.webm`);
      formData.append('sessionId', sessionId);
      formData.append('questionId', questionId);

      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/video/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Video upload failed');
      }

      const uploadData = await uploadResponse.json();
      console.log('Video uploaded successfully:', uploadData);

      const completeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/question/${questionId}/complete`,
        { method: 'POST' }
      );
      
      if (completeResponse.ok) {
        setIsCompleted(true);
        onNext();
      } else {
        throw new Error('Failed to mark question as completed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoadingProgress) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question progress...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-[#DC1125] to-[#052049] text-white p-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 mr-2" />
              <Mic className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold tempo-font tracking-tight mb-2">
              CAMERA ACCESS REQUIRED
            </h3>
            <p className="text-white/90">
              Please allow camera and microphone access to continue with your interview.
            </p>
          </div>
        </div>
        {error && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Progress Info */}
      {isCompleted && (
        <div className="bg-green-50 border-b border-green-200 p-4">
          <div className="flex items-center text-sm text-green-800">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="font-medium tempo-font">QUESTION COMPLETED</span>
          </div>
        </div>
      )}

      {/* Video Display */}
      <div className="relative">
        <div className="relative bg-black rounded-t-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted={!recordedBlob}
            className="w-full h-64 sm:h-80 object-cover"
            controls={!!recordedBlob}
          />
          
          {/* Recording Indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 bg-[#DC1125] text-white px-4 py-2 rounded-full flex items-center shadow-lg">
              <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
              <span className="font-bold tempo-font text-sm">RECORDING</span>
            </div>
          )}

          {/* Timer */}
          <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full">
            <span className="font-bold tempo-font">{formatTime(timeRemaining)}</span>
          </div>

          {/* Camera Status Overlay */}
          {!isRecording && !recordedBlob && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-80" />
                <p className="tempo-font font-medium">Ready to Record</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {!recordedBlob ? (
            <div className="flex gap-4 justify-center">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!hasPermission || isCompleted || isStarting}
                className={`tempo-font flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-lg ${
                  isRecording
                    ? 'bg-[#DC1125] hover:bg-red-700 text-white'
                    : isCompleted
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : isStarting
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#10559A] to-[#052049] hover:from-[#052049] hover:to-[#10559A] text-white transform hover:-translate-y-0.5'
                }`}
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    STARTING...
                  </>
                ) : isRecording ? (
                  <>
                    <Square className="w-6 h-6" />
                    STOP RECORDING
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    {isCompleted ? 'ALREADY ANSWERED' : 'START RECORDING'}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`tempo-font flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-lg ${
                  isSubmitting 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transform hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    SUBMITTING...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-6 h-6" />
                    SUBMIT & CONTINUE
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-center">
          <div className="bg-[#10559A]/10 border border-[#10559A]/20 rounded-lg p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              You have <span className="font-bold text-[#052049] tempo-font">{Math.floor(timeLimit / 60)} minute{Math.floor(timeLimit / 60) !== 1 ? 's' : ''} and {timeLimit % 60} seconds</span> to answer this question.
              {!recordedBlob && !isCompleted && (
                <span className="block mt-1 text-[#10559A] font-medium">
                  Click "Start Recording" when you're ready to begin.
                </span>
              )}
              {isCompleted && (
                <span className="block mt-1 text-green-600 font-medium tempo-font">
                  ✅ This question has been completed successfully.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}