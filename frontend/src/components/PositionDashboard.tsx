// frontend/src/components/PositionDashboard.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { Plus, Users, Briefcase, Settings, LogOut, Eye, Calendar, Clock, User, Mail, CheckCircle, AlertCircle, Filter, X, ChevronDown, ChevronUp, Search, Tag, Star, Play, ChevronLeft, ChevronRight, ArrowUpDown, Trash2, AlertTriangle, MapPin } from 'lucide-react';
import UnifiedHeader from './UnifiedHeader';


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
  sessions: SessionSummary[];
}

interface PositionQuestion {
  id: string;
  position_id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
}

interface PositionKeyword {
  id: string;
  position_id: string;
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
}

type DashboardView = 'positions' | 'candidates' | 'completed';
type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string;
  direction: SortDirection;
}

export default function PositionDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<PositionDetail | null>(null);
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [currentView, setCurrentView] = useState<DashboardView>('positions');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state
  const [candidatesSort, setCandidatesSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  const [completedSort, setCompletedSort] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Pagination state
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchPositions();
    fetchAllSessions();
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
        if (data.length > 0 && currentView === 'positions') {
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

  const fetchAllSessions = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Note: We'll need to update the backend to include position sessions
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Filter sessions that have position_id (position-based sessions)
        const positionSessions = data.filter((session: any) => session.positionId);
        const sessionData = positionSessions.map((session: any) => ({
          id: session.id,
          candidateName: session.candidateName,
          candidateEmail: session.candidateEmail,
          status: session.status,
          videosSubmitted: session.videosSubmitted || 0,
          totalQuestions: session.totalQuestions || 0,
          createdAt: session.createdAt,
          positionTitle: session.positionTitle || session.interviewTitle,
          positionId: session.positionId
        }));
        setAllSessions(sessionData);
      }
    } catch (error) {
      console.error('Sessions network error:', error);
    }
  };

  const selectPosition = async (positionId: string) => {
    if (selectedPosition?.id === positionId) return;
    
    setIsLoadingDetail(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Get position details including questions, keywords, and sessions
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions/${positionId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const positionData = await response.json();
        
        // Get sessions for this position
        const sessionsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions/${positionId}/sessions`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        const sessionsData = sessionsResponse.ok ? await sessionsResponse.json() : { sessions: [] };
        
        setSelectedPosition({
          ...positionData,
          sessions: sessionsData.sessions || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch position details:', error);
    } finally {
      setIsLoadingDetail(false);
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

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
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
      {/* Carnival-Branded Header */}
<UnifiedHeader currentPage="positions" user={user} />
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setCurrentView('positions')}
              className={`tempo-font whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm tracking-tight transition-colors ${
                currentView === 'positions'
                  ? 'border-[#DC1125] text-[#DC1125]'
                  : 'border-transparent text-gray-500 hover:text-[#10559A] hover:border-[#10559A]'
              }`}
            >
              POSITIONS ({positions.length})
            </button>
            <button
              onClick={() => setCurrentView('candidates')}
              className={`tempo-font whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm tracking-tight transition-colors ${
                currentView === 'candidates'
                  ? 'border-[#DC1125] text-[#DC1125]'
                  : 'border-transparent text-gray-500 hover:text-[#10559A] hover:border-[#10559A]'
              }`}
            >
              CANDIDATES ({allSessions.length})
            </button>
            <button
              onClick={() => setCurrentView('completed')}
              className={`tempo-font whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm tracking-tight transition-colors ${
                currentView === 'completed'
                  ? 'border-[#DC1125] text-[#DC1125]'
                  : 'border-transparent text-gray-500 hover:text-[#10559A] hover:border-[#10559A]'
              }`}
            >
              COMPLETED ({allSessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0).length})
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Loading Data</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-3">
                  <button
                    onClick={() => {
                      setError('');
                      setIsLoading(true);
                      fetchPositions();
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

        {currentView === 'positions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Position List */}
            <div className="lg:col-span-4 bg-white rounded-lg shadow border-r border-gray-200 flex flex-col">
              {/* Position List Header */}
              <div className="p-6 border-b border-gray-200 bg-[#10559A]">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                    JOB POSITIONS
                  </h2>
                  <span className="text-sm text-white bg-white/20 px-3 py-1 rounded-full font-medium">
                    {positions.length}
                  </span>
                </div>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-white/50 bg-white text-gray-900 placeholder-gray-500"
                    placeholder="Search positions..."
                  />
                </div>

                {/* Status Filter */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center tempo-font tracking-tight">
                    <Filter className="h-4 w-4 mr-2" />
                    FILTERS
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="positionStatus"
                        value="all"
                        checked={statusFilter === 'all'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-4 w-4 text-white focus:ring-white/50 border-white/30 bg-white/10"
                      />
                      <span className="ml-3 text-sm text-white flex items-center justify-between w-full group-hover:text-white/90">
                        <span>All Positions</span>
                        <span className="text-xs text-white bg-white/20 px-2 py-1 rounded-full">
                          {positions.length}
                        </span>
                      </span>
                    </label>

                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        name="positionStatus"
                        value="active"
                        checked={statusFilter === 'active'}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-4 w-4 text-white focus:ring-white/50 border-white/30 bg-white/10"
                      />
                      <span className="ml-3 text-sm text-white flex items-center justify-between w-full group-hover:text-white/90">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          Open Positions
                        </span>
                        <span className="text-xs text-green-100 bg-green-500/30 px-2 py-1 rounded-full">
                          {positions.filter(p => p.is_active).length}
                        </span>
                      </span>
                    </label>
                  </div>

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

              {/* Position List */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-500px)]">
                {(() => {
                  let filteredPositions = positions;
                  
                  if (statusFilter === 'active') {
                    filteredPositions = positions.filter(p => p.is_active);
                  }

                  if (searchTerm) {
                    filteredPositions = filteredPositions.filter(position =>
                      position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (position.description && position.description.toLowerCase().includes(searchTerm.toLowerCase()))
                    );
                  }

                  if (filteredPositions.length === 0) {
                    return (
                      <div className="p-6 text-center">
                        <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          {searchTerm ? `No positions match "${searchTerm}"` : "No positions found"}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          {searchTerm ? "Try adjusting your search criteria." : "Get started by creating your first job position."}
                        </p>
                        {!searchTerm && (
                          <button 
                            onClick={() => window.location.href = '/create-position'}
                            className="tempo-font inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            CREATE POSITION
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-gray-200">
                      {filteredPositions.map((position) => (
                        <button
                          key={position.id}
                          onClick={() => selectPosition(position.id)}
                          className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                            selectedPosition?.id === position.id ? 'bg-blue-50 border-r-4 border-[#DC1125]' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                              {position.title}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                position.is_active ? 'bg-[#10559A]' : 'bg-gray-400'
                              }`}></div>
                              <ChevronRight className={`h-4 w-4 transition-transform ${
                                selectedPosition?.id === position.id ? 'rotate-90 text-[#DC1125]' : 'text-gray-400'
                              }`} />
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                            {position.description || 'No description'}
                          </p>
                          
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{formatDate(position.created_at)}</span>
                            <span className={`px-2 py-1 rounded-full ${
                              position.is_active 
                                ? 'bg-[#10559A]/10 text-[#10559A] border border-[#10559A]/20' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {position.is_active ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-8 bg-white rounded-lg shadow">
              {!selectedPosition ? (
                <div className="h-full flex items-center justify-center min-h-[600px]">
                  <div className="text-center">
                    <MapPin className="mx-auto h-16 w-16 text-[#DC1125] mb-4" />
                    <h3 className="text-lg font-medium text-[#052049] mb-2 tempo-font tracking-tight">
                      SELECT A POSITION
                    </h3>
                    <p className="text-gray-500">Choose a position from the list to view details and manage candidates</p>
                  </div>
                </div>
              ) : isLoadingDetail ? (
                <div className="h-full flex items-center justify-center min-h-[600px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125]"></div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  {/* Position Header */}
                  <div className="p-6 border-b border-gray-200 bg-[#052049]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <h1 className="text-2xl font-bold text-white mr-3 tempo-font tracking-tight">
                            {selectedPosition.title.toUpperCase()}
                          </h1>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            selectedPosition.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-white/20 text-white'
                          }`}>
                            {selectedPosition.is_active ? 'Open' : 'Closed'}
                          </span>
                        </div>
                        
                        <p className="text-white/90 mb-4">{selectedPosition.description}</p>
                        
                        <div className="flex items-center text-sm text-white/80 space-x-6">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Created {formatDate(selectedPosition.created_at)}
                          </div>
                          <div className="flex items-center">
                            <Tag className="h-4 w-4 mr-1" />
                            Based on: {selectedPosition.templateTitle}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-6">
                        <button
                          onClick={() => window.location.href = `/edit-position/${selectedPosition.id}`}
                          className="inline-flex items-center px-4 py-2 border border-white/30 rounded-md text-sm font-medium tempo-font text-white bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          EDIT
                        </button>
                        <button
                          onClick={() => window.location.href = `/review?position=${selectedPosition.id}`}
                          className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-bold text-[#052049] bg-white hover:bg-[#e6e6e6] transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          REVIEW
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="p-6 border-b border-gray-200 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-[#DC1125]">
                        <div className="text-3xl font-bold text-[#DC1125] tempo-font">{selectedPosition.questions.length}</div>
                        <div className="text-sm text-gray-600">Questions</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-[#10559A]">
                        <div className="text-3xl font-bold text-[#10559A] tempo-font">{selectedPosition.sessions.length}</div>
                        <div className="text-sm text-gray-600">Total Candidates</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-[#052049]">
                        <div className="text-3xl font-bold text-[#052049] tempo-font">
                          {selectedPosition.sessions.filter(s => s.videosSubmitted === s.totalQuestions && s.totalQuestions > 0).length}
                        </div>
                        <div className="text-sm text-gray-600">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg shadow-sm border-l-4 border-orange-500">
                        <div className="text-3xl font-bold text-orange-600 tempo-font">{selectedPosition.keywords.length}</div>
                        <div className="text-sm text-gray-600">AI Keywords</div>
                      </div>
                    </div>
                  </div>

                  {/* Content Sections */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Questions Section */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-[#052049] mb-4 flex items-center tempo-font tracking-tight">
                          <span className="bg-[#DC1125] p-2 rounded-lg mr-3">
                            <Play className="h-5 w-5 text-white" />
                          </span>
                          QUESTIONS ({selectedPosition.questions.length})
                        </h3>
                        {selectedPosition.questions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No questions configured</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {selectedPosition.questions.map((question) => (
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

                      {/* Keywords Section */}
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-bold text-[#052049] mb-4 flex items-center tempo-font tracking-tight">
                          <span className="bg-[#10559A] p-2 rounded-lg mr-3">
                            <Tag className="h-5 w-5 text-white" />
                          </span>
                          AI KEYWORDS ({selectedPosition.keywords.length})
                        </h3>
                        {selectedPosition.keywords.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No keywords configured</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-64 overflow-y-auto">
                            {Object.entries(
                              selectedPosition.keywords.reduce((acc, keyword) => {
                                if (!acc[keyword.category]) acc[keyword.category] = [];
                                acc[keyword.category].push(keyword);
                                return acc;
                              }, {} as Record<string, PositionKeyword[]>)
                            ).map(([category, categoryKeywords]) => (
                              <div key={category} className="border border-[#10559A]/20 rounded-lg p-3 bg-[#10559A]/5">
                                <h4 className="text-sm font-bold text-[#052049] mb-2 flex items-center tempo-font tracking-tight">
                                  <span className="mr-2">{getCategoryIcon(category)}</span>
                                  {category.replace('_', ' ').toUpperCase()} ({categoryKeywords.length})
                                </h4>
                                <div className="flex flex-wrap gap-1">
                                  {categoryKeywords.slice(0, 10).map((keyword) => (
                                    <div
                                      key={keyword.id}
                                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getCategoryColor(keyword.category)}`}
                                    >
                                      <span>{keyword.keyword}</span>
                                      {keyword.weight > 1 && (
                                        <span className="ml-1 flex items-center">
                                          <Star className="w-2 h-2 ml-1" />
                                          {keyword.weight}x
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {categoryKeywords.length > 10 && (
                                    <span className="text-xs text-gray-500 px-2 py-1">
                                      +{categoryKeywords.length - 10} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Candidates */}
                    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-bold text-[#052049] mb-4 flex items-center tempo-font tracking-tight">
                        <span className="bg-[#052049] p-2 rounded-lg mr-3">
                          <Users className="h-5 w-5 text-white" />
                        </span>
                        RECENT CANDIDATES ({selectedPosition.sessions.length})
                      </h3>
                      {selectedPosition.sessions.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm">No candidates have been invited yet</p>
                          <button
                            onClick={() => window.location.href = `/edit-position/${selectedPosition.id}`}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                          >
                            Invite candidates to this position
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {selectedPosition.sessions.slice(0, 5).map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-[#10559A]/30 transition-colors">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{session.candidateName}</div>
                                <div className="text-xs text-gray-500">{session.candidateEmail}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-600 mb-1">{formatDate(session.createdAt)}</div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  session.videosSubmitted === session.totalQuestions && session.totalQuestions > 0
                                    ? 'bg-green-100 text-green-800'
                                    : session.videosSubmitted > 0
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {session.videosSubmitted}/{session.totalQuestions}
                                </span>
                              </div>
                            </div>
                          ))}
                          {selectedPosition.sessions.length > 5 && (
                            <div className="text-center">
                              <button
                                onClick={() => setCurrentView('candidates')}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                View all {selectedPosition.sessions.length} candidates →
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

        {/* Candidates and Completed views would be similar to Dashboard */}
        {currentView === 'candidates' && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Candidates View</h3>
            <p className="mt-1 text-sm text-gray-500">This view will show all position candidates (to be implemented)</p>
          </div>
        )}

        {currentView === 'completed' && (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Completed View</h3>
            <p className="mt-1 text-sm text-gray-500">This view will show completed position interviews (to be implemented)</p>
          </div>
        )}
      </div>
    </div>
  );
}