// frontend/src/components/CreatePosition.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Clock, Save, AlertCircle, Tag, Star, MapPin, ChevronDown } from 'lucide-react';

interface Template {
  id: string;
  title: string;
  description: string;
  created_at: string;
  is_active: boolean;
}

interface TemplateDetail {
  id: string;
  title: string;
  description: string;
  questions: TemplateQuestion[];
  keywords: TemplateKeyword[];
}

interface TemplateQuestion {
  id: string;
  question_text: string;
  time_limit: number;
  question_order: number;
}

interface TemplateKeyword {
  id: string;
  keyword: string;
  category: string;
  weight: number;
}

interface Question {
  id: string;
  text: string;
  timeLimit: number;
}

interface Keyword {
  id: string;
  keyword: string;
  category: string;
  weight: number;
}

export default function CreatePosition() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  
  // Template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isLoadingTemplateDetail, setIsLoadingTemplateDetail] = useState(false);
  
  // Form state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'keywords'>('questions');

  useEffect(() => {
    fetchTemplates();
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
        setTemplates(data.filter((t: Template) => t.is_active)); // Only show active templates
      } else {
        setError('Failed to load templates');
      }
    } catch (error) {
      setError('Network error loading templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const loadTemplateData = async (templateId: string) => {
    if (!templateId) return;
    
    setIsLoadingTemplateDetail(true);
    try {
      const token = localStorage.getItem('authToken');
      
      // Get template details
      const templateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      // Get template keywords
      const keywordsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}/keywords`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        const keywordsData = keywordsResponse.ok ? await keywordsResponse.json() : { keywords: [] };
        
        // Populate position with template data (making copies for editing)
        if (!title) {
          setTitle(`${templateData.title} - Position`);
        }
        if (!description) {
          setDescription(templateData.description);
        }
        
        // Copy questions for position customization
        const positionQuestions = templateData.questions.map((q: TemplateQuestion, index: number) => ({
          id: `pos-${Date.now()}-${index}`, // New IDs for position
          text: q.question_text,
          timeLimit: q.time_limit
        }));
        setQuestions(positionQuestions);

        // Copy keywords for position customization
        const positionKeywords = keywordsData.keywords.map((k: TemplateKeyword, index: number) => ({
          id: `pos-${Date.now()}-${index}`, // New IDs for position
          keyword: k.keyword,
          category: k.category,
          weight: k.weight
        }));
        setKeywords(positionKeywords);
      }
    } catch (error) {
      setError('Failed to load template data');
    } finally {
      setIsLoadingTemplateDetail(false);
    }
  };

  const handleTemplateSelection = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId) {
      loadTemplateData(templateId);
    } else {
      // Clear form if no template selected
      setQuestions([]);
      setKeywords([]);
    }
  };

  // Question management
  const addQuestion = () => {
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      text: '',
      timeLimit: 90
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | number) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Keyword management
  const addKeyword = (newKeyword: string, category: string, weight: number) => {
    if (!newKeyword.trim()) return;
    
    const keyword: Keyword = {
      id: `new-${Date.now()}`,
      keyword: newKeyword.trim().toLowerCase(),
      category,
      weight
    };
    
    setKeywords([...keywords, keyword]);
  };

  const removeKeyword = (id: string) => {
    setKeywords(keywords.filter(k => k.id !== id));
  };

  const updateKeyword = (id: string, field: keyof Keyword, value: string | number) => {
    setKeywords(keywords.map(k => 
      k.id === id ? { ...k, [field]: value } : k
    ));
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!title.trim()) {
      setError('Position title is required');
      return;
    }

    if (!selectedTemplateId) {
      setError('Please select a template');
      return;
    }

    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (validQuestions.length === 0) {
      setError('At least one question is required');
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('authToken');
      
      // Create position
      const positionResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          template_id: selectedTemplateId,
          questions: validQuestions.map(q => ({
            text: q.text.trim(),
            timeLimit: q.timeLimit
          })),
          keywords: keywords.map(k => ({
            keyword: k.keyword,
            category: k.category,
            weight: k.weight
          }))
        }),
      });

      const positionData = await positionResponse.json();

      if (!positionResponse.ok) {
        throw new Error(positionData.error || 'Failed to create position');
      }

      setSuccess('Position created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedTemplateId('');
      setQuestions([]);
      setKeywords([]);
      
      // Redirect to positions dashboard
      setTimeout(() => {
        window.location.href = '/positions';
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'bg-blue-100 text-blue-800';
      case 'soft_skills': return 'bg-green-100 text-green-800';
      case 'experience': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const goBack = () => {
    window.location.href = '/positions';
  };

  const keywordsByCategory = keywords.reduce((acc, keyword) => {
    if (!acc[keyword.category]) {
      acc[keyword.category] = [];
    }
    acc[keyword.category].push(keyword);
    return acc;
  }, {} as Record<string, Keyword[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Carnival-Branded Header */}
      <header className="bg-[#052049] shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={goBack}
              className="flex items-center text-white hover:text-gray-300 mr-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Positions
            </button>
            <h1 className="text-xl font-bold text-white tempo-font tracking-tight">
              CREATE JOB POSITION
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {/* Position Details */}
            <div className="mb-8">
              <div className="p-4 border-b border-gray-200 bg-[#10559A] rounded-t-lg">
                <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                  POSITION DETAILS
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Template Selection */}
                <div>
                  <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Base Template *
                  </label>
                  {isLoadingTemplates ? (
                    <div className="flex items-center p-3 border border-gray-300 rounded-md bg-gray-50">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-gray-500">Loading templates...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        id="template"
                        value={selectedTemplateId}
                        onChange={(e) => handleTemplateSelection(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125] appearance-none bg-white"
                      >
                        <option value="">Choose a template to start from...</option>
                        {templates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  )}
                  {selectedTemplateId && (
                    <p className="mt-2 text-sm text-[#10559A]">
                      Questions and keywords from this template have been loaded and can be customized for this position.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Position Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                    placeholder="e.g., Senior Software Engineer - Miami Office"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Position Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                    placeholder="Brief description of this specific position..."
                  />
                </div>
              </div>
            </div>

            {/* Show loading state when template is being loaded */}
            {isLoadingTemplateDetail && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125] mx-auto mb-4"></div>
                <p className="text-gray-600">Loading template data...</p>
              </div>
            )}

            {/* Only show tabs if we have a template selected and loaded */}
            {selectedTemplateId && !isLoadingTemplateDetail && (
              <>
                {/* Tab Navigation */}
                <div className="mb-6">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('questions')}
                        className={`tempo-font whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm tracking-tight transition-colors ${
                          activeTab === 'questions'
                            ? 'border-[#DC1125] text-[#DC1125]'
                            : 'border-transparent text-gray-500 hover:text-[#10559A] hover:border-[#10559A]'
                        }`}
                      >
                        QUESTIONS ({questions.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('keywords')}
                        className={`tempo-font whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm tracking-tight transition-colors ${
                          activeTab === 'keywords'
                            ? 'border-[#DC1125] text-[#DC1125]'
                            : 'border-transparent text-gray-500 hover:text-[#10559A] hover:border-[#10559A]'
                        }`}
                      >
                        <Tag className="w-4 h-4 inline mr-1" />
                        AI KEYWORDS ({keywords.length})
                      </button>
                    </nav>
                  </div>
                </div>

                {/* Questions Tab */}
                {activeTab === 'questions' && (
                  <div className="mb-8">
                    <div className="p-4 border-b border-gray-200 bg-[#10559A] rounded-t-lg">
                      <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                          POSITION QUESTIONS
                        </h2>
                        <button
                          onClick={addQuestion}
                          className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          ADD QUESTION
                        </button>
                      </div>
                      <p className="text-sm text-white/90 mt-2">
                        Customize questions for this specific position. Changes won't affect the original template.
                      </p>
                    </div>

                    <div className="p-6 space-y-4">
                      {questions.map((question, index) => (
                        <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:border-[#10559A]/30 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-sm font-medium text-gray-700 tempo-font">Question {index + 1}</h3>
                            {questions.length > 1 && (
                              <button
                                onClick={() => removeQuestion(question.id)}
                                className="text-[#DC1125] hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Question Text *
                              </label>
                              <textarea
                                value={question.text}
                                onChange={(e) => updateQuestion(question.id, 'text', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                                placeholder="Enter your interview question..."
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-[#10559A]" />
                              <label className="text-xs font-medium text-gray-600">
                                Time Limit:
                              </label>
                              <select
                                value={question.timeLimit}
                                onChange={(e) => updateQuestion(question.id, 'timeLimit', parseInt(e.target.value))}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                              >
                                <option value={30}>30 seconds</option>
                                <option value={60}>1 minute</option>
                                <option value={90}>1.5 minutes</option>
                                <option value={120}>2 minutes</option>
                                <option value={180}>3 minutes</option>
                                <option value={300}>5 minutes</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords Tab */}
                {activeTab === 'keywords' && (
                  <div className="mb-8">
                    <div className="p-4 border-b border-gray-200 bg-[#10559A] rounded-t-lg">
                      <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                        AI KEYWORD MATCHING
                      </h2>
                      <p className="text-sm text-white/90 mt-2">
                        Customize keywords for this position. Changes won't affect the original template.
                      </p>
                    </div>

                    <div className="p-6">
                      {/* Keywords Display */}
                      {keywords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Tag className="w-8 h-8 mx-auto mb-2 text-[#10559A]/40" />
                          <p className="tempo-font text-[#052049] font-medium">NO KEYWORDS LOADED</p>
                          <p className="text-xs">Select a template above to load keywords for customization</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(keywordsByCategory).map(([category, categoryKeywords]) => (
                            <div key={category} className="border border-[#10559A]/20 rounded-lg p-4 bg-[#10559A]/5">
                              <h3 className="text-sm font-bold text-[#052049] mb-3 flex items-center tempo-font tracking-tight">
                                <span className="mr-2">{getCategoryIcon(category)}</span>
                                {category.replace('_', ' ').toUpperCase()} ({categoryKeywords.length})
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {categoryKeywords.map((keyword) => (
                                  <div
                                    key={keyword.id}
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getCategoryColor(keyword.category)}`}
                                  >
                                    <span>{keyword.keyword}</span>
                                    {keyword.weight > 1 && (
                                      <span className="ml-1 flex items-center">
                                        <Star className="w-3 h-3 ml-1" />
                                        {keyword.weight}x
                                      </span>
                                    )}
                                    <button
                                      onClick={() => removeKeyword(keyword.id)}
                                      className="ml-2 text-current hover:text-red-600 transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Messages */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 flex items-center">
                <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-3">
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={goBack}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !selectedTemplateId}
                className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#DC1125] hover:bg-[#052049] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DC1125] disabled:opacity-50 transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    CREATING...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    CREATE POSITION
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}