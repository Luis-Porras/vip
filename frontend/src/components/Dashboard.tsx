// frontend/src/components/Dashboard.tsx
"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, Video, Settings, LogOut, Eye, Calendar, Clock, User, Mail, CheckCircle, AlertCircle, Filter, X, ChevronDown, ChevronUp, Search, Tag, Star, Play, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, AlertTriangle } from 'lucide-react';
import { MapPin, /* your existing imports */ } from 'lucide-react';
import UnifiedHeader from './UnifiedHeader';


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
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [currentView, setCurrentView] = useState<DashboardView>('templates');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  
  // Enhanced filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state
  const [candidatesSort, setCandidatesSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [completedSort, setCompletedSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Pagination state
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const itemsPerPage = 10;
  
  // Send to candidate modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
        if (data.length > 0 && currentView === 'templates') {
          selectTemplate(data[0].id);
        }
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch templates: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
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
          averageRating: null
        }));
        setAllSessions(sessionData);
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
      
      const templateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const keywordsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}/keywords`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const sessionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        const keywordsData = keywordsResponse.ok ? await keywordsResponse.json() : { keywords: [] };
        const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : [];
        
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

  // Sorting functions
  const handleSort = (key: string, view: 'candidates' | 'completed') => {
    const currentSort = view === 'candidates' ? candidatesSort : completedSort;
    const setSort = view === 'candidates' ? setCandidatesSort : setCompletedSort;
    
    let direction: SortDirection = 'asc';
    if (currentSort.key === key) {
      if (currentSort.direction === 'asc') direction = 'desc';
      else if (currentSort.direction === 'desc') direction = null;
      else direction = 'asc';
    }
    
    setSort({ key, direction });
    
    // Reset pagination when sorting changes
    if (view === 'candidates') setCandidatesPage(1);
    else setCompletedPage(1);
  };

  const getSortIcon = (key: string, currentSort: SortConfig) => {
    if (currentSort.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (currentSort.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-blue-600" />;
    }
    if (currentSort.direction === 'desc') {
      return <ChevronDown className="w-4 h-4 text-blue-600" />;
    }
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  };

  // Filtering and sorting logic
  const getFilteredAndSortedSessions = (view: 'candidates' | 'completed') => {
    let filtered = view === 'candidates' ? allSessions : 
      allSessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0);

    // Apply filters
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

    // Template filter
    if (templateFilter !== 'all') {
      filtered = filtered.filter(session => session.templateId === templateFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.interviewTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange.startDate) {
      filtered = filtered.filter(session => 
        new Date(session.createdAt) >= new Date(dateRange.startDate)
      );
    }
    if (dateRange.endDate) {
      filtered = filtered.filter(session => 
        new Date(session.createdAt) <= new Date(dateRange.endDate + 'T23:59:59')
      );
    }

    // Apply sorting
    const currentSort = view === 'candidates' ? candidatesSort : completedSort;
    if (currentSort.direction) {
      filtered.sort((a, b) => {
        let aValue: any = a[currentSort.key as keyof SessionSummary];
        let bValue: any = b[currentSort.key as keyof SessionSummary];

        // Handle different data types
        if (currentSort.key === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (currentSort.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  };

  // Pagination logic
  const getPaginatedData = (data: SessionSummary[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / itemsPerPage),
      totalItems: data.length
    };
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTemplateFilter('all');
    setDateRange({ startDate: '', endDate: '' });
    setCandidatesPage(1);
    setCompletedPage(1);
  };

  // Get unique templates for filter dropdown
  const uniqueTemplates = Array.from(
    new Map(allSessions.map(session => [session.templateId, session])).values()
  );

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

  const handleDeleteTemplate = () => {
  setShowDeleteModal(true);
  setDeleteConfirmText('');
  setDeleteError('');
};

const confirmDeleteTemplate = async () => {
  if (!selectedTemplate) return;

  if (deleteConfirmText.toLowerCase() !== 'delete template') {
    setDeleteError('Please type "delete template" exactly to confirm');
    return;
  }

  setIsDeleting(true);
  setDeleteError('');

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${selectedTemplate.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
      setSelectedTemplate(null);
      setShowDeleteModal(false);
      console.log('Template deleted successfully');
    } else {
      const errorData = await response.json();
      setDeleteError(errorData.error || 'Failed to delete template');
    }
  } catch (error) {
    setDeleteError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`);
  } finally {
    setIsDeleting(false);
  }
};

