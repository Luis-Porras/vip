//frontend/src/components/CandidateInterview.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Play, Ship, Anchor } from 'lucide-react';
import VideoRecorder from './VideoRecorder';

interface Question {
  id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
}

interface Template {
  id: string;
  title: string;
  description: string;
}

interface Session {
  id: string;
  template_id: string;
  candidate_email: string;
  candidate_name: string;
  status: string;
  expires_at: string;
}

interface InterviewData {
  session: Session;
  template: Template;
  questions: Question[];
}

export default function CandidateInterview({ sessionId }: { sessionId: string }) {
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    fetchInterviewData();
  }, [sessionId]);

  // Auto-navigate to first unanswered question after loading data
  useEffect(() => {
    if (interviewData && isStarted) {
      findFirstUnansweredQuestion();
      loadCompletedQuestions();
    }
  }, [interviewData, isStarted]);

  const fetchInterviewData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}`);
      
      if (response.ok) {
        const data = await response.json();
        setInterviewData(data);
        
        // Check if session has expired
        if (new Date() > new Date(data.session.expires_at)) {
          setError('This interview session has expired.');
        }
      } else if (response.status === 404) {
        setError('Interview session not found.');
      } else if (response.status === 410) {
        setError('This interview session has expired.');
      } else {
        setError('Failed to load interview data.');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const startInterview = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/start`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setIsStarted(true);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
    }
  };

  const findFirstUnansweredQuestion = async () => {
    if (!interviewData) return;

    for (let i = 0; i < interviewData.questions.length; i++) {
      const questionId = interviewData.questions[i].id;
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/question/${questionId}/progress`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (!data.isCompleted) {
            setCurrentQuestionIndex(i);
            return; // Stop at first unanswered question
          }
        }
      } catch (error) {
        console.error('Error checking question progress:', error);
      }
    }
    
    // If all questions are completed, check if interview should be marked complete
    if (interviewData.questions.length > 0) {
      completeInterview();
    }
  };

  const loadCompletedQuestions = async () => {
    if (!interviewData) return;

    const completed = new Set<number>();
    
    for (let i = 0; i < interviewData.questions.length; i++) {
      const questionId = interviewData.questions[i].id;
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/question/${questionId}/progress`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.isCompleted) {
            completed.add(i);
          }
        }
      } catch (error) {
        console.error('Error loading question completion:', error);
      }
    }
    
    setCompletedQuestions(completed);
  };

  const handleVideoComplete = (blob: Blob) => {
    // Mark current question as completed
    setCompletedQuestions(prev => new Set(prev).add(currentQuestionIndex));
    
    // TODO: Upload video to backend
    console.log('Video completed for question:', currentQuestionIndex + 1);
    console.log('Video blob size:', blob.size);
  };

  const handleNextQuestion = () => {
    if (!interviewData) return;
    
    if (currentQuestionIndex < interviewData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Interview completed
      completeInterview();
    }
  };

  const completeInterview = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/interviews/session/${sessionId}/complete`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setIsCompleted(true);
      }
    } catch (error) {
      console.error('Failed to complete interview:', error);
    }
  };

  const formatTimeLimit = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs} seconds`;
  };

  const getExpirationTime = () => {
    if (!interviewData) return '';
    const expiry = new Date(interviewData.session.expires_at);
    return expiry.toLocaleDateString() + ' at ' + expiry.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2 tempo-font tracking-tight">
            UNABLE TO LOAD INTERVIEW
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact the recruiter if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
          <h1 className="text-2xl font-bold text-[#052049] mb-4 tempo-font tracking-tight">
            INTERVIEW COMPLETED!
          </h1>
          <p className="text-gray-600 mb-4">
            Thank you for completing your video interview. Your responses have been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            The hiring team will review your responses and get back to you soon.
          </p>
          
          {/* Carnival Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center space-x-4 text-[#052049]/60 text-sm">
              <Ship className="h-4 w-4" />
              <span className="tempo-font tracking-tight">CARNIVAL VIP RECRUITMENT</span>
              <Anchor className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!interviewData) return null;

  const currentQuestion = interviewData.questions[currentQuestionIndex];
  const totalQuestions = interviewData.questions.length;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Carnival-Branded Header */}
      <header className="bg-[#052049] shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Ship className="h-8 w-8 text-white mr-3" />
              <div>
                <h1 className="text-xl font-bold text-white tempo-font tracking-tight">
                  {interviewData.template.title.toUpperCase()}
                </h1>
                <p className="text-sm text-white/80">
                  Welcome, {interviewData.session.candidate_name}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/90 tempo-font font-medium">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </p>
              <p className="text-xs text-white/70">
                Expires: {getExpirationTime()}
              </p>
            </div>
          </div>
          
          {/* Carnival-Branded Progress Bar */}
          <div className="mt-4">
            <div className="bg-white/20 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#DC1125] to-[#10559A] h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/70">
              <span>Start</span>
              <span className="tempo-font font-medium">{Math.round(progress)}% Complete</span>
              <span>Finish</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isStarted ? (
          /* Carnival-Branded Welcome Screen */
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-[#052049] to-[#10559A] text-white p-8 text-center">
              <div className="flex items-center justify-center mb-4">
                <Ship className="h-12 w-12 mr-3" />
                <Anchor className="h-12 w-12" />
              </div>
              <h2 className="text-3xl font-bold tempo-font tracking-tight mb-2">
                WELCOME TO YOUR VIP INTERVIEW
              </h2>
              <p className="text-white/90 text-lg">{interviewData.template.description}</p>
            </div>
            
            {/* Instructions */}
            <div className="p-8">
              <div className="bg-[#10559A]/10 border border-[#10559A]/20 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-bold text-[#052049] mb-4 tempo-font tracking-tight flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-[#10559A]" />
                  BEFORE YOU BEGIN
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-[#DC1125] rounded-full mr-3"></div>
                      Ensure you have a stable internet connection
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-[#DC1125] rounded-full mr-3"></div>
                      Find a quiet, well-lit space
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-[#DC1125] rounded-full mr-3"></div>
                      Allow camera and microphone access
                    </li>
                  </ul>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-[#10559A] rounded-full mr-3"></div>
                      You'll have {totalQuestions} questions to answer
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-[#10559A] rounded-full mr-3"></div>
                      Each question has a specific time limit
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-[#10559A] rounded-full mr-3"></div>
                      You can re-record each answer once
                    </li>
                  </ul>
                </div>
              </div>

              {/* Professional Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="text-center p-4 bg-[#052049]/5 rounded-lg border border-[#052049]/10">
                  <div className="text-2xl font-bold text-[#052049] tempo-font">{totalQuestions}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="text-center p-4 bg-[#DC1125]/5 rounded-lg border border-[#DC1125]/10">
                  <div className="text-2xl font-bold text-[#DC1125] tempo-font">
                    {Math.round(interviewData.questions.reduce((acc, q) => acc + q.time_limit, 0) / 60)}
                  </div>
                  <div className="text-sm text-gray-600">Est. Minutes</div>
                </div>
                <div className="text-center p-4 bg-[#10559A]/5 rounded-lg border border-[#10559A]/10">
                  <div className="text-2xl font-bold text-[#10559A] tempo-font">24</div>
                  <div className="text-sm text-gray-600">Hours to Complete</div>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={startInterview}
                  className="tempo-font inline-flex items-center px-8 py-4 border border-transparent text-lg font-bold rounded-lg text-white bg-gradient-to-r from-[#DC1125] to-[#052049] hover:from-[#052049] hover:to-[#DC1125] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Play className="w-6 h-6 mr-3" />
                  START VIP INTERVIEW
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Interview Questions with Carnival Branding */
          <div className="space-y-6">
            {/* Question Info Card */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-[#10559A] to-[#052049] text-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold tempo-font tracking-tight">
                    QUESTION {currentQuestionIndex + 1}
                  </h2>
                  <div className="flex items-center text-sm bg-white/20 px-3 py-1 rounded-full">
                    <Clock className="w-4 h-4 mr-1" />
                    {formatTimeLimit(currentQuestion.time_limit)} to answer
                  </div>
                </div>
                
                <div className="bg-white/10 border border-white/20 rounded-lg p-4">
                  <p className="text-lg text-white leading-relaxed">{currentQuestion.question_text}</p>
                </div>
              </div>
            </div>

            {/* Video Recorder */}
            <VideoRecorder
              sessionId={sessionId}
              questionId={currentQuestion.id}
              questionText={currentQuestion.question_text}
              timeLimit={currentQuestion.time_limit}
              onRecordingComplete={handleVideoComplete}
              onNext={handleNextQuestion}
            />

            {/* Question Navigation */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[#052049] tempo-font tracking-tight">
                  INTERVIEW PROGRESS
                </h3>
                <span className="text-xs text-gray-500">
                  {completedQuestions.size} of {totalQuestions} completed
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {interviewData.questions.map((_, index) => (
                  <div
                    key={index}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold tempo-font transition-all duration-200 ${
                      completedQuestions.has(index)
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : index === currentQuestionIndex
                        ? 'bg-gradient-to-br from-[#DC1125] to-[#052049] text-white shadow-lg scale-110'
                        : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                    }`}
                  >
                    {completedQuestions.has(index) ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                ))}
              </div>
              
              {/* Progress Summary */}
              <div className="mt-4 p-3 bg-[#10559A]/5 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium text-[#052049] tempo-font">
                    {completedQuestions.size}/{totalQuestions} Questions Complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}