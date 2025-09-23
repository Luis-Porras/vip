// frontend/src/components/UnifiedHeader.tsx
"use client"
import React from 'react';
import { MapPin, Play, Star, Users, BarChart3, LogOut, Ship } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface UnifiedHeaderProps {
  currentPage: 'positions' | 'templates' | 'evaluations' | 'candidates' | 'analytics';
  user?: User | null;
}

export default function UnifiedHeader({ currentPage, user }: UnifiedHeaderProps) {
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  const navigationItems = [
    {
      key: 'positions',
      label: 'Positions',
      icon: MapPin,
      href: '/positions',
      description: 'Job Positions'
    },
    {
      key: 'templates',
      label: 'Templates', 
      icon: Play,
      href: '/dashboard',
      description: 'Interview Templates'
    },
    {
      key: 'evaluations',
      label: 'Evaluations',
      icon: Star,
      href: '/review',
      description: 'Video Reviews'
    },
    {
      key: 'candidates',
      label: 'Candidates',
      icon: Users,
      href: '/candidates',
      description: 'Candidate Management'
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      href: '/analytics',
      description: 'Reports & Analytics'
    }
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      {/* Top Brand Bar */}
      <div className="bg-[#052049]">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center">
              <img 
                src="/images/carnival-logo.png" 
                alt="Carnival Logo" 
                className="h-8 w-8 mr-2 object-contain"
              />
              <span className="text-lg font-bold text-white tempo-font tracking-tight">
                CARNIVAL VIP
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-xs text-white/80">
                Welcome, {user?.first_name} {user?.last_name}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-gray-300 hover:text-white transition-colors text-xs"
              >
                <LogOut className="h-3 w-3 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-0">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            
            return (
              <button
                key={item.key}
                onClick={() => window.location.href = item.href}
                className={`tempo-font relative px-6 py-4 text-sm font-bold tracking-tight transition-all duration-200 border-b-3 ${
                  isActive
                    ? 'border-[#DC1125] text-[#DC1125] bg-[#DC1125]/5'
                    : 'border-transparent text-gray-600 hover:text-[#10559A] hover:bg-gray-50 hover:border-[#10559A]/30'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Icon className={`h-4 w-4 ${
                    isActive ? 'text-[#DC1125]' : 'text-gray-500'
                  }`} />
                  <span>{item.label.toUpperCase()}</span>
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DC1125] to-[#052049] rounded-t-lg"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}