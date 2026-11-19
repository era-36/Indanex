import React, { useState } from 'react';
import { CheckCircle2, Plus, Shield, Users } from 'lucide-react';
import { INDUSTRY_SEGMENTS } from '../../data/industrySegments';
import type {
  Company,
  CompanyMember,
  DemoEnquiry,
  Department,
  ModuleKey,
  OperationalDataset,
  UserRole,
} from '../../types/industrial';
import { generateRecordId } from '../../utils/validation';

interface AdminConsoleViewProps {
  dataset: OperationalDataset;
  userRole: UserRole;
  currentUid: string;
  allCompanies: Company[];
  enquiries: DemoEnquiry[];
  onAddDepartment: (dept: Department) => Promise<void>;
  onAddMember: (member: CompanyMember) => Promise<void>;
  onToggleModule: (moduleKey: ModuleKey) => Promise<void>;
  onUpdateCompanyStatus?: (companyId: string, status: Company['registrationStatus']) => Promise<void>;
}

const MODULE_LABELS: { key: ModuleKey; label: string }[] = [
  { key: 'command_centre', label: 'Command Centre' },
  { key: 'quality', label: 'Quality Intelligence' },
  { key: 'inventory', label: 'Inventory Intelligence' },
  { key: 'production', label: 'Production Intelligence' },
  { key: 'suppliers', label: 'Supplier Intelligence' },
  { key: 'ai_predictions', label: 'AI Prediction Centre' },
  { key: 'compliance', label: 'Compliance & Safety' },
  { key: 'reports', label: 'Reports & Analytics' },
];

