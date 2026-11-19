import React, { useState } from 'react';
import {
  Activity,
  BrainCircuit,
  ClipboardCheck,
  Factory,
  FileSpreadsheet,
  LogOut,
  Menu,
  Package,
  Settings,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react';
import type { Company, ModuleKey, UserRole } from '../types/industrial';

interface WorkspaceShellProps {
  company: Company;
  activeModule: ModuleKey;
  onSelectModule: (mod: ModuleKey) => void;
  userRole: UserRole;
  onChangeSandboxRole?: (role: UserRole) => void;
  isSandbox: boolean;
  userDisplayName: string;
  onExitToWebsite: () => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

const NAV_ITEMS: { key: ModuleKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'command_centre', label: 'Command Centre', icon: Activity },
  { key: 'quality', label: 'Quality Intelligence', icon: ClipboardCheck },
  { key: 'inventory', label: 'Inventory Intelligence', icon: Package },
  { key: 'production', label: 'Production Intelligence', icon: Factory },
  { key: 'suppliers', label: 'Supplier Intelligence', icon: Truck },
  { key: 'ai_predictions', label: 'AI Prediction Centre', icon: BrainCircuit },
  { key: 'compliance', label: 'Compliance & Safety', icon: ShieldAlert },
  { key: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet },
  { key: 'admin', label: 'Admin & Governance', icon: Settings },
];

export function WorkspaceShell({
  company,
  activeModule,
  onSelectModule,
  userRole,
  onChangeSandboxRole,
  isSandbox,
  userDisplayName,
  onExitToWebsite,
  onSignOut,
  children,
}: WorkspaceShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(
    (item) =>
      company.enabledModules.includes(item.key) ||
      item.key === 'admin' ||
      item.key === 'command_centre'
  );

  const activeNav = NAV_ITEMS.find((n) => n.key === activeModule) || NAV_ITEMS[0];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0B192C] text-slate-200">
      <div className="px-5 py-4 border-b border-slate-800">
        <button
          type="button"
          onClick={onExitToWebsite}
          className="font-display text-base font-bold tracking-tight text-white hover:text-sky-300 transition-colors text-left cursor-pointer"
        >
          Selaqui Industrial
        </button>
        <p className="text-xs text-slate-400 mt-1 truncate" title={company.name}>
          {company.name}
        </p>
      </div>

      <nav aria-label="Workspace Modules" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeModule;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelectModule(item.key);
                setDrawerOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer text-left ${
                active
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-3">
        {isSandbox && onChangeSandboxRole && (
          <div>
            <label
              htmlFor="sandbox-role-select"
              className="block text-[11px] font-medium text-slate-400 mb-1"
            >
              Preview Role Perspective
            </label>
            <select
              id="sandbox-role-select"
              value={userRole}
              onChange={(e) => onChangeSandboxRole(e.target.value as UserRole)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 text-slate-200 rounded-md focus:outline-none focus:border-blue-500"
            >
              <option value="company_admin">Industrial Company Admin</option>
              <option value="department_manager">Department Manager</option>
              <option value="operator">Employee / Operator</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-white truncate">{userDisplayName}</p>
            <p className="text-slate-400 capitalize">{userRole.replace('_', ' ')}</p>
          </div>
          <button
            type="button"
            onClick={isSandbox ? onExitToWebsite : onSignOut}
            aria-label={isSandbox ? 'Exit Sandbox' : 'Sign Out'}
            title={isSandbox ? 'Exit Sandbox to Website' : 'Sign Out'}
            className="p-2 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-slate-800 sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close workspace navigation"
              className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-white rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open workspace navigation"
              className="lg:hidden p-1.5 text-slate-700 hover:text-slate-950 border border-slate-200 rounded-md"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-500 hidden sm:inline truncate max-w-[200px]">
                {company.name}
              </span>
              <span className="text-slate-400 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-display font-semibold text-slate-950 truncate">
                {activeNav.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 shrink-0">
            <span className="hidden sm:inline">
              {isSandbox
                ? 'Interactive Demo Plant'
                : company.registrationStatus === 'approved'
                ? 'Verified Tenant'
                : `Registration: ${company.registrationStatus}`}
            </span>
            <button
              type="button"
              onClick={onExitToWebsite}
              className="px-3 py-1.5 font-medium text-slate-700 hover:text-slate-950 border border-slate-200 hover:border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Public Site
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
