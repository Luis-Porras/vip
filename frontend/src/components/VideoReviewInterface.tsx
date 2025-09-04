// frontend/src/components/VideoReviewInterface.tsz

"use client"
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Download, Star, Save, MessageSquare, ChevronLeft, ChevronRight, Clock, User, Mail, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

interface Video {
  id: string;
  fileName: string;
  stagePath: string;        // Keep for old videos
  r2Key?: string;          // NEW: Optional for new videos
  r2Url?: string;          // NEW: Optional for new videos  
  fileSize: number;
  uploadStatus: string;
  createdAt: string;
}

interface Question {
  questionId: string;
  questionText: string;
  timeLimit: number;
  questionOrder: number;
  video: Video | null;
}

interface Session {
  id: string;
  templateId: string;
  candidateEmail: string;
  candidateName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  interviewTitle: string;
  interviewDescription: string;
}

interface ReviewData {
  session: Session;
  questions: Question[];
}

interface Evaluation {
  id: string;
  session_id: string;
  question_id: string;
  rating: number | null;
  notes: string;
  evaluated_by: string;
  created_at: string;
  updated_at: string;
}

interface KeywordMatch {
  keyword: string;
  category: string;
  weight: number;
  matchCount: number;
  positions: number[];
}

interface TranscriptData {
  id: string;
  text: string;
  confidence: number;
  wordCount: number;
  processingStatus: string;
  createdAt: string;
}

interface TranscriptResponse {
  transcript: TranscriptData | null;
  keywordMatches: KeywordMatch[];
  totalKeywords: number;
  matchedKeywords: number;
  message?: string;
}

interface KeywordSummary {
  sessionId: string;
  templateTitle: string;
  totalQuestions: number;
  totalKeywords: number;
  overallScore: number | null;
  technicalScore: number | null;
  softSkillsScore: number | null;
  experienceScore: number | null;
  lastCalculated: string | null;
  transcriptionStatus: string;
}

