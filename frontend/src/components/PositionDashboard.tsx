"use client"
import React, { useState, useEffect } from 'react';
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
  Tag,
  Play
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
  templateTitle?: string;
  candidateCount?: number;
  completedCount?: number;
}

interface Template {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_active: boolean;
}

type SortDirection = 'asc' | 'desc' | null;
interface SortConfig {
  key: string;
  direction: SortDirection;
}

export default function PositionDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtering and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'created_at', direction: 'desc' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Create position modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [newPositionDescription, setNewPositionDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchPositions();
    fetchTemplates();
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
        setTemplates(data.filter((t: Template) => t.is_active));
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

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

  const getFilteredAndSortedPositions = () => {
      if (!positions || !Array.isArray(positions)) {
    return [];
  }
    let filtered = [...(positions || [])];

    // Apply filters
    if (statusFilter !== 'all') {
      filtered = filtered.filter(position => {
        if (statusFilter === 'active') return position.is_active;
        if (statusFilter === 'inactive') return !position.is_active;
        return true;
      });
    }

    if (templateFilter !== 'all') {
      filtered = filtered.filter(position => position.template_id === templateFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(position =>
        position.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (position.description && position.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (position.templateTitle && position.templateTitle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    if (sortConfig.direction) {
      filtered.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Position];
        let bValue: any = b[sortConfig.key as keyof Position];

        if (sortConfig.key === 'created_at' || sortConfig.key === 'updated_at') {
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

  const getPaginatedData = (data: Position[]) => {
      if (!data || !Array.isArray(data)) {
    return { data: [], totalPages: 0, totalItems: 0 };
  }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / itemsPerPage),
      totalItems: data.length
    };
  };

  const handleCreatePosition = () => {
    setShowCreateModal(true);
    setSelectedTemplateId('');
    setNewPositionTitle('');
    setNewPositionDescription('');
    setCreateError('');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const selectedTemplate = templates.find(t => t.id === templateId);
    if (selectedTemplate) {
      setNewPositionTitle(`${selectedTemplate.title} - Position`);
      setNewPositionDescription(selectedTemplate.description || '');
    }
  };

  const submitCreatePosition = async () => {
    if (!newPositionTitle.trim()) {
      setCreateError('Position title is required');
      return;
    }

    setIsCreating(true);
    setCreateError('');

    try {
      const token = localStorage.getItem('authToken');
      
      if (selectedTemplateId) {
        // Create position from template
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: newPositionTitle.trim(),
            description: newPositionDescription.trim(),
            template_id: selectedTemplateId,
          }),
        });

        if (response.ok) {
          setShowCreateModal(false);
          fetchPositions(); // Refresh the list
        } else {
          const errorData = await response.json();
          setCreateError(errorData.error || 'Failed to create position');
        }
      } else {
        // Navigate to create position page for custom creation
        window.location.href = '/create-position';
      }
    } catch (error: any) {
      setCreateError(error.message || 'Network error. Please try again.');
    } finally {
      setIsCreating(false);
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

  const filteredPositions = getFilteredAndSortedPositions();
  const paginatedData = getPaginatedData(filteredPositions);

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
        {/* Header with Create Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#052049] tempo-font tracking-tight">
              JOB POSITIONS
            </h1>
            <p className="text-gray-600 mt-2">
              Manage and create job positions for candidate interviews
            </p>
          </div>
          <button
            onClick={handleCreatePosition}
            className="tempo-font inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            CREATE POSITION
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200 bg-[#10559A]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tempo-font tracking-tight">POSITION FILTERS</h3>
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
              <div>
                <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                  SEARCH POSITIONS
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                    placeholder="Search by title, description, or template..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#052049] mb-2 tempo-font tracking-tight">
                    TEMPLATE
                  </label>
                  <select
                    value={templateFilter}
                    onChange={(e) => setTemplateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                  >
                    <option value="all">All Templates</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Positions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 bg-[#052049]">
            <h2 className="text-2xl font-bold text-white tempo-font tracking-tight">
              POSITIONS ({filteredPositions.length})
            </h2>
          </div>

          {error && (
            <div className="p-6 bg-red-50 border-b border-red-200">
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {paginatedData.data.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="mx-auto h-12 w-12 text-[#DC1125]/60" />
              <h3 className="mt-2 text-lg font-bold text-[#052049] tempo-font tracking-tight">
                {positions.length === 0 ? 'NO POSITIONS CREATED' : 'NO POSITIONS FOUND'}
              </h3>
              <p className="mt-1 text-sm text-gray-500 mb-4">
                {positions.length === 0
                  ? "Create your first job position to start interviewing candidates."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
              {positions.length === 0 && (
                <button
                  onClick={handleCreatePosition}
                  className="tempo-font inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-[#DC1125] hover:bg-[#052049] transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  CREATE FIRST POSITION
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <SortableHeader label="POSITION TITLE" sortKey="title" />
                      <SortableHeader label="STATUS" sortKey="is_active" />
                      <SortableHeader label="CREATED" sortKey="created_at" />
                      <SortableHeader label="TEMPLATE" sortKey="templateTitle" />
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider tempo-font">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.data.map((position) => (
                      <tr key={position.id} className="hover:bg-[#10559A]/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-bold text-[#052049] tempo-font">
                              {position.title}
                            </div>
                            {position.description && (
                              <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                {position.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full tempo-font ${
                            position.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {position.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(position.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {position.templateTitle || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button
                            onClick={() => window.location.href = `/edit-position/${position.id}`}
                            className="tempo-font text-[#10559A] hover:text-[#052049] font-bold transition-colors"
                          >
                            EDIT
                          </button>
                          <button
                            onClick={() => window.location.href = `/positions/${position.id}/candidates`}
                            className="tempo-font text-[#DC1125] hover:text-red-700 font-bold transition-colors"
                          >
                            VIEW
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
                      <span className="font-bold text-[#052049]">{paginatedData.totalItems}</span> positions
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

      {/* Create Position Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-[#052049]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white tempo-font tracking-tight">
                  CREATE NEW POSITION
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Start from Template (Optional)
                  </label>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                    <div
                      onClick={() => handleTemplateSelect('')}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTemplateId === ''
                          ? 'border-[#DC1125] bg-[#DC1125]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">Start from Scratch</div>
                      <div className="text-sm text-gray-500">Create a custom position without using a template</div>
                    </div>
                    
                    {templates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedTemplateId === template.id
                            ? 'border-[#DC1125] bg-[#DC1125]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-gray-900">{template.title}</div>
                        <div className="text-sm text-gray-500">{template.description || 'No description'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Position Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position Title *
                    </label>
                    <input
                      type="text"
                      value={newPositionTitle}
                      onChange={(e) => setNewPositionTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                      placeholder="Enter position title..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position Description
                    </label>
                    <textarea
                      value={newPositionDescription}
                      onChange={(e) => setNewPositionDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                      placeholder="Brief description of this position..."
                    />
                  </div>
                </div>

                {createError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <span className="text-sm text-red-700">{createError}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitCreatePosition}
                disabled={isCreating || !newPositionTitle.trim()}
                className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#DC1125] hover:bg-[#052049] disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    CREATING...
                  </>
                ) : selectedTemplateId ? (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    CREATE FROM TEMPLATE
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    CREATE CUSTOM POSITION
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