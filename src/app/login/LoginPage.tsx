'use client';

import { useState } from 'react';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAppStore((s) => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(password);
    if (!success) {
      setError('Invalid access code');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">CreditCommand</h1>
          <p className="text-sm text-muted mt-1">
            Private Financial Intelligence System
          </p>
        </div>

        {/* Login Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-muted mb-2">
                Access Code
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your access code"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
            </div>
            <button type="submit" className="btn-primary w-full">
              Access System
            </button>
          </form>
          <p className="text-xs text-muted text-center mt-4">
            This is a private system. Unauthorised access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