export function AdminConsoleView({
  dataset,
  userRole,
  currentUid,
  allCompanies,
  enquiries,
  onAddDepartment,
  onAddMember,
  onToggleModule,
  onUpdateCompanyStatus,
}: AdminConsoleViewProps) {
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptManager, setDeptManager] = useState('');

  const [memberUid, setMemberUid] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<CompanyMember['role']>('operator');
  const [memberDept, setMemberDept] = useState(dataset.departments[0]?.id || '');

  const isCompanyAdmin = userRole === 'company_admin' || userRole === 'super_admin';
  const isSuperAdmin = userRole === 'super_admin';
  const segDef = INDUSTRY_SEGMENTS[dataset.company.segment];

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deptName.trim().length < 2 || deptCode.trim().length < 2) return;
    await onAddDepartment({
      id: generateRecordId('dept'),
      companyId: dataset.company.id,
      name: deptName.trim(),
      code: deptCode.trim().toUpperCase(),
      ...(deptManager.trim() ? { managerName: deptManager.trim() } : {}),
      createdByUid: currentUid,
    });
    setDeptName('');
    setDeptCode('');
    setDeptManager('');
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (memberName.trim().length < 2 || !memberEmail.includes('@')) return;
    await onAddMember({
      uid: memberUid.trim() || generateRecordId('usr'),
      companyId: dataset.company.id,
      displayName: memberName.trim(),
      email: memberEmail.trim(),
      role: memberRole,
      ...(memberDept ? { departmentId: memberDept } : {}),
      status: 'active',
    });
    setMemberUid('');
    setMemberName('');
    setMemberEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Company Profile & Module Toggles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950">
                Company Profile & Plant Scope
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{segDef.name}</p>
            </div>
            <span
              className={`text-xs font-semibold uppercase ${
                dataset.company.registrationStatus === 'approved'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {dataset.company.registrationStatus}
            </span>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
            <div>
              <dt className="text-slate-500">Plant Name</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{dataset.company.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium text-slate-900 mt-0.5">{dataset.company.location}</dd>
            </div>
            <div>
              <dt className="text-slate-500">GSTIN</dt>
              <dd className="font-mono text-slate-900 mt-0.5">
                {dataset.company.gstNumber || 'Not specified'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Tenant ID</dt>
              <dd className="font-mono text-slate-700 mt-0.5 truncate">{dataset.company.id}</dd>
            </div>
          </dl>

          {dataset.industrialProfile && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-1.5">
                Validated Plant Problem Focus
              </p>
              <ul className="space-y-1 text-xs text-slate-600">
                {dataset.industrialProfile.validatedProblems.map((p) => (
                  <li key={p}>• {p}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="font-display text-base font-semibold text-slate-950 mb-1">
            Operational Module Configuration
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {isCompanyAdmin
              ? 'Enable or disable operational modules for this facility.'
              : 'Module configuration is managed by the Company Admin.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {MODULE_LABELS.map((m) => {
              const enabled = dataset.company.enabledModules.includes(m.key);
              return (
                <label
                  key={m.key}
                  className="flex items-center justify-between p-2.5 border border-slate-200 rounded-md text-xs cursor-pointer hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{m.label}</span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={!isCompanyAdmin || m.key === 'command_centre'}
                    onChange={() => onToggleModule(m.key)}
                    className="h-4 w-4 accent-blue-700"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Departments & Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Departments */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-950">
            Departments ({dataset.departments.length})
          </h2>

          {isCompanyAdmin && (
            <form onSubmit={handleCreateDept} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                aria-label="Department name"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department Name"
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
              <input
                type="text"
                required
                aria-label="Department code"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                placeholder="Code (e.g. QC-2)"
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Dept
              </button>
            </form>
          )}

          <ul className="divide-y divide-slate-100 text-xs">
            {dataset.departments.map((d) => (
              <li key={d.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{d.name}</p>
                  <p className="text-slate-500">{d.managerName || 'Manager unassigned'}</p>
                </div>
                <span className="font-mono text-slate-700">{d.code}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Team Members & RBAC */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700" />
            <h2 className="font-display text-base font-semibold text-slate-950">
              Authorized Plant Personnel ({dataset.members.length})
            </h2>
          </div>

          {isCompanyAdmin && (
            <form onSubmit={handleAddMember} className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  aria-label="Member full name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Full Name"
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
                <input
                  type="email"
                  required
                  aria-label="Member email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Email address"
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  aria-label="Firebase User UID (optional)"
                  value={memberUid}
                  onChange={(e) => setMemberUid(e.target.value)}
                  placeholder="User UID (optional)"
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md font-mono"
                />
                <select
                  aria-label="Assign role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as CompanyMember['role'])}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
                >
                  <option value="operator">Operator</option>
                  <option value="department_manager">Department Manager</option>
                  <option value="company_admin">Company Admin</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>
            </form>
          )}

          <ul className="divide-y divide-slate-100 text-xs">
            {dataset.members.map((m) => (
              <li key={m.uid} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{m.displayName}</p>
                  <p className="text-slate-500 truncate">{m.email}</p>
                </div>
                <span className="font-mono text-blue-700 uppercase shrink-0">
                  {m.role.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Super Admin Platform Governance */}
      {isSuperAdmin && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-950">
            <Shield className="w-4 h-4 text-blue-700" />
            <h2 className="font-display text-base font-semibold">
              Super Admin — Registered Companies & Demo Enquiries
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Segment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Governance Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allCompanies.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 px-3">
                      <p className="font-medium text-slate-900">{c.name}</p>
                      <p className="text-slate-500">{c.location}</p>
                    </td>
                    <td className="py-2.5 px-3 uppercase">{c.segment}</td>
                    <td className="py-2.5 px-3 font-semibold uppercase">{c.registrationStatus}</td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      {onUpdateCompanyStatus && c.registrationStatus !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => onUpdateCompanyStatus(c.id, 'approved')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-white bg-emerald-700 rounded-sm cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      {onUpdateCompanyStatus && c.registrationStatus === 'approved' && (
                        <button
                          type="button"
                          onClick={() => onUpdateCompanyStatus(c.id, 'suspended')}
                          className="px-2.5 py-1 text-red-700 border border-red-200 rounded-sm cursor-pointer"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {enquiries.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-700 mb-2">
                Recent Demo Enquiries ({enquiries.length})
              </h3>
              <ul className="divide-y divide-slate-100 text-xs">
                {enquiries.map((e) => (
                  <li key={e.id} className="py-2 flex justify-between gap-4">
                    <span>
                      <strong className="text-slate-900">{e.companyName}</strong> ({e.contactName} ·{' '}
                      {e.email}) — {e.message || 'Demo request'}
                    </span>
                    <span className="font-mono uppercase text-slate-500 shrink-0">{e.segment}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Immutable Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-950">
            Immutable Operational Audit Log
          </h2>
          <span className="font-mono text-xs text-slate-500">Append-only</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs">
          {dataset.auditLogs.length === 0 ? (
            <p className="py-6 text-center text-slate-500">No audit entries recorded yet.</p>
          ) : (
            dataset.auditLogs.map((log) => (
              <div key={log.id} className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono font-semibold text-slate-900 mr-2">{log.action}</span>
                  <span className="text-slate-600">{log.details}</span>
                </div>
                <div className="font-mono text-slate-500 shrink-0">
                  {log.actorEmail || log.actorUid} · {log.module}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
