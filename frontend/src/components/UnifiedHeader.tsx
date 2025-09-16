// frontend/src/components/UnifiedHeader.tsx
"use client"
import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Ship, Anchor, Plus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface UnifiedHeaderProps {
  currentPage: 'dashboard' | 'positions' | 'candidates' | 'review';
  user: User | null;
}

export default function UnifiedHeader({ currentPage, user }: UnifiedHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  const navigation = [
    { name: 'TEMPLATES', page: 'dashboard', href: '/dashboard' },
    { name: 'POSITIONS', page: 'positions', href: '/positions' },
    { name: 'CANDIDATES', page: 'candidates', href: '/candidates' },
    { name: 'REVIEW', page: 'review', href: '/review' },
  ];

  return (
    <header className="bg-[#052049] shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex items-center mr-8">
              <Ship className="h-8 w-8 text-white mr-2" />
              <div>
                <h1 className="text-xl font-bold text-white tempo-font tracking-tight">
                  CARNIVAL VIP RECRUITMENT
                </h1>
                <p className="text-xs text-white/70">Enterprise Interview Platform</p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex space-x-8">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`tempo-font px-3 py-2 rounded-md text-sm font-bold tracking-tight transition-colors ${
                    currentPage === item.page
                      ? 'bg-white/20 text-white border-b-2 border-[#DC1125]'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Right side - User menu and actions */}
          <div className="flex items-center space-x-4">
            {/* Quick Action Buttons */}
            {currentPage === 'dashboard' && (
              <button
                onClick={() => router.push('/create-template')}
                className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                TEMPLATE
              </button>
            )}
            
            {currentPage === 'positions' && (
              <button
                onClick={() => router.push('/create-position')}
                className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                POSITION
              </button>
            )}

            {/* User Info */}
            {user && (
              <div className="flex items-center text-white">
                <User className="h-5 w-5 mr-2" />
                <div className="text-sm">
                  <div className="font-medium tempo-font">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="text-xs text-white/70">{user.email}</div>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="tempo-font inline-flex items-center px-3 py-2 border border-white/30 text-sm font-bold rounded-md text-white bg-white/10 hover:bg-red-600 hover:border-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-1" />
              LOGOUT
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3">
          <div className="flex space-x-1">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => router.push(item.href)}
                className={`tempo-font flex-1 px-3 py-2 rounded-md text-xs font-bold tracking-tight transition-colors ${
                  currentPage === item.page
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}