export default function VideoReviewInterface({ sessionId }: { sessionId: string }) {
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Evaluation state
  const [rating, setRating] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [evaluations, setEvaluations] = useState<{[questionId: string]: Evaluation}>({});

  // AI Analysis state
  const [transcriptData, setTranscriptData] = useState<TranscriptResponse | null>(null);
  const [keywordSummary, setKeywordSummary] = useState<KeywordSummary | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    fetchReviewData();
  }, [sessionId]);

  useEffect(() => {
    // Find first question with video when data loads
    if (reviewData && reviewData.questions.length > 0) {
      const firstVideoIndex = reviewData.questions.findIndex(q => q.video !== null);
      if (firstVideoIndex !== -1) {
        setCurrentQuestionIndex(firstVideoIndex);
      }
    }
  }, [reviewData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
    };
  }, [currentQuestionIndex]);

  // Load evaluation when question changes
  useEffect(() => {
    if (reviewData && reviewData.questions[currentQuestionIndex]) {
      loadEvaluationForCurrentQuestion();
    }
  }, [currentQuestionIndex, reviewData]);

  // Load transcript when question changes
  useEffect(() => {
    if (reviewData && reviewData.questions[currentQuestionIndex]) {
      const currentQuestion = reviewData.questions[currentQuestionIndex];
      loadTranscriptData(currentQuestion.questionId);
    }
  }, [currentQuestionIndex, reviewData]);

  // Load keyword summary on mount
  useEffect(() => {
    loadKeywordSummary();
  }, [sessionId]);

  const fetchReviewData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions/${sessionId}/review`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReviewData(data);
        // Load all evaluations for this session
        loadSessionEvaluations();
      } else {
        setError('Failed to load interview data');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessionEvaluations = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions/${sessionId}/evaluations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const evaluationMap: {[questionId: string]: Evaluation} = {};
        data.evaluations.forEach((evaluation: Evaluation) => {
          evaluationMap[evaluation.question_id] = evaluation;
        });
        setEvaluations(evaluationMap);
      }
    } catch (error) {
      console.error('Failed to load evaluations:', error);
    }
  };

  const loadEvaluationForCurrentQuestion = () => {
    const currentQuestion = reviewData?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    const evaluation = evaluations[currentQuestion.questionId];
    if (evaluation) {
      setRating(evaluation.rating || 0);
      setNotes(evaluation.notes || '');
    } else {
      setRating(0);
      setNotes('');
    }
    setSaveMessage('');
  };

  const loadTranscriptData = async (questionId: string) => {
    setIsLoadingTranscript(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions/${sessionId}/questions/${questionId}/transcript`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTranscriptData(data);
      } else {
        console.error('Failed to load transcript data');
        setTranscriptData(null);
      }
    } catch (error) {
      console.error('Error loading transcript:', error);
      setTranscriptData(null);
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const loadKeywordSummary = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions/${sessionId}/keyword-summary`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKeywordSummary(data);
      }
    } catch (error) {
      console.error('Error loading keyword summary:', error);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'soft_skills': return 'bg-green-100 text-green-800 border-green-200';
      case 'experience': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '🔧';
      case 'soft_skills': return '🤝';
      case 'experience': return '💼';
      default: return '📋';
    }
  };

  const saveEvaluation = async () => {
    const currentQuestion = reviewData?.questions[currentQuestionIndex];
    if (!currentQuestion) return;

    setIsSaving(true);
    setSaveMessage('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions/${sessionId}/questions/${currentQuestion.questionId}/evaluation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            rating: rating || null,
            notes: notes.trim()
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update local evaluations state
        setEvaluations(prev => ({
          ...prev,
          [currentQuestion.questionId]: data.evaluation
        }));
        setSaveMessage('Evaluation saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(errorData.error || 'Failed to save evaluation');
      }
    } catch (error) {
      setSaveMessage('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const seekTime = (parseFloat(e.target.value) / 100) * duration;
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const goToQuestion = (index: number) => {
    if (reviewData && index >= 0 && index < reviewData.questions.length) {
      setCurrentQuestionIndex(index);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const downloadVideo = () => {
    const currentQuestion = reviewData?.questions[currentQuestionIndex];
    if (!currentQuestion?.video || !reviewData) return;

    const downloadUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/video/download/${reviewData.session.id}/${currentQuestion.questionId}/${currentQuestion.video.fileName}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = currentQuestion.video.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goBack = () => {
    window.location.href = '/review';
  };

  const hasEvaluation = (questionId: string) => {
    return evaluations[questionId] !== undefined;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !reviewData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load review data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={goBack}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = reviewData.questions[currentQuestionIndex];
  const hasVideo = currentQuestion?.video !== null;
  const videosWithContent = reviewData.questions.filter(q => q.video !== null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={goBack}
                className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back to Review
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Video Review</h1>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{reviewData.session.candidateName}</div>
              <div className="text-xs text-gray-500">{reviewData.session.interviewTitle}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              {/* Question Header */}
              <div className="px-6 py-4 bg-blue-50 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Question {currentQuestion.questionOrder}
                  </h2>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-1" />
                    {Math.floor(currentQuestion.timeLimit / 60)}:{(currentQuestion.timeLimit % 60).toString().padStart(2, '0')} limit
                  </div>
                </div>
                <p className="mt-2 text-gray-700">{currentQuestion.questionText}</p>
              </div>

              {/* Video Player */}
              <div className="relative bg-black">
                {hasVideo ? (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-96 object-contain"
                      src={currentQuestion.video?.r2Url || `${process.env.NEXT_PUBLIC_API_URL}/api/video/download/${reviewData.session.id}/${currentQuestion.questionId}/${currentQuestion.video!.fileName}`}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                    
                    {/* Video Controls */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={togglePlayPause}
                          className="text-white hover:text-blue-300"
                        >
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>
                        
                        <div className="flex-1">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={duration > 0 ? (currentTime / duration) * 100 : 0}
                            onChange={handleSeek}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        
                        <span className="text-white text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        
                        <button
                          onClick={toggleMute}
                          className="text-white hover:text-blue-300"
                        >
                          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                        
                        <button
                          onClick={downloadVideo}
                          className="text-white hover:text-blue-300"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-96 text-gray-400">
                    <div className="text-center">
                      <Play className="w-12 h-12 mx-auto mb-4" />
                      <p className="text-lg">No video response for this question</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    {currentQuestionIndex + 1} of {reviewData.questions.length} questions
                  </span>
                  
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === reviewData.questions.length - 1}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Candidate Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Candidate Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-900">{reviewData.session.candidateName}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">{reviewData.session.candidateEmail}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-sm text-gray-600">
                    Completed: {new Date(reviewData.session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Question Navigation */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Questions</h3>
              <div className="space-y-2">
                {reviewData.questions.map((question, index) => (
                  <button
                    key={question.questionId}
                    onClick={() => goToQuestion(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      index === currentQuestionIndex
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Q{question.questionOrder}</span>
                      <div className="flex items-center space-x-1">
                        {question.video ? (
                          <Play className="w-4 h-4 text-green-600" />
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 rounded-full" />
                        )}
                        {hasEvaluation(question.questionId) && (
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate">
                      {question.questionText}
                    </p>
                  </button>
                ))}
              </div>
            </div>
{/* AI Analysis Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">AI Analysis</h3>
              
              {/* Overall Scores */}
              {keywordSummary && (
                <div className="mb-4">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {keywordSummary.overallScore !== null && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(keywordSummary.overallScore)}%
                        </div>
                        <div className="text-xs text-blue-600">Overall</div>
                      </div>
                    )}
                    {keywordSummary.technicalScore !== null && (
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {Math.round(keywordSummary.technicalScore)}%
                        </div>
                        <div className="text-xs text-purple-600">Technical</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {keywordSummary.softSkillsScore !== null && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(keywordSummary.softSkillsScore)}%
                        </div>
                        <div className="text-xs text-green-600">Soft Skills</div>
                      </div>
                    )}
                    {keywordSummary.experienceScore !== null && (
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {Math.round(keywordSummary.experienceScore)}%
                        </div>
                        <div className="text-xs text-yellow-600">Experience</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Keywords Found */}
              {transcriptData && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-700">Keywords Found</h4>
                    <span className="text-xs text-gray-500">
                      {transcriptData.matchedKeywords} of {transcriptData.totalKeywords}
                    </span>
                  </div>
                  
                  {transcriptData.keywordMatches.length > 0 ? (
                    <div className="space-y-2">
                      {transcriptData.keywordMatches.map((match, index) => (
                        <div key={index} className={`flex items-center justify-between p-2 rounded-lg border ${getCategoryColor(match.category)}`}>
                          <div className="flex items-center">
                            <span className="mr-2">{getCategoryIcon(match.category)}</span>
                            <span className="text-sm font-medium">{match.keyword}</span>
                            {match.weight > 1 && (
                              <span className="ml-1 text-xs">({match.weight}x)</span>
                            )}
                          </div>
                          <span className="text-xs bg-white bg-opacity-50 px-2 py-1 rounded-full">
                            {match.matchCount}x
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <span className="text-sm">No keywords found in this response</span>
                    </div>
                  )}
                </div>
              )}

              {/* Transcript Toggle */}
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full text-left text-sm font-medium text-blue-600 hover:text-blue-800 mb-2"
              >
                {showTranscript ? '↑ Hide Transcript' : '↓ Show Transcript'}
              </button>

              {/* Transcript Display */}
              {showTranscript && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  {isLoadingTranscript ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <span className="text-xs text-gray-500">Loading transcript...</span>
                    </div>
                  ) : transcriptData?.transcript ? (
                    <div>
                      <div className="text-xs text-gray-500 mb-2 flex justify-between">
                        <span>Confidence: {Math.round((transcriptData.transcript.confidence || 0) * 100)}%</span>
                        <span>{transcriptData.transcript.wordCount} words</span>
                      </div>
                      <div className="text-sm text-gray-800 leading-relaxed">
                        {transcriptData.transcript.text || 'No transcript available'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <span className="text-sm">
                        {transcriptData?.message || 'Transcript not available'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating & Notes */}
            {hasVideo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Evaluation</h3>
                
                {/* Star Rating */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className={`${
                          star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        } hover:text-yellow-400 transition-colors`}
                      >
                        <Star className="w-6 h-6 fill-current" />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{rating} out of 5 stars</p>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add your evaluation notes..."
                  />
                </div>

                {/* Save Message */}
                {saveMessage && (
                  <div className={`mb-4 p-3 rounded-md text-sm ${
                    saveMessage.includes('success') 
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {saveMessage}
                  </div>
                )}

                {/* Save Button */}
                <button 
                  onClick={saveEvaluation}
                  disabled={isSaving}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {hasEvaluation(currentQuestion.questionId) ? 'Update Evaluation' : 'Save Evaluation'}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Interview Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Interview Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Questions:</span>
                  <span className="font-medium">{reviewData.questions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Videos Submitted:</span>
                  <span className="font-medium text-green-600">{videosWithContent.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completion Rate:</span>
                  <span className="font-medium">
                    {Math.round((videosWithContent.length / reviewData.questions.length) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Evaluations:</span>
                  <span className="font-medium text-blue-600">
                    {Object.keys(evaluations).length} of {videosWithContent.length}
                  </span>
                </div>
                {keywordSummary && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Score:</span>
                    <span className="font-medium text-purple-600">
                      {keywordSummary.overallScore !== null ? `${Math.round(keywordSummary.overallScore)}%` : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
