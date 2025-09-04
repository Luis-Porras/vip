//frontend/src/components/VideoReviewDashboard.tsx

"use client"
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Eye, Calendar, Clock, User, Mail, CheckCircle, AlertCircle, Filter, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import UnifiedHeader from './UnifiedHeader';

interface Session {
  id: string;
  templateId: string;
  candidateEmail: string;
  candidateName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string;
  createdAt: string;
  interviewTitle: string;
  interviewDescription: string;
  videosSubmitted: number;
  totalQuestions: number;
}

export default function VideoReviewDashboard() {
  const searchParams = useSearchParams();
  const templateFilter = searchParams?.get('template') || null;
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');

  useEffect(() => {
    fetchSessions();
    // If there's a template filter, fetch the template title
    if (templateFilter) {
      fetchTemplateTitle(templateFilter);
    }
  }, [templateFilter]);
// Add this useEffect:
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (userData) {
    setUser(JSON.parse(userData));
  }
}, []);
  useEffect(() => {
    filterSessions();
  }, [sessions, statusFilter, searchTerm, templateFilter]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      } else {
        setError('Failed to fetch interview sessions');
      }
    } catch (error) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplateTitle = async (templateId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplateTitle(data.title);
      }
    } catch (error) {
      console.error('Failed to fetch template title');
    }
  };

  const filterSessions = () => {
    let filtered = sessions;

    // Filter by template if specified
    if (templateFilter) {
      filtered = filtered.filter(session => session.templateId === templateFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(session => {
        if (statusFilter === 'completed') {
          return session.status === 'completed' || session.videosSubmitted === session.totalQuestions;
        }
        if (statusFilter === 'in_progress') {
          return session.status === 'in_progress' && session.videosSubmitted > 0 && session.videosSubmitted < session.totalQuestions;
        }
        if (statusFilter === 'pending') {
          return session.status === 'pending' || session.videosSubmitted === 0;
        }
        return session.status === statusFilter;
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.interviewTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  };

  const getStatusBadge = (session: Session) => {
    const completed = session.videosSubmitted === session.totalQuestions && session.totalQuestions > 0;
    const inProgress = session.videosSubmitted > 0 && session.videosSubmitted < session.totalQuestions;
    
    if (completed) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </span>
      );
    } else if (inProgress) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          In Progress
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const goBack = () => {
    window.location.href = '/dashboard';
  };

  const clearTemplateFilter = () => {
    window.location.href = '/review';
  };

  const reviewSession = (sessionId: string) => {
    window.location.href = `/review/${sessionId}`;
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
    <UnifiedHeader currentPage="evaluations" user={user} />
    
    {/* Template Filter Indicator */}
    {templateFilter && templateTitle && (
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium inline-flex items-center">
            <Filter className="w-3 h-3 mr-1" />
            Filtered by: {templateTitle}
            <button
              onClick={clearTemplateFilter}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    )}
          

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Candidates
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name, email, or interview title..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            {templateFilter && (
              <div className="flex items-end">
                <button
                  onClick={clearTemplateFilter}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Show All Templates
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Interview Sessions ({filteredSessions.length})
              {templateFilter && templateTitle && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  - {templateTitle}
                </span>
              )}
            </h2>
          </div>

          {error && (
            <div className="p-6 bg-red-50 border-b border-red-200">
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Play className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No interview sessions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {sessions.length === 0 
                  ? "No candidates have started interviews yet."
                  : templateFilter
                  ? "No sessions found for this template. Try adjusting your search criteria."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {templateFilter && (
                <div className="mt-4">
                  <button
                    onClick={clearTemplateFilter}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    View All Sessions
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredSessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {session.candidateName}
                        </h3>
                        {getStatusBadge(session)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2" />
                          {session.candidateEmail}
                        </div>
                        <div className="flex items-center">
                          <Play className="w-4 h-4 mr-2" />
                          {session.interviewTitle}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          Submitted: {formatDate(session.createdAt)}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center text-sm">
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {session.videosSubmitted} / {session.totalQuestions} videos submitted
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => reviewSession(session.id)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        disabled={session.videosSubmitted === 0}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {session.videosSubmitted === 0 ? 'No Videos Yet' : 'Review Videos'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}