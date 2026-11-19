import React, { useState } from 'react';
import { Building2, LogIn, Play, X } from 'lucide-react';
import { SEGMENT_LIST } from '../data/industrySegments';
import type { IndustrySegment } from '../types/industrial';

interface AuthOnboardingModalProps {
  isOpen: boolean;
  initialMode: 'signin' | 'register';
  isAuthenticated: boolean;
  userEmail?: string | null;
  onClose: () => void;
  onGoogleSignIn: () => Promise<void>;
  onRegisterCompany: (input: {
    companyName: string;
    segment: IndustrySegment;
    location: string;
    gstNumber?: string;
  }) => Promise<void>;
  onEnterSandbox: () => void;
  authError: string | null;
  loading: boolean;
}

export function AuthOnboardingModal({
  isOpen,
  initialMode,
  isAuthenticated,
  userEmail,
  onClose,
  onGoogleSignIn,
  onRegisterCompany,
  onEnterSandbox,
  authError,
  loading,
}: AuthOnboardingModalProps) {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [companyName, setCompanyName] = useState('');
  const [segment, setSegment] = useState<IndustrySegment>('pharma');
  const [location, setLocation] = useState('Selaqui Industrial Area, Dehradun, Uttarakhand');
  const [gstNumber, setGstNumber] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (companyName.trim().length < 2) {
      setLocalError('Company name must be at least 2 characters.');
      return;
    }
    if (location.trim().length < 2) {
      setLocalError('Plant location is required.');
      return;
    }
    await onRegisterCompany({
      companyName: companyName.trim(),
      segment,
      location: location.trim(),
      gstNumber: gstNumber.trim() || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between">
          <h2 id="auth-modal-title" className="font-display text-base font-semibold">
            {isAuthenticated
              ? 'Register Industrial Company Workspace'
              : mode === 'register'
              ? 'Company Onboarding & Sign-In'
              : 'Sign In to Command Centre'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 text-slate-300 hover:text-white rounded-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {(authError || localError) && (
            <div
              role="alert"
              className="p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md"
            >
              {localError || authError}
            </div>
          )}

          {!isAuthenticated ? (
            <>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-slate-950 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Existing Account
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-slate-950 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Register Company
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {mode === 'register'
                    ? 'Authenticate with your verified Google Workspace or corporate account first to establish your Company Admin identity.'
                    : 'Sign in with Google to access your company’s isolated Firestore workspace and role-gated modules.'}
                </p>

                <button
                  type="button"
                  disabled={loading}
                  onClick={onGoogleSignIn}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Authenticating...' : 'Continue with Google Sign-In'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs font-medium text-slate-500 mb-2">
                  Want to inspect the live platform before signing in?
                </p>
                <button
                  type="button"
                  onClick={onEnterSandbox}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                >
                  <Play className="w-4 h-4 text-blue-700" />
                  Launch Interactive Selaqui Demo Plant
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <p className="text-xs text-slate-500">
                Signed in as <span className="font-medium text-slate-800">{userEmail}</span>.
                Complete your industrial plant profile below.
              </p>

              <div>
                <label
                  htmlFor="reg-company-name"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Company Legal / Plant Name *
                </label>
                <input
                  id="reg-company-name"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Shivalik Specialty Formulations Pvt. Ltd."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-segment"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Industrial Segment *
                </label>
                <select
                  id="reg-segment"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as IndustrySegment)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                >
                  {SEGMENT_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reg-location"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Facility Address *
                </label>
                <input
                  id="reg-location"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label
                  htmlFor="reg-gst"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  GSTIN (Optional)
                </label>
                <input
                  id="reg-gst"
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="05XXXXX0000X1ZX"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onEnterSandbox}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Preview Demo Plant Instead
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  {loading ? 'Creating Workspace...' : 'Create Company Workspace'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
