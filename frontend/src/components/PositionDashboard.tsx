// frontend/src/components/PositionDashboard.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UnifiedHeader from './UnifiedHeader';
import { 
  Plus, 
  MapPin, 
  Users, 
  Eye, 
  Calendar, 
  Clock, 
  Mail, 
  CheckCircle, 
  AlertCircle, 
  Filter, 
  X, 
  Search, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Edit3,
  Trash2,
  Send,
  Star,
  Tag
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Position {
  id: string;
  title: string;
  description: string;
  template_id: string;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PositionDetail extends Position {
  questions: PositionQuestion[];
  keywords: PositionKeyword[];
  templateTitle: string;
}

interface PositionQuestion {
  id: string;
  position_id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
  created_at: string;
}

interface PositionKeyword {
  id: string;
  position_id: string;
  keyword: string;
  category: string;
  weight: number;
  created_at: string;
}

interface PositionSession {
  id: string;
  candidateEmail: string;
  candidateName: string;
  status: string;
  startedAt: string;
  completedAt: string;
  expiresAt: string;
  createdAt: string;
  videosSubmitted: number;
  totalQuestions: number;
}

type SortDirection = 'asc' | 'desc' | null;
interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

export default function PositionDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<PositionDetail | null>(null);
  const [positionSessions, setPositionSessions] = useState<PositionSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [error, setError] = useState('');

  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);

  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Send invite modal state
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
    fetchPositions();
  }, []);

  const fetchPositions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPositions(data);
        if (data.length > 0) {
          selectPosition(data[0].id);
        }
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch positions: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectPosition = async (positionId: string) => {
    if (selectedPosition?.id === positionId) return;
    
    setIsLoadingDetail(true);
    setIsLoadingSessions(true);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Fetch position details
      const positionResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions/${positionId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Fetch position sessions
      const sessionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions/${positionId}/sessions`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (positionResponse.ok) {
        const positionData = await positionResponse.json();
        setSelectedPosition(positionData);
      }

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setPositionSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch position details:', error);
    } finally {
      setIsLoadingDetail(false);
      setIsLoadingSessions(false);
    }
  };

  // Navigation functions
  const handleCreatePosition = () => {
    router.push('/create-position');
  };

  const handleEditPosition = (positionId: string) => {
    router.push(`/edit-position/${positionId}`);
  };

  const handleSendToCandidate = () => {
    setShowSendModal(true);
    setCandidateEmail('');
    setCandidateName('');
    setSendError('');
    setSendSuccess('');
  };

  const handleSendInterview = async () => {
    if (!selectedPosition) return;

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions/${selectedPosition.id}/sessions`,
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
        
        // Refresh sessions after sending
        setTimeout(() => {
          setShowSendModal(false);
          setSendSuccess('');
          selectPosition(selectedPosition.id);
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

  // Sorting functions
  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
      else direction = 'asc';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-4 h-4 text-[#DC1125]" />;
    }
    if (sortConfig.direction === 'desc') {
      return <ChevronDown className="w-4 h-4 text-[#DC1125]" />;
    }
    return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
  };

  // Filtering and sorting logic
  const getFilteredAndSortedSessions = () => {
    let filtered = [...positionSessions];

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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(session =>
        session.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase())
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
    if (sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof PositionSession];
        let bValue: any = b[sortConfig.key as keyof PositionSession];

        if (sortConfig.key.includes('At') || sortConfig.key === 'createdAt') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortConfig.direction === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  };

  // Pagination logic
  const getPaginatedData = (data: PositionSession[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / itemsPerPage),
      totalItems: data.length
    };
  };

  const getStatusBadge = (session: PositionSession) => {
    const completed = session.videosSubmitted === session.totalQuestions && session.totalQuestions > 0;
    const inProgress = session.videosSubmitted > 0 && session.videosSubmitted < session.totalQuestions;

    if (completed) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 tempo-font">COMPLETED</span>;
    } else if (inProgress) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 tempo-font">IN PROGRESS</span>;
    } else {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 tempo-font">PENDING</span>;
    }
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

  const SortableHeader = ({ label, sortKey }: { label: string; sortKey: string }) => (
    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors tempo-font">
      <button
        onClick={() => handleSort(sortKey)}
        className="flex items-center space-x-1 w-full text-left"
      >
        <span>{label}</span>
        {getSortIcon(sortKey)}
      </button>
    </th>
  );

  const filteredSessions = getFilteredAndSortedSessions();
  const paginatedData = getPaginatedData(filteredSessions);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UnifiedHeader currentPage="positions" user={user} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader currentPage="positions" user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Sidebar - Positions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200 bg-[#052049]">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                    JOB POSITIONS ({positions.length})
                  </h2>
                  <button
                    onClick={handleCreatePosition}
                    className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    CREATE
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              {positions.length === 0 ? (
                <div className="text-center py-12">
                  <MapPin className="mx-auto h-12 w-12 text-[#DC1125]/60" />
                  <h3 className="mt-2 text-lg font-bold text-[#052049] tempo-font tracking-tight">
                    NO POSITIONS CREATED
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 mb-4">
                    Create your first job position to start interviewing candidates.
                  </p>
                  <button
                    onClick={handleCreatePosition}
                    className="tempo-font inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    CREATE POSITION
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                  {positions.map((position) => (
                    <div
                      key={position.id}
                      onClick={() => selectPosition(position.id)}
                      className={`p-4 cursor-pointer transition-colors hover:bg-[#10559A]/5 ${
                        selectedPosition?.id === position.id ? 'bg-[#10559A]/10 border-r-4 border-[#DC1125]' : ''
                      }`}
                    >
                      <h3 className="text-sm font-bold text-[#052049] tempo-font tracking-tight">
                        {position.title}
                      </h3>
                      {position.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {position.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(position.created_at)}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPosition(position.id);
                            }}
                            className="text-[#10559A] hover:text-[#052049] transition-colors"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Content - Position Details */}
          <div className="lg:col-span-2">
            {!selectedPosition ? (
              <div className="bg-white rounded-lg shadow">
                <div className="text-center py-12">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-bold text-gray-900 tempo-font tracking-tight">
                    SELECT A POSITION
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a position from the left to view details and manage candidates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Position Header */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-[#052049] to-[#10559A]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-white tempo-font tracking-tight">
                          {selectedPosition.title}
                        </h1>
                        <p className="text-white/90 mt-1">
                          Based on template: {selectedPosition.templateTitle}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleEditPosition(selectedPosition.id)}
                          className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          EDIT
                        </button>
                        <button
                          onClick={handleSendToCandidate}
                          className="tempo-font inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-red-700 transition-colors"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          SEND TO CANDIDATE
                        </button>
                      </div>
                    </div>
                  </div>

                  {isLoadingDetail ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DC1125] mx-auto"></div>
                    </div>
                  ) : (
                    <div className="p-6">
                      {selectedPosition.description && (
                        <p className="text-gray-700 mb-4">{selectedPosition.description}</p>
                      )}
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-[#052049]/5 rounded-lg">
                          <div className="text-xl font-bold text-[#052049] tempo-font">
                            {selectedPosition.questions.length}
                          </div>
                          <div className="text-sm text-gray-600">Questions</div>
                        </div>
                        <div className="text-center p-3 bg-[#10559A]/5 rounded-lg">
                          <div className="text-xl font-bold text-[#10559A] tempo-font">
                            {selectedPosition.keywords.length}
                          </div>
                          <div className="text-sm text-gray-600">AI Keywords</div>
                        </div>
                        <div className="text-center p-3 bg-[#DC1125]/5 rounded-lg">
                          <div className="text-xl font-bold text-[#DC1125] tempo-font">
                            {positionSessions.length}
                          </div>
                          <div className="text-sm text-gray-600">Candidates</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Overview - Questions & Keywords */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Questions Preview */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200 bg-[#10559A]">
                      <h3 className="text-lg font-bold text-white tempo-font tracking-tight">
                        QUESTIONS ({selectedPosition.questions.length})
                      </h3>
                    </div>
                    <div className="p-4">
                      {selectedPosition.questions.length === 0 ? (
                        <p className="text-gray-500 text-sm">No questions configured</p>
                      ) : (
                        <div className="space-y-3">
                          {selectedPosition.questions.slice(0, 3).map((question, index) => (
                            <div key={question.id} className="border-l-4 border-[#10559A] pl-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#052049] tempo-font">
                                  QUESTION {index + 1}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {question.time_limit}s
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                {question.question_text}
                              </p>
                            </div>
                          ))}
                          {selectedPosition.questions.length > 3 && (
                            <p className="text-xs text-gray-500 text-center">
                              +{selectedPosition.questions.length - 3} more questions
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Keywords Preview */}
                  <div className="bg-white rounded-lg shadow">
                    <div className="p-4 border-b border-gray-200 bg-[#10559A]">
                      <h3 className="text-lg font-bold text-white tempo-font tracking-tight">
                        AI KEYWORDS ({selectedPosition.keywords.length})
                      </h3>
                    </div>
                    <div className="p-4">
                      {selectedPosition.keywords.length === 0 ? (
                        <p className="text-gray-500 text-sm">No keywords configured</p>
                      ) : (
                        <div className="space-y-3">
                          {Object.entries(
                            selectedPosition.keywords.reduce((acc, keyword) => {
                              if (!acc[keyword.category]) acc[keyword.category] = [];
                              acc[keyword.category].push(keyword);
                              return acc;
                            }, {} as Record<string, PositionKeyword[]>)
                          ).map(([category, keywords]) => (
                            <div key={category}>
                              <h4 className="text-xs font-bold text-[#052049] mb-2 flex items-center tempo-font tracking-tight">
                                <span className="mr-1">{getCategoryIcon(category)}</span>
                                {category.replace('_', ' ').toUpperCase()}
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {keywords.slice(0, 6).map((keyword) => (
                                  <span
                                    key={keyword.id}
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getCategoryColor(keyword.category)}`}
                                  >
                                    {keyword.keyword}
                                    {keyword.weight > 1 && (
                                      <Star className="w-3 h-3 ml-1" />
                                    )}
                                  </span>
                                ))}
                                {keywords.length > 6 && (
                                  <span className="text-xs text-gray-500">
                                    +{keywords.length - 6} more
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Candidates Table */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-4 border-b border-gray-200 bg-[#052049]">
                    <h3 className="text-lg font-bold text-white tempo-font tracking-tight">
                      CANDIDATES ({filteredSessions.length})
                    </h3>
                  </div>

                  {/* Filters */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                            placeholder="Search candidates..."
                          />
                        </div>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                        >
                          <option value="all">All Status</option>
                          <option value="completed">Completed</option>
                          <option value="in_progress">In Progress</option>
                          <option value="pending">Pending</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {isLoadingSessions ? (
                    <div className="p-6 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DC1125] mx-auto"></div>
                    </div>
                  ) : paginatedData.data.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-[#DC1125]/60" />
                      <h3 className="mt-2 text-lg font-bold text-[#052049] tempo-font tracking-tight">
                        NO CANDIDATES YET
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 mb-4">
                        Send interview invitations to start collecting candidate responses.
                      </p>
                      <button
                        onClick={handleSendToCandidate}
                        className="tempo-font inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        SEND INVITATION
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <SortableHeader label="CANDIDATE" sortKey="candidateName" />
                              <SortableHeader label="STATUS" sortKey="status" />
                              <SortableHeader label="SENT DATE" sortKey="createdAt" />
                              <SortableHeader label="PROGRESS" sortKey="videosSubmitted" />
                              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider tempo-font">
                                ACTIONS
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedData.data.map((session) => (
                              <tr key={session.id} className="hover:bg-[#10559A]/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-bold text-[#052049] tempo-font">
                                      {session.candidateName}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {session.candidateEmail}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {getStatusBadge(session)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {formatDate(session.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-bold text-gray-900 tempo-font">
                                    {session.videosSubmitted}/{session.totalQuestions} VIDEOS
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button
                                    onClick={() => router.push(`/review/${session.id}`)}
                                    className="tempo-font text-[#10559A] hover:text-[#052049] font-bold transition-colors"
                                    disabled={session.videosSubmitted === 0}
                                  >
                                    {session.videosSubmitted > 0 ? 'REVIEW' : 'NO VIDEOS'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage === paginatedData.totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-gray-700 tempo-font">
                              Showing <span className="font-bold text-[#052049]">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                              <span className="font-bold text-[#052049]">{Math.min(currentPage * itemsPerPage, paginatedData.totalItems)}</span> of{' '}
                              <span className="font-bold text-[#052049]">{paginatedData.totalItems}</span> candidates
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                              <button
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </button>
                              {Array.from({ length: Math.min(paginatedData.totalPages, 5) }, (_, i) => {
                                const page = i + 1;
                                return (
                                  <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-bold tempo-font ${
                                      page === currentPage
                                        ? 'z-10 bg-[#DC1125] border-[#DC1125] text-white'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === paginatedData.totalPages}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send to Candidate Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 bg-[#052049]">
              <h3 className="text-lg font-bold text-white tempo-font tracking-tight">
                SEND INTERVIEW INVITATION
              </h3>
              <p className="text-white/90 text-sm mt-1">
                {selectedPosition?.title}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Candidate Name *
                  </label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                    placeholder="candidate@example.com"
                  />
                </div>
              </div>
              
              {sendError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                  <span className="text-sm text-red-700">{sendError}</span>
                </div>
              )}
              
              {sendSuccess && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <span className="text-sm text-green-700 whitespace-pre-line">{sendSuccess}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={closeSendModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInterview}
                disabled={isSending}
                className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#DC1125] hover:bg-[#052049] disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    SENDING...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    SEND INVITATION
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}