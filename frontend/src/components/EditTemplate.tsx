//frontend/src/components/EditTemplate.tsx
"use client"
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Clock, Save, AlertCircle, Tag, Star } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  timeLimit: number;
  question_order: number;
}

interface Keyword {
  id: string;
  keyword: string;
  category: string;
  weight: number;
}

interface TemplateData {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  keywords: Keyword[];
}

export default function EditTemplate({ templateId }: { templateId: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  
  // Keywords state
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newKeywordCategory, setNewKeywordCategory] = useState('technical');
  const [newKeywordWeight, setNewKeywordWeight] = useState(1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'questions' | 'keywords'>('questions');

  useEffect(() => {
    if (templateId) {
      loadTemplateData();
    }
  }, [templateId]);

  const loadTemplateData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Load template details
      const templateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // Load keywords
      const keywordsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}/keywords`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        
        // Set template basic info
        setTitle(templateData.title);
        setDescription(templateData.description || '');
        
        // Set questions with proper mapping
        const mappedQuestions = templateData.questions.map((q: any, index: number) => ({
          id: q.id,
          text: q.question_text,
          timeLimit: q.time_limit,
          question_order: q.question_order
        }));
        setQuestions(mappedQuestions);

        // Set keywords
        if (keywordsResponse.ok) {
          const keywordsData = await keywordsResponse.json();
          setKeywords(keywordsData.keywords || []);
        }
      } else {
        setError('Failed to load template data');
      }
    } catch (error) {
      setError('Failed to load template data');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `new-${Date.now()}`,
      text: '',
      timeLimit: 90,
      question_order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter(q => q.id !== id).map((q, index) => ({
        ...q,
        question_order: index + 1
      })));
    }
  };

  const updateQuestion = (id: string, field: keyof Question, value: string | number) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Keyword management functions
  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    
    const keyword: Keyword = {
      id: `new-${Date.now()}`,
      keyword: newKeyword.trim().toLowerCase(),
      category: newKeywordCategory,
      weight: newKeywordWeight
    };
    
    setKeywords([...keywords, keyword]);
    setNewKeyword('');
    setNewKeywordWeight(1);
  };

  const removeKeyword = (id: string) => {
    setKeywords(keywords.filter(k => k.id !== id));
  };

  const updateKeyword = (id: string, field: keyof Keyword, value: string | number) => {
    setKeywords(keywords.map(k => 
      k.id === id ? { ...k, [field]: value } : k
    ));
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical':
        return 'bg-blue-100 text-blue-800';
      case 'soft_skills':
        return 'bg-green-100 text-green-800';
      case 'experience':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical':
        return '🔧';
      case 'soft_skills':
        return '🤝';
      case 'experience':
        return '💼';
      default:
        return '📋';
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (!title.trim()) {
      setError('Template title is required');
      return;
    }

    const validQuestions = questions.filter(q => q.text.trim() !== '');
    if (validQuestions.length === 0) {
      setError('At least one question is required');
      return;
    }

    setIsSaving(true);

    try {
      const token = localStorage.getItem('authToken');
      
      // Update template basic info
      const updateTemplateResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            questions: validQuestions.map((q, index) => ({
              id: q.id.startsWith('new-') ? undefined : q.id, // Let backend generate new IDs
              text: q.text.trim(),
              timeLimit: q.timeLimit,
              question_order: index + 1
            }))
          }),
        }
      );

      if (!updateTemplateResponse.ok) {
        const errorData = await updateTemplateResponse.json();
        throw new Error(errorData.error || 'Failed to update template');
      }

      // Update keywords if any
      if (keywords.length > 0) {
        const keywordsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/templates/${templateId}/keywords`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              keywords: keywords.map(k => ({
                keyword: k.keyword,
                category: k.category,
                weight: k.weight
              }))
            }),
          }
        );

        if (!keywordsResponse.ok) {
          console.warn('Template updated but keywords failed to save');
        }
      }

      setSuccess('Template updated successfully!');
      
      // Redirect back to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);

    } catch (error: any) {
      setError(error.message || 'Failed to update template');
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    if (window.confirm('Are you sure you want to leave? Any unsaved changes will be lost.')) {
      window.location.href = '/dashboard';
    }
  };

  const keywordsByCategory = keywords.reduce((acc, keyword) => {
    if (!acc[keyword.category]) {
      acc[keyword.category] = [];
    }
    acc[keyword.category].push(keyword);
    return acc;
  }, {} as Record<string, Keyword[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#DC1125]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Carnival-Branded Header - SOLID NAVY */}
      <header className="bg-[#052049] shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={goBack}
              className="flex items-center text-white hover:text-gray-300 mr-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Back to Dashboard
            </button>
            <h1 className="text-xl font-bold text-white tempo-font tracking-tight">
              EDIT INTERVIEW TEMPLATE
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {/* Template Details */}
            <div className="mb-8">
              <div className="p-4 border-b border-gray-200 bg-[#10559A] rounded-t-lg">
                <h2 className="text-lg font-bold text-white tempo-font tracking-tight">
                  TEMPLATE DETAILS
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Template Title *
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                    placeholder="e.g., Software Engineer Interview"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125] focus:border-[#DC1125]"
                    placeholder="Brief description of this interview template..."
                  />
                </div>
              </div>
            </div>

            {/* Carnival-Branded Tab Navigation */}
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
                      INTERVIEW QUESTIONS
                    </h2>
                    <button
                      onClick={addQuestion}
                      className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      ADD QUESTION
                    </button>
                  </div>
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
                    Add keywords that you want to find in candidate responses. These will be used to automatically score candidates based on their speech.
                  </p>
                </div>

                <div className="p-6">
                  {/* Add New Keyword */}
                  <div className="bg-[#10559A]/10 border border-[#10559A]/20 rounded-lg p-4 mb-6">
                    <h3 className="text-sm font-medium text-[#052049] mb-3 tempo-font tracking-tight">ADD NEW KEYWORD</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                          placeholder="Enter keyword or phrase..."
                          onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                        />
                      </div>
                      <div>
                        <select
                          value={newKeywordCategory}
                          onChange={(e) => setNewKeywordCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                        >
                          <option value="technical">🔧 Technical</option>
                          <option value="soft_skills">🤝 Soft Skills</option>
                          <option value="experience">💼 Experience</option>
                          <option value="general">📋 General</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <label className="text-xs text-gray-600">Weight:</label>
                          <select
                            value={newKeywordWeight}
                            onChange={(e) => setNewKeywordWeight(parseFloat(e.target.value))}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#DC1125]"
                          >
                            <option value={1}>1x</option>
                            <option value={2}>2x</option>
                            <option value={3}>3x</option>
                            <option value={5}>5x</option>
                          </select>
                        </div>
                        <button
                          onClick={addKeyword}
                          disabled={!newKeyword.trim()}
                          className="tempo-font px-3 py-2 bg-[#DC1125] text-white rounded-md text-sm font-bold hover:bg-[#052049] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ADD
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Keywords Display */}
                  {keywords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Tag className="w-8 h-8 mx-auto mb-2 text-[#10559A]/40" />
                      <p className="tempo-font text-[#052049] font-medium">NO KEYWORDS ADDED YET</p>
                      <p className="text-xs">Add keywords above to enable AI-powered candidate scoring</p>
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

            {/* Carnival-Branded Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                onClick={goBack}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="tempo-font inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#DC1125] hover:bg-[#052049] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DC1125] disabled:opacity-50 transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    UPDATING...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    UPDATE TEMPLATE
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