const closeDeleteModal = () => {
  setShowDeleteModal(false);
  setDeleteConfirmText('');
  setDeleteError('');
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
 
  // Enhanced Filter Bar Component with Apply Button
  const FilterBar = ({ view }: { view: 'candidates' | 'completed' }) => {
    // Local state for pending filter changes (before apply)
    const [pendingSearchTerm, setPendingSearchTerm] = useState(searchTerm);
    const [pendingStatusFilter, setPendingStatusFilter] = useState(statusFilter);
    const [pendingTemplateFilter, setPendingTemplateFilter] = useState(templateFilter);
    const [pendingDateRange, setPendingDateRange] = useState(dateRange);

    // Apply filters function
    const applyFilters = () => {
      setSearchTerm(pendingSearchTerm);
      setStatusFilter(pendingStatusFilter);
      setTemplateFilter(pendingTemplateFilter);
      setDateRange(pendingDateRange);
      // Reset pagination when filters change
      if (view === 'candidates') setCandidatesPage(1);
      else setCompletedPage(1);
    };

    // Clear filters function
    const clearAllFilters = () => {
      setPendingSearchTerm('');
      setPendingStatusFilter('all');
      setPendingTemplateFilter('all');
      setPendingDateRange({ startDate: '', endDate: '' });
      setSearchTerm('');
      setStatusFilter('all');
      setTemplateFilter('all');
      setDateRange({ startDate: '', endDate: '' });
      setCandidatesPage(1);
      setCompletedPage(1);
    };

    // Check if there are pending changes
    const hasPendingChanges = 
      pendingSearchTerm !== searchTerm ||
      pendingStatusFilter !== statusFilter ||
      pendingTemplateFilter !== templateFilter ||
      pendingDateRange.startDate !== dateRange.startDate ||
      pendingDateRange.endDate !== dateRange.endDate;

    // Handle Enter key press in search input
    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        applyFilters();
      }
    };
  const handleDeleteTemplate = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText('');
    setDeleteError('');
  };

  const confirmDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    if (deleteConfirmText.toLowerCase() !== 'delete template') {
      setDeleteError('Please type "delete template" exactly to confirm');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${selectedTemplate.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Remove template from local state
        setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
        setSelectedTemplate(null);
        setShowDeleteModal(false);
        
        // Show success message or toast here if you want
        console.log('Template deleted successfully');
      } else {
        const errorData = await response.json();
        setDeleteError(errorData.error || 'Failed to delete template');
      }
    } catch (error) {
      setDeleteError(`Network error: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteConfirmText('');
    setDeleteError('');
  };

    return (
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 bg-[#10559A]">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-medium text-white tempo-font">Filters & Search</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              {(searchTerm || statusFilter !== 'all' || templateFilter !== 'all' || dateRange.startDate || dateRange.endDate) && (
                <button
                  onClick={clearAllFilters}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={`transition-all duration-200 ${showFilters ? 'block' : 'hidden'}`}>
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Candidates
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={pendingSearchTerm}
                  onChange={(e) => setPendingSearchTerm(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search by name, email, or interview title... (Press Enter or Apply)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={pendingStatusFilter}
                  onChange={(e) => setPendingStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Template Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interview Template
                </label>
                <select
                  value={pendingTemplateFilter}
                  onChange={(e) => setPendingTemplateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Templates</option>
                  {uniqueTemplates.map((session) => (
                    <option key={session.templateId} value={session.templateId}>
                      {session.interviewTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={pendingDateRange.startDate}
                  onChange={(e) => setPendingDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={pendingDateRange.endDate}
                  onChange={(e) => setPendingDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Apply/Clear Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                {hasPendingChanges && (
                  <span className="text-amber-600 font-medium">
                    ⚠️ You have unsaved filter changes
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setPendingSearchTerm(searchTerm);
                    setPendingStatusFilter(statusFilter);
                    setPendingTemplateFilter(templateFilter);
                    setPendingDateRange(dateRange);
                  }}
                  disabled={!hasPendingChanges}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={applyFilters}
                  disabled={!hasPendingChanges}
                  className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white ${
                    hasPendingChanges 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Pagination Component
  const Pagination = ({ 
    currentPage, 
    totalPages, 
    totalItems, 
    onPageChange,
    itemsPerPage 
  }: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
  }) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startItem}</span> to{' '}
              <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{totalItems}</span> results
            </p>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (totalPages <= 7 || page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => onPageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      ...
                    </span>
                  );
                }
                return null;
              })}
              
              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  // Sortable Table Header Component
  const SortableHeader = ({ 
    label, 
    sortKey, 
    currentSort, 
    onSort 
  }: { 
    label: string; 
    sortKey: string; 
    currentSort: SortConfig; 
    onSort: (key: string) => void; 
  }) => (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors">
      <button
        onClick={() => onSort(sortKey)}
        className="flex items-center space-x-1 w-full text-left"
      >
        <span>{label}</span>
        {getSortIcon(sortKey, currentSort)}
      </button>
    </th>
  );
  // Candidates View Component
  const CandidatesView = () => {
    const filteredSessions = getFilteredAndSortedSessions('candidates');
    const paginatedData = getPaginatedData(filteredSessions, candidatesPage);

    return (
      <div>
        <FilterBar view="candidates" />
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-medium text-gray-900 tempo-font">
              All Candidates ({filteredSessions.length})
            </h2>
          </div>
          
          {paginatedData.data.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No candidates found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filteredSessions.length === 0 && allSessions.length === 0 
                  ? "No candidates have been invited yet."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableHeader 
                        label="Candidate" 
                        sortKey="candidateName" 
                        currentSort={candidatesSort} 
                        onSort={(key) => handleSort(key, 'candidates')} 
                      />
                      <SortableHeader 
                        label="Status" 
                        sortKey="status" 
                        currentSort={candidatesSort} 
                        onSort={(key) => handleSort(key, 'candidates')} 
                      />
                      <SortableHeader 
                        label="Interview Date" 
                        sortKey="createdAt" 
                        currentSort={candidatesSort} 
                        onSort={(key) => handleSort(key, 'candidates')} 
                      />
                      <SortableHeader 
                        label="Position" 
                        sortKey="interviewTitle" 
                        currentSort={candidatesSort} 
                        onSort={(key) => handleSort(key, 'candidates')} 
                      />
                      <SortableHeader 
                        label="Progress" 
                        sortKey="videosSubmitted" 
                        currentSort={candidatesSort} 
                        onSort={(key) => handleSort(key, 'candidates')} 
                      />
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.data.map((session) => (
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
              
              <Pagination
                currentPage={candidatesPage}
                totalPages={paginatedData.totalPages}
                totalItems={paginatedData.totalItems}
                onPageChange={setCandidatesPage}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  // Completed View Component
  const CompletedView = () => {
    const filteredSessions = getFilteredAndSortedSessions('completed');
    const paginatedData = getPaginatedData(filteredSessions, completedPage);
    
    return (
      <div>
        <FilterBar view="completed" />
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-medium text-gray-900 tempo-font">
              Completed Interviews ({filteredSessions.length})
            </h2>
          </div>
          
          {paginatedData.data.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No completed interviews found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filteredSessions.length === 0 && allSessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0).length === 0
                  ? "No interviews have been completed yet."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableHeader 
                        label="Candidate" 
                        sortKey="candidateName" 
                        currentSort={completedSort} 
                        onSort={(key) => handleSort(key, 'completed')} 
                      />
                      <SortableHeader 
                        label="Completed Date" 
                        sortKey="createdAt" 
                        currentSort={completedSort} 
                        onSort={(key) => handleSort(key, 'completed')} 
                      />
                      <SortableHeader 
                        label="Rating" 
                        sortKey="averageRating" 
                        currentSort={completedSort} 
                        onSort={(key) => handleSort(key, 'completed')} 
                      />
                      <SortableHeader 
                        label="Position" 
                        sortKey="interviewTitle" 
                        currentSort={completedSort} 
                        onSort={(key) => handleSort(key, 'completed')} 
                      />
                      <SortableHeader 
                        label="Videos" 
                        sortKey="videosSubmitted" 
                        currentSort={completedSort} 
                        onSort={(key) => handleSort(key, 'completed')} 
                      />
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.data.map((session) => (
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
              
              <Pagination
                currentPage={completedPage}
                totalPages={paginatedData.totalPages}
                totalItems={paginatedData.totalItems}
                onPageChange={setCompletedPage}
                itemsPerPage={itemsPerPage}
              />
            </>
          )}
        </div>
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

   <UnifiedHeader currentPage="templates" user={user} />

  

    {/* Main Content */}
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Sidebar - SOLID RED HEADER (no gradient) */}
          <div className="lg:col-span-4 bg-white rounded-lg shadow border-r border-gray-200 flex flex-col">
            {/* Template List Header - SOLID RED */}
            <div className="p-6 border-b border-gray-200 bg-[#10559A]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                  POSITION TEMPLATES
                </h2>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-white bg-white/20 px-3 py-1 rounded-full font-medium">
                    {templates.length}
                  </span>
                  {/* CREATE TEMPLATE BUTTON - ADDED HERE */}
                  <button
                    onClick={() => window.location.href = '/create-template'}
                    className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-xs font-bold rounded-md text-white bg-[#DC1125] hover:bg-white/20 transition-colors"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    CREATE
                  </button>
                </div>
              </div>
              
              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white/50 bg-white text-gray-900 placeholder-gray-500"
                  placeholder="Search templates..."
                />
              </div>

              {/* Status Filter Section */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center tempo-font tracking-tight">
                    <Filter className="h-4 w-4 mr-2" />
                    FILTERS
                  </h3>
                  
                  {/* Status Filter Options */}
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="templateStatus"
                        value="all"
                        checked={statusFilter === 'all'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-4 w-4 text-white focus:ring-white/50 border-white/30 bg-white/10"
                      />
                      <span className="ml-3 text-sm text-white flex items-center justify-between w-full group-hover:text-white/90">
                        <span>All Templates</span>
                        <span className="text-xs text-white bg-white/20 px-2 py-1 rounded-full">
                          {templates.length}
                        </span>
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="templateStatus"
                        value="active"
                        checked={statusFilter === 'active'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-4 w-4 text-white focus:ring-white/50 border-white/30 bg-white/10"
                      />
                      <span className="ml-3 text-sm text-white flex items-center justify-between w-full group-hover:text-white/90">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          Published Templates
                        </span>
                        <span className="text-xs text-green-100 bg-green-500/30 px-2 py-1 rounded-full">
                          {templates.filter(t => t.is_active).length}
                        </span>
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="templateStatus"
                        value="inactive"
                        checked={statusFilter === 'inactive'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-4 w-4 text-white focus:ring-white/50 border-white/30 bg-white/10"
                      />
                      <span className="ml-3 text-sm text-white flex items-center justify-between w-full group-hover:text-white/90">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-gray-300 rounded-full mr-2"></div>
                          Draft Templates
                        </span>
                        <span className="text-xs text-gray-200 bg-white/20 px-2 py-1 rounded-full">
                          {templates.filter(t => !t.is_active).length}
                        </span>
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer opacity-60">
                      <input
                        type="radio"
                        name="templateStatus"
                        value="archived"
                        checked={statusFilter === 'archived'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-4 w-4 text-white focus:ring-white/50 border-white/30 bg-white/10"
                        disabled
                      />
                      <span className="ml-3 text-sm text-white/70 flex items-center justify-between w-full">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-orange-300 rounded-full mr-2"></div>
                          Archived Templates
                        </span>
                        <span className="text-xs text-orange-200 bg-orange-500/20 px-2 py-1 rounded-full">
                          0
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Clear Filters */}
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="w-full text-left text-sm text-white/90 hover:text-white flex items-center"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Template List */}
            <div className="flex-1 overflow-y-auto max-h-[calc(100vh-500px)]">
              {(() => {
                let filteredTemplates = templates;
                if (statusFilter === 'active') {
                  filteredTemplates = templates.filter(t => t.is_active);
                } else if (statusFilter === 'inactive') {
                  filteredTemplates = templates.filter(t => !t.is_active);
                } else if (statusFilter === 'archived') {
                  filteredTemplates = [];
                }

                if (searchTerm) {
                  filteredTemplates = filteredTemplates.filter(template =>
                    template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
                  );
                }

                if (filteredTemplates.length === 0) {
                  return (
                    <div className="p-6 text-center">
                      <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        {statusFilter === 'all' && !searchTerm 
                          ? "No templates found" 
                          : statusFilter === 'archived'
                          ? "No archived templates"
                          : searchTerm
                          ? `No templates match "${searchTerm}"`
                          : `No ${statusFilter === 'active' ? 'published' : 'draft'} templates`
                        }
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {statusFilter === 'all' && !searchTerm 
                          ? "Get started by creating your first interview template."
                          : searchTerm
                          ? "Try adjusting your search criteria."
                          : `Create your first ${statusFilter === 'active' ? 'published' : 'draft'} template.`
                        }
                      </p>
                      {(statusFilter === 'all' || statusFilter === 'inactive') && !searchTerm && (
                        <button 
                          onClick={() => window.location.href = '/create-template'}
                          className="tempo-font inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          CREATE TEMPLATE
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="divide-y divide-gray-200">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => selectTemplate(template.id)}
                        className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                          selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-4 border-[#DC1125]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                            {template.title}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              template.is_active ? 'bg-[#10559A]' : 'bg-gray-400'
                            }`}></div>
                            <ChevronRight className={`h-4 w-4 transition-transform ${
                              selectedTemplate?.id === template.id ? 'rotate-90 text-[#DC1125]' : 'text-gray-400'
                            }`} />
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(template.created_at)}</span>
                          <span className={`px-2 py-1 rounded-full ${
                            template.is_active 
                              ? 'bg-[#10559A]/10 text-[#10559A] border border-[#10559A]/20' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {template.is_active ? 'Published' : 'Draft'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Main Content Area - SOLID NAVY HEADER (no gradient) */}
          <div className="lg:col-span-8 bg-white rounded-lg shadow">
            {!selectedTemplate ? (
              <div className="h-full flex items-center justify-center min-h-[600px]">
                <div className="text-center">
                  <Video className="mx-auto h-16 w-16 text-[#DC1125] mb-4" />
                  <h3 className="text-lg font-medium text-[#052049] mb-2 tempo-font tracking-tight">
                    SELECT A TEMPLATE
                  </h3>
                  <p className="text-gray-500">Choose a template from the list to view details and manage candidates</p>
                </div>
              </div>
            ) : isLoadingDetail ? (
              <div className="h-full flex items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125]"></div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {/* Template Header - SOLID NAVY (no gradient) */}
                <div className="p-6 border-b border-gray-200 bg-[#052049]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <h1 className="text-2xl font-bold text-white mr-3 tempo-font tracking-tight">
                          {selectedTemplate.title.toUpperCase()}
                        </h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          selectedTemplate.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-white/20 text-white'
                        }`}>
                          {selectedTemplate.is_active ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      
                      <p className="text-white/90 mb-4">{selectedTemplate.description}</p>
                      
                      <div className="flex items-center text-sm text-white/80 space-x-6">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          Created {formatDate(selectedTemplate.created_at)}
                        </div>
                        <div className="flex items-center">
                          <Play className="h-4 w-4 mr-1" />
                          ID: {selectedTemplate.id.substring(0, 8)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 ml-6">
                      <button
                        onClick={() => window.location.href = `/edit-template/${selectedTemplate.id}`}
                        className="inline-flex items-center px-4 py-2 border border-white/30 rounded-md text-sm font-medium tempo-font text-white bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        EDIT
                      </button>
                      <button
                        onClick={handleDeleteTemplate}
                        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md tempo-font text-sm font-medium text-red-100 bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        DELETE
                      </button>
                      <button
                        onClick={handleSendToCandidate}
                        className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-bold text-white bg-[#10559A] hover:bg-[#2f8ce9] transition-colors"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        SEND
                      </button>
                      <button
                        onClick={() => window.location.href = `/review?template=${selectedTemplate.id}`}
                        className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-bold text-[#052049] bg-white hover:bg-[#e6e6e6] transition-colors"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        REVIEW
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats Cards - Keep these, they look good */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-[#DC1125]">
                      <div className="text-3xl font-bold text-[#DC1125] tempo-font">{selectedTemplate.questions.length}</div>
                      <div className="text-sm text-gray-600">Questions</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-[#10559A]">
                      <div className="text-3xl font-bold text-[#10559A] tempo-font">{selectedTemplate.sessions.length}</div>
                      <div className="text-sm text-gray-600">Total Candidates</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-[#052049]">
                      <div className="text-3xl font-bold text-[#052049] tempo-font">
                        {selectedTemplate.sessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0).length}
                      </div>
                      <div className="text-sm text-gray-600">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-orange-500">
                      <div className="text-3xl font-bold text-orange-600 tempo-font">{selectedTemplate.keywords.length}</div>
                      <div className="text-sm text-gray-600">AI Keywords</div>
                    </div>
                  </div>
                </div>

                {/* Rest of content - keeping the same good styling */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Questions Section */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-[#052049] mb-4 flex items-center tempo-font tracking-tight">
                        <span className="bg-[#DC1125] p-2 rounded-lg mr-3">
                          <Play className="h-5 w-5 text-white" />
                        </span>
                        QUESTIONS ({selectedTemplate.questions.length})
                      </h3>
                      {/* Keep existing questions content */}
                      {selectedTemplate.questions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No questions configured</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {selectedTemplate.questions.map((question, index) => (
                            <div key={question.id} className="border border-gray-200 rounded-lg p-3 hover:border-[#DC1125]/30 transition-colors">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-sm font-bold text-[#DC1125] tempo-font">Q{question.question_order}</span>
                                <div className="flex items-center text-xs text-gray-500">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {Math.floor(question.time_limit / 60)}:{(question.time_limit % 60).toString().padStart(2, '0')}
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2">{question.question_text}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Keywords Section - Keep existing good styling */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-[#052049] mb-4 flex items-center tempo-font tracking-tight">
                        <span className="bg-[#10559A] p-2 rounded-lg mr-3">
                          <Tag className="h-5 w-5 text-white" />
                        </span>
                        AI KEYWORDS ({selectedTemplate.keywords.length})
                      </h3>
                      {selectedTemplate.keywords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No keywords configured</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {['technical', 'soft_skills', 'experience', 'general'].map(category => {
                            const categoryKeywords = selectedTemplate.keywords.filter(k => k.category === category);
                            if (categoryKeywords.length === 0) return null;
                            
                            return (
                              <div key={category}>
                                <h4 className="text-sm font-bold text-[#052049] mb-2 flex items-center tempo-font tracking-tight">
                                  <span className="mr-2">{getCategoryIcon(category)}</span>
                                  {category.replace('_', ' ').toUpperCase()} ({categoryKeywords.length})
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {categoryKeywords.slice(0, 10).map(keyword => (
                                    <span
                                      key={keyword.id}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(keyword.category)}`}
                                    >
                                      {keyword.keyword}
                                      {keyword.weight > 1 && (
                                        <span className="ml-1 flex items-center">
                                          <Star className="w-3 h-3" />
                                          {keyword.weight}x
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                  {categoryKeywords.length > 10 && (
                                    <span className="text-xs text-gray-500">
                                      +{categoryKeywords.length - 10} more...
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Candidates - Keep existing good styling */}
                  <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-[#052049] mb-4 flex items-center tempo-font tracking-tight">
                      <span className="bg-[#052049] p-2 rounded-lg mr-3">
                        <Users className="h-5 w-5 text-white" />
                      </span>
                      RECENT CANDIDATES ({selectedTemplate.sessions.length})
                    </h3>
                    {selectedTemplate.sessions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No candidates have been invited yet</p>
                        <button
                          onClick={handleSendToCandidate}
                          className="mt-4 tempo-font inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          INVITE FIRST CANDIDATE
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedTemplate.sessions.slice(0, 5).map(session => (
                          <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-[#10559A]/30 transition-colors">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                              <div className="text-sm text-gray-500">{session.candidateEmail}</div>
                            </div>
                            <div className="flex items-center space-x-3">
                              {getStatusBadge(session)}
                              <div className="text-sm text-gray-500">
                                {session.videosSubmitted}/{session.totalQuestions}
                              </div>
                              <button
                                onClick={() => window.location.href = `/review/${session.id}`}
                                className="text-[#10559A] hover:text-[#052049] text-sm font-medium"
                                disabled={session.videosSubmitted === 0}
                              >
                                {session.videosSubmitted > 0 ? 'Review' : 'No videos'}
                              </button>
                            </div>
                          </div>
                        ))}
                        {selectedTemplate.sessions.length > 5 && (
                          <div className="text-center pt-3">
                            <button
                              onClick={() => setCurrentView('candidates')}
                              className="text-[#10559A] hover:text-[#052049] text-sm font-medium"
                            >
                              View all {selectedTemplate.sessions.length} candidates →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keep existing candidates and completed views */}
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

    {/* Delete Template Modal */}
    {showDeleteModal && selectedTemplate && (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">Delete Template</h3>
            <p className="text-sm text-gray-600 mb-4 text-center">
              Are you sure you want to delete "<strong>{selectedTemplate.title}</strong>"? This action cannot be undone.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Warning:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>All questions will be permanently deleted</li>
                    <li>All AI keywords will be removed</li>
                    <li>Existing candidate sessions will be orphaned</li>
                    <li>This action cannot be reversed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <code className="bg-gray-100 px-1 rounded text-red-600 font-mono">delete template</code> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="delete template"
                  autoComplete="off"
                />
              </div>

              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <span className="text-sm text-red-700">{deleteError}</span>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={closeDeleteModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTemplate}
                  disabled={isDeleting || deleteConfirmText.toLowerCase() !== 'delete template'}
                  className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Template'
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