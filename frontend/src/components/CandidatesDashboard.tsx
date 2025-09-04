// frontend/src/components/CandidatesDashboard.tsx
"use client"
import React, { useState, useEffect } from 'react';
import UnifiedHeader from './UnifiedHeader';
import { Users, Eye, Calendar, Clock, Mail, CheckCircle, AlertCircle, Filter, X, Search, ArrowUpDown, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
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
  sourceType: 'template' | 'position'; // To distinguish template vs position sessions
  sourceId: string;
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

export default function CandidatesDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [allSessions, setAllSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all'); // template vs position filter
  const [dateRange, setDateRange] = useState<DateRange>({ startDate: '', endDate: '' });
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'desc' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchAllSessions();
  }, []);

  const fetchAllSessions = async () => {
  try {
    const token = localStorage.getItem('authToken');
    
    // Fetch both template sessions and position sessions
    const [templateSessionsResponse, positionSessionsResponse] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => ({ ok: false, json: () => Promise.resolve([]) })) // Handle if endpoint doesn't exist
    ]);

    // Parse responses with proper error handling
    const templateSessions = templateSessionsResponse.ok 
      ? await templateSessionsResponse.json() 
      : [];
    
    const positionSessions = positionSessionsResponse.ok 
      ? await positionSessionsResponse.json() 
      : [];

    // Combine and format sessions
    const combinedSessions = [
      ...templateSessions.map((session: any) => ({
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
        averageRating: null,
        sourceType: 'template' as const,
        sourceId: session.templateId
      })),
      ...positionSessions.map((session: any) => ({
        id: session.id,
        candidateName: session.candidateName,
        candidateEmail: session.candidateEmail,
        status: session.status,
        videosSubmitted: session.videosSubmitted || 0,
        totalQuestions: session.totalQuestions || 0,
        createdAt: session.createdAt,
        interviewTitle: session.positionTitle || session.interviewTitle,
        templateId: session.templateId,
        sessionId: session.id,
        averageRating: null,
        sourceType: 'position' as const,
        sourceId: session.positionId
      }))
    ];

    setAllSessions(combinedSessions);
  } catch (error) {
    setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setIsLoading(false);
  }
};

  // Sorting function
  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
      else direction = 'asc';
    }
    
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset pagination when sorting
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
    let filtered = [...allSessions];

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

    // Source filter (template vs position)
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(session => session.sourceType === sourceFilter);
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
    if (sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof SessionSummary];
        let bValue: any = b[sortConfig.key as keyof SessionSummary];

        if (sortConfig.key === 'createdAt') {
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
  const getPaginatedData = (data: SessionSummary[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / itemsPerPage),
      totalItems: data.length
    };
  };

  const getStatusBadge = (session: SessionSummary) => {
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
        <UnifiedHeader currentPage="candidates" user={user} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UnifiedHeader currentPage="candidates" user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Carnival-Styled Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 bg-[#10559A]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tempo-font tracking-tight">CANDIDATE FILTERS</h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-white/30 shadow-sm text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 tempo-font transition-colors"
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'HIDE FILTERS' : 'SHOW FILTERS'}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="p-6 space-y-4">
              {/* Search Bar */}
              <div>
                <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                  SEARCH CANDIDATES
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                    placeholder="Search by name, email, or interview title..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                    STATUS
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                    SOURCE
                  </label>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                  >
                    <option value="all">All Sources</option>
                    <option value="template">Templates</option>
                    <option value="position">Positions</option>
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                    START DATE
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                    END DATE
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Candidates Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#052049]">
            <h2 className="text-2xl font-bold text-white tempo-font tracking-tight">
              ALL CANDIDATES ({filteredSessions.length})
            </h2>
          </div>
          
          {error && (
            <div className="p-6 bg-red-50 border-b border-red-200">
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {paginatedData.data.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-[#DC1125]/60" />
              <h3 className="mt-2 text-lg font-bold text-[#052049] tempo-font tracking-tight">
                NO CANDIDATES FOUND
              </h3>
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
                      <SortableHeader label="CANDIDATE" sortKey="candidateName" />
                      <SortableHeader label="STATUS" sortKey="status" />
                      <SortableHeader label="INTERVIEW DATE" sortKey="createdAt" />
                      <SortableHeader label="POSITION" sortKey="interviewTitle" />
                      <SortableHeader label="SOURCE" sortKey="sourceType" />
                      <SortableHeader label="PROGRESS" sortKey="videosSubmitted" />
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider tempo-font">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.data.map((session) => (
                      <tr key={session.id} className="hover:bg-[#10559A]/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-bold text-[#052049] tempo-font">{session.candidateName}</div>
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
                          <div className="text-sm font-medium text-gray-900">{session.interviewTitle}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full tempo-font ${
                            session.sourceType === 'template' 
                              ? 'bg-[#10559A]/10 text-[#10559A] border border-[#10559A]/20'
                              : 'bg-[#DC1125]/10 text-[#DC1125] border border-[#DC1125]/20'
                          }`}>
                            {session.sourceType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900 tempo-font">
                            {session.videosSubmitted}/{session.totalQuestions} VIDEOS
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => window.location.href = `/review/${session.sessionId}`}
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
    </div>
  );
}