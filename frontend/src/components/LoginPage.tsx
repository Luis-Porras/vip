//frontend/src/components/LoginPage.tsx

"use client"
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle, Ship, Anchor } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    console.log('About to make fetch request');
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('About to fetch login...');
      const response = await fetch('http://localhost:5000/api/auth/test', {
        method: 'POST',
         mode: 'cors', // Add this
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store the JWT token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect to dashboard
        window.location.href = '/dashboard';
        console.log('User logged in:', data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#052049] via-[#10559A] to-[#DC1125] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-xl"></div>
        <div className="absolute top-1/3 -right-10 w-60 h-60 bg-white/5 rounded-full blur-xl"></div>
        <div className="absolute -bottom-10 left-1/3 w-80 h-80 bg-white/5 rounded-full blur-xl"></div>
        
        {/* Enhanced Floating Icons with Brighter Glow and Staggered Animations */}
        {/* Top Row */}
        <Anchor className="absolute top-12 left-16 h-5 w-5 text-white/40 animate-pulse drop-shadow-lg" style={{animationDelay: '0s', animationDuration: '3s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'}} />
        <Ship className="absolute top-20 right-24 h-7 w-7 text-white/35 animate-pulse drop-shadow-lg" style={{animationDelay: '0.5s', animationDuration: '4s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.25))'}} />
        <Anchor className="absolute top-32 left-1/4 h-4 w-4 text-white/30 animate-pulse drop-shadow-md" style={{animationDelay: '1s', animationDuration: '3.5s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.2))'}} />
        <Ship className="absolute top-16 right-1/3 h-6 w-6 text-white/38 animate-pulse drop-shadow-lg" style={{animationDelay: '1.5s', animationDuration: '2.8s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.28))'}} />
        
        {/* Middle Row */}
        <Ship className="absolute top-1/2 left-12 h-6 w-6 text-white/33 animate-pulse drop-shadow-lg" style={{animationDelay: '2s', animationDuration: '3.2s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.23))'}} />
        <Anchor className="absolute top-1/2 right-16 h-5 w-5 text-white/36 animate-pulse drop-shadow-lg" style={{animationDelay: '2.5s', animationDuration: '4.2s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.26))'}} />
        <Ship className="absolute top-1/3 left-1/2 h-4 w-4 text-white/28 animate-pulse drop-shadow-md" style={{animationDelay: '3s', animationDuration: '2.5s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.18))'}} />
        <Anchor className="absolute top-2/3 right-1/4 h-6 w-6 text-white/34 animate-pulse drop-shadow-lg" style={{animationDelay: '3.5s', animationDuration: '3.8s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.24))'}} />
        
        {/* Bottom Row */}
        <Anchor className="absolute bottom-24 left-20 h-5 w-5 text-white/37 animate-pulse drop-shadow-lg" style={{animationDelay: '4s', animationDuration: '3.3s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.27))'}} />
        <Ship className="absolute bottom-32 right-28 h-7 w-7 text-white/32 animate-pulse drop-shadow-lg" style={{animationDelay: '4.5s', animationDuration: '2.7s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.22))'}} />
        <Anchor className="absolute bottom-16 left-1/3 h-4 w-4 text-white/31 animate-pulse drop-shadow-md" style={{animationDelay: '5s', animationDuration: '4.1s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.21))'}} />
        <Ship className="absolute bottom-28 right-1/3 h-5 w-5 text-white/35 animate-pulse drop-shadow-lg" style={{animationDelay: '5.5s', animationDuration: '3.6s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.25))'}} />
        
        {/* Additional Scattered Icons for More Random Feel */}
        <Anchor className="absolute top-1/4 left-1/3 h-3 w-3 text-white/25 animate-pulse drop-shadow-sm" style={{animationDelay: '6s', animationDuration: '2.9s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.15))'}} />
        <Ship className="absolute top-3/4 right-1/2 h-5 w-5 text-white/34 animate-pulse drop-shadow-lg" style={{animationDelay: '0.2s', animationDuration: '3.4s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.24))'}} />
        <Anchor className="absolute bottom-1/3 left-2/3 h-4 w-4 text-white/29 animate-pulse drop-shadow-md" style={{animationDelay: '1.2s', animationDuration: '4.3s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.19))'}} />
        <Ship className="absolute top-40 left-3/4 h-6 w-6 text-white/33 animate-pulse drop-shadow-lg" style={{animationDelay: '2.7s', animationDuration: '2.6s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.23))'}} />
        <Anchor className="absolute bottom-40 right-1/5 h-5 w-5 text-white/36 animate-pulse drop-shadow-lg" style={{animationDelay: '3.3s', animationDuration: '3.7s', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.26))'}} />
        
        {/* Corner Icons */}
        <Ship className="absolute top-8 left-8 h-4 w-4 text-white/26 animate-pulse drop-shadow-sm" style={{animationDelay: '1.8s', animationDuration: '4.4s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.16))'}} />
        <Anchor className="absolute top-10 right-10 h-3 w-3 text-white/24 animate-pulse drop-shadow-sm" style={{animationDelay: '4.2s', animationDuration: '2.8s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.14))'}} />
        <Ship className="absolute bottom-12 left-10 h-5 w-5 text-white/30 animate-pulse drop-shadow-md" style={{animationDelay: '0.8s', animationDuration: '3.9s', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.20))'}} />
        <Anchor className="absolute bottom-8 right-8 h-4 w-4 text-white/27 animate-pulse drop-shadow-sm" style={{animationDelay: '5.2s', animationDuration: '3.1s', filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.17))'}} />
      </div>
    <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-0">
            <img 
              src="/images/carnival-logo.png" 
              alt="Carnival Logo" 
              className="h-35 w-35 mx-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <Ship className="h-12 w-12 text-white mx-auto hidden" />
          </div>
          
          <h2 className="text-4xl font-bold text-white mb-2 tempo-font tracking-tight">
            CARNIVAL VIP
          </h2>
          <p className="text-xl text-white/90 tempo-font tracking-tight mb-2">
            RECRUITMENT PORTAL
          </p>
          <p className="text-sm text-white/70">
            Secure access to interview management system
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2 tempo-font tracking-tight">
                EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg shadow-sm placeholder-white/50 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 backdrop-blur-sm"
                placeholder="Enter your email address"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2 tempo-font tracking-tight">
                PASSWORD
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-white/20 border border-white/30 rounded-lg shadow-sm placeholder-white/50 text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 backdrop-blur-sm"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 flex items-center backdrop-blur-sm">
                <AlertCircle className="h-5 w-5 text-red-300 mr-3 flex-shrink-0" />
                <span className="text-sm text-red-200">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-bold text-[#052049] bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 tempo-font tracking-tight transform hover:scale-105"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#052049] mr-3"></div>
                  SIGNING IN...
                </div>
              ) : (
                <div className="flex items-center">
                  <LogIn className="h-5 w-5 mr-2" />
                  SIGN IN TO VIP PORTAL
                </div>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-2 tempo-font tracking-tight">
              DEMO ACCESS
            </h3>
            <div className="text-xs text-white/80 space-y-1">
              <p><strong>Email:</strong> test@company.com</p>
              <p><strong>Password:</strong> password123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-4 text-white/60 text-sm">
            <Ship className="h-4 w-4" />
            <span>Carnival Cruise Lines • VIP Recruitment System</span>
            <Anchor className="h-4 w-4" />
          </div>
          <p className="text-xs text-white/50 mt-2">
            Secure • Professional • Maritime Excellence
          </p>
        </div>
      </div>
    </div>
  );
}