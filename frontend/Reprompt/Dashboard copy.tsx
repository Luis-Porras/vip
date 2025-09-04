"use client"
import React, { useState, useEffect } from 'react';
import { Plus, Users, Video, Settings, LogOut, Eye, Calendar, Clock, Search, Filter, ChevronRight, Play, Star, Tag, Mail, User, ArrowLeft } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Template {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_active: boolean;
}

interface TemplateDetail extends Template {
  questions: Question[];
  keywords: Keyword[];
  sessions: SessionSummary[];
}

interface Question {
  id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
}

interface Keyword {
  id: string;
  keyword: string;
  category: string;
  weight: number;
}

interface SessionSummary {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: string;
  videosSubmitted: number;
  totalQuestions: number;
  createdAt: string;
  interviewTitle: string;
  templateId: string;
  sessionId: string;
  averageRating: number | null;
}

type DashboardView = 'templates' | 'candidates' | 'completed';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [currentView, setCurrentView] = useState<DashboardView>('templates');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Send to candidate modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchTemplates();
    fetchAllSessions();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Fetching templates with token:', token ? 'exists' : 'missing');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Templates response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Templates data received:', data);
        setTemplates(data);
        // Auto-select first template only if we're on templates view
        if (data.length > 0 && currentView === 'templates') {
          selectTemplate(data[0].id);
        }
      } else {
        const errorData = await response.json();
        console.error('Templates fetch error:', errorData);
        setError(`Failed to fetch templates: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error('Templates network error:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      console.log('Fetching sessions with token:', token ? 'exists' : 'missing');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Sessions response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Sessions data received:', data);
        const sessionData = data.map((session: any) => ({
          id: session.id,
          candidateName: session.candidateName,
          candidateEmail: session.candidateEmail,
          status: session.status,
          videosSubmitted: session.videosSubmitted || 0,
          totalQuestions: session.totalQuestions || 0,
          createdAt: session.createdAt,
          interviewTitle: session.interviewTitle,
          templateId: session.templateId,
          sessionId: session.id,
          averageRating: null // You can fetch this separately if needed
        }));
        setAllSessions(sessionData);
        console.log('Processed sessions:', sessionData);
      } else {
        const errorData = await response.json();
        console.error('Sessions fetch error:', errorData);
      }
    } catch (error) {
      console.error('Sessions network error:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const selectTemplate = async (templateId: string) => {
    if (selectedTemplate?.id === templateId) return;
    
    setIsLoadingDetail(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch template details
      const templateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // Fetch keywords
      const keywordsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}/keywords`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      // Fetch sessions for this template
      const sessionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        const keywordsData = keywordsResponse.ok ? await keywordsResponse.json() : { keywords: [] };
        const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : [];
        
        // Filter sessions for this template
        const templateSessions = sessionsData.filter((session: any) => 
          session.templateId === templateId
        ).map((session: any) => ({
          id: session.id,
          candidateName: session.candidateName,
          candidateEmail: session.candidateEmail,
          status: session.status,
          videosSubmitted: session.videosSubmitted || 0,
          totalQuestions: session.totalQuestions || 0,
          createdAt: session.createdAt
        }));

        setSelectedTemplate({
          ...templateData,
          keywords: keywordsData.keywords || [],
          sessions: templateSessions
        });
      }
    } catch (error) {
      console.error('Failed to fetch template details:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const handleSendToCandidate = () => {
    setShowSendModal(true);
    setCandidateEmail('');
    setCandidateName('');
    setSendError('');
    setSendSuccess('');
  };

  const handleSendInterview = async () => {
    if (!selectedTemplate) return;

    setSendError('');
    setSendSuccess('');

    if (!candidateEmail.trim() || !candidateName.trim()) {
      setSendError('Please enter both candidate name and email');
      return;
    }

    setIsSending(true);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${selectedTemplate.id}/sessions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            candidateEmail: candidateEmail.trim(),
            candidateName: candidateName.trim(),
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const emailStatus = data.emailSent ? 
          'Interview invitation sent successfully via email!' : 
          'Session created but email failed to send. Please send the link manually.';
      
        setSendSuccess(`${emailStatus}\n\nInterview Link: ${data.interviewLink}`);

        setCandidateEmail('');
        setCandidateName('');
        
        // Refresh template sessions
        setTimeout(() => {
          setShowSendModal(false);
          setSendSuccess('');
          selectTemplate(selectedTemplate.id);
        }, 3000);
      } else {
        setSendError(data.error || 'Failed to send interview');
      }
    } catch (error) {
      setSendError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsSending(false);
    }
  };

  const closeSendModal = () => {
    setShowSendModal(false);
    setCandidateEmail('');
    setCandidateName('');
    setSendError('');
    setSendSuccess('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getStatusBadge = (session: SessionSummary) => {
    const completed = session.videosSubmitted === session.totalQuestions && session.totalQuestions > 0;
    const inProgress = session.videosSubmitted > 0 && session.videosSubmitted < session.totalQuestions;
    
    if (completed) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>;
    } else if (inProgress) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">In Progress</span>;
    } else {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Pending</span>;
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && template.is_active) ||
                         (statusFilter === 'inactive' && !template.is_active);
    return matchesSearch && matchesStatus;
  });

  const renderStarRating = (rating: number | null) => {
    if (rating === null) {
      return <span className="text-gray-400 text-sm">Not rated</span>;
    }
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">({rating.toFixed(1)})</span>
      </div>
    );
  };

  // Candidates View Component
  const CandidatesView = () => (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          All Candidates ({allSessions.length})
        </h2>
      </div>
      
      {allSessions.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Candidates will appear here once you send them interview invitations.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interview Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {allSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                      <div className="text-sm text-gray-500">{session.candidateEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(session)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(session.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{session.interviewTitle}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {session.videosSubmitted}/{session.totalQuestions} videos
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => window.location.href = `/review/${session.sessionId}`}
                      className="text-blue-600 hover:text-blue-900"
                      disabled={session.videosSubmitted === 0}
                    >
                      {session.videosSubmitted > 0 ? 'Review' : 'No videos'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Completed View Component
  const CompletedView = () => {
    const completedSessions = allSessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0);
    
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Completed Interviews ({completedSessions.length})
          </h2>
        </div>
        
        {completedSessions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No completed interviews</h3>
            <p className="mt-1 text-sm text-gray-500">
              Completed interviews will appear here once candidates finish all questions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Videos</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                        <div className="text-sm text-gray-500">{session.candidateEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(session.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStarRating(session.averageRating)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.interviewTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {session.videosSubmitted}/{session.totalQuestions}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => window.location.href = `/review/${session.sessionId}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Video className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Interview Manager</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/review'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
              >
                <Eye className="h-4 w-4 mr-2" />
                Review Videos
              </button>
              <button 
                onClick={() => window.location.href = '/create-template'}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </button>
              
              <div className="text-sm text-gray-700">
                Welcome, {user?.first_name} {user?.last_name}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setCurrentView('templates')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Templates ({templates.length})
            </button>
            <button
              onClick={() => setCurrentView('candidates')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'candidates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Candidates ({allSessions.length})
            </button>
            <button
              onClick={() => setCurrentView('completed')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                currentView === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed ({allSessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0).length})
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setError('');
                      setIsLoading(true);
                      fetchTemplates();
                      fetchAllSessions();
                    }}
                    className="text-sm bg-red-100 text-red-800 rounded-md px-2 py-1 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'templates' && (
          <div className="flex h-[calc(100vh-220px)]">
            {/* Left Sidebar - Template List */}
            <div className="w-1/3 bg-white rounded-l-lg shadow border-r border-gray-200 flex flex-col">
              {/* Template List Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Position Templates</h2>
                  <span className="text-sm text-gray-500">({templates.length})</span>
                </div>
                
                {/* Search and Filter */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Filter by template name..."
                    />
                  </div>
                  
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Templates</option>
                    <option value="active">Published Templates</option>
                    <option value="inactive">Draft Templates</option>
                  </select>
                </div>
              </div>

              {/* Template List */}
              <div className="flex-1 overflow-y-auto">
                {filteredTemplates.length === 0 ? (
                  <div className="p-6 text-center">
                    <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No templates found</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {templates.length === 0 
                        ? "Get started by creating your first interview template."
                        : "Try adjusting your search or filter criteria."
                      }
                    </p>
                    <button 
                      onClick={() => window.location.href = '/create-template'}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Template
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template.id)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                            {template.title}
                          </h3>
                          <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(template.created_at)}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            template.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {template.is_active ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Template Details */}
            <div className="flex-1 bg-white rounded-r-lg shadow">
              {!selectedTemplate ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Video className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Template</h3>
                    <p className="text-gray-500">Choose a template from the list to view details</p>
                  </div>
                </div>
              ) : isLoadingDetail ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  {/* Template Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h1 className="text-2xl font-bold text-gray-900 mr-3">
                            {selectedTemplate.title}
                          </h1>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedTemplate.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {selectedTemplate.is_active ? 'Published' : 'Draft'}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                        
                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Created {formatDate(selectedTemplate.created_at)}
                          </div>
                          <div className="flex items-center">
                            <Play className="h-4 w-4 mr-1" />
                            Template ID: {selectedTemplate.id.substring(0, 8)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        <button
                          onClick={() => window.location.href = `/edit-template/${selectedTemplate.id}`}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Edit Template
                        </button>
                        <button
                          onClick={handleSendToCandidate}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Send to Candidate
                        </button>
                        <button
                          onClick={() => window.location.href = `/review?template=${selectedTemplate.id}`}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review Responses
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{selectedTemplate.questions.length}</div>
                        <div className="text-sm text-gray-600">Total Questions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{selectedTemplate.sessions.length}</div>
                        <div className="text-sm text-gray-600">Total Candidates</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-600">
                          {selectedTemplate.sessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Completed Interviews</div>
                      </div>
                    </div>
                  </div>

                  {/* Content Sections */}
                  <div className="p-6">
                    <div className="space-y-6">
                      {/* Questions Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Interview Questions ({selectedTemplate.questions.length})
                        </h3>
                        {selectedTemplate.questions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No questions configured for this template</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedTemplate.questions.map((question) => (
                              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    Question {question.question_order}
                                  </h4>
                                  <div className="flex items-center text-xs text-gray-500">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {Math.floor(question.time_limit / 60)}:{(question.time_limit % 60).toString().padStart(2, '0')}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-700">{question.question_text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Keywords Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          AI Keywords ({selectedTemplate.keywords.length})
                        </h3>
                        {selectedTemplate.keywords.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Tag className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>No keywords configured for AI analysis</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {Object.entries(
                              selectedTemplate.keywords.reduce((acc, keyword) => {
                                if (!acc[keyword.category]) {
                                  acc[keyword.category] = [];
                                }
                                acc[keyword.category].push(keyword);
                                return acc;
                              }, {} as Record<string, Keyword[]>)
                            ).map(([category, categoryKeywords]) => (
                              <div key={category} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                                  <span className="mr-2">{getCategoryIcon(category)}</span>
                                  {category.replace('_', ' ').toUpperCase()} ({categoryKeywords.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {categoryKeywords.map((keyword) => (
                                    <span
                                      key={keyword.id}
                                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getCategoryColor(keyword.category)}`}
                                    >
                                      {keyword.keyword}
                                      {keyword.weight > 1 && (
                                        <span className="ml-1 flex items-center">
                                          <Star className="w-3 h-3 ml-1" />
                                          {keyword.weight}x
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Recent Sessions */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          Recent Candidates ({selectedTemplate.sessions.length})
                        </h3>
                        {selectedTemplate.sessions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p>No candidates have been invited yet</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedTemplate.sessions.slice(0, 5).map((session) => (
                              <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                                    <div className="text-xs text-gray-500">{session.candidateEmail}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="text-xs text-gray-500">
                                    {session.videosSubmitted}/{session.totalQuestions} videos
                                  </div>
                                  {getStatusBadge(session)}
                                  <button
                                    onClick={() => window.location.href = `/review/${session.id}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                    disabled={session.videosSubmitted === 0}
                                  >
                                    {session.videosSubmitted > 0 ? 'Review' : 'Pending'}
                                  </button>
                                </div>
                              </div>
                            ))}
                            {selectedTemplate.sessions.length > 5 && (
                              <button
                                onClick={() => window.location.href = `/review?template=${selectedTemplate.id}`}
                                className="w-full text-center py-2 text-sm text-blue-600 hover:text-blue-800"
                              >
                                View all {selectedTemplate.sessions.length} candidates →
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'candidates' && <CandidatesView />}
        {currentView === 'completed' && <CompletedView />}
      </div>

      {/* Send to Candidate Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Send Interview to Candidate</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter candidate's full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="candidate@email.com"
                  />
                </div>

                {sendError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <span className="text-sm text-red-700">{sendError}</span>
                  </div>
                )}

                {sendSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <div className="text-sm text-green-700">
                      {sendSuccess.split('\n\n').map((line, index) => (
                        <div key={index} className={index === 0 ? 'font-medium mb-2' : 'text-xs break-all'}>
                          {line.replace('Interview Link: ', '')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={closeSendModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInterview}
                    disabled={isSending || !!sendSuccess}
                    className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                        Sending...
                      </>
                    ) : sendSuccess ? (
                      'Sent!'
                    ) : (
                      'Send Interview'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}