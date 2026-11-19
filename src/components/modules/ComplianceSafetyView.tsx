import React, { useState } from 'react';
import { Check, Plus, ShieldAlert } from 'lucide-react';
import type {
  ComplianceDocument,
  OperationalDataset,
  SafetyIncident,
  UserRole,
} from '../../types/industrial';
import { generateRecordId } from '../../utils/validation';

interface ComplianceSafetyViewProps {
  dataset: OperationalDataset;
  userRole: UserRole;
  currentUid: string;
  onAddComplianceDoc: (doc: ComplianceDocument) => Promise<void>;
  onApproveComplianceDoc: (docId: string) => Promise<void>;
  onAddSafetyIncident: (incident: SafetyIncident) => Promise<void>;
  onCloseSafetyIncident: (incidentId: string) => Promise<void>;
}

export function ComplianceSafetyView({
  dataset,
  userRole,
  currentUid,
  onAddComplianceDoc,
  onApproveComplianceDoc,
  onAddSafetyIncident,
  onCloseSafetyIncident,
}: ComplianceSafetyViewProps) {
  const [showDocForm, setShowDocForm] = useState(false);
  const [showIncidentForm, setShowIncidentForm] = useState(false);

  // Compliance doc state
  const [docTitle, setDocTitle] = useState('');
  const [docFramework, setDocFramework] = useState(
    dataset.industrialProfile?.regulatoryFrameworks[0] || 'ISO 9001:2015'
  );
  const [docExpiry, setDocExpiry] = useState('2027-06-30');

  // Incident state
  const [incTitle, setIncTitle] = useState('');
  const [incSeverity, setIncSeverity] = useState<SafetyIncident['severity']>('medium');
  const [incDept, setIncDept] = useState(dataset.departments[0]?.id || '');
  const [incAction, setIncAction] = useState('');

  const canManage =
    userRole === 'super_admin' ||
    userRole === 'company_admin' ||
    userRole === 'department_manager';

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (docTitle.trim().length < 2) return;
    await onAddComplianceDoc({
      id: generateRecordId('cmp'),
      companyId: dataset.company.id,
      title: docTitle.trim(),
      framework: docFramework.trim() || 'Plant SOP',
      lastInspectionDate: new Date().toISOString().slice(0, 10),
      expiryDate: docExpiry,
      status: 'pending_approval',
      createdByUid: currentUid,
    });
    setDocTitle('');
    setShowDocForm(false);
  };

  const handleAddIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incTitle.trim().length < 3) return;
    await onAddSafetyIncident({
      id: generateRecordId('saf'),
      companyId: dataset.company.id,
      title: incTitle.trim(),
      ...(incDept ? { departmentId: incDept } : {}),
      severity: incSeverity,
      status: 'open',
      ...(incAction.trim() ? { correctiveAction: incAction.trim() } : {}),
      incidentDate: new Date().toISOString().slice(0, 10),
      createdByUid: currentUid,
    });
    setIncTitle('');
    setIncAction('');
    setShowIncidentForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Regulatory Disclaimer */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-900">Regulatory Compliance Notice:</span>{' '}
          Compliance checklists, expiry reminders, and incident records are configurable to your
          company’s industry frameworks ({dataset.industrialProfile?.regulatoryFrameworks.join(', ') || 'Plant Configured'}).
          Recording inspections in this platform supports internal audit readiness and does not
          guarantee statutory or regulatory certification.
        </p>
      </div>

      {/* Compliance Documents & Expiry Checklists */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950">
              Compliance Documents, Licenses & Checklists
            </h2>
            <p className="text-xs text-slate-500">
              Track inspection dates, expiry reminders, and manager approvals
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setShowDocForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Compliance Record
            </button>
          )}
        </div>

        {showDocForm && (
          <form onSubmit={handleAddDoc} className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="cmp-title" className="block text-xs font-medium text-slate-700 mb-1">
                  Document / Certificate Title *
                </label>
                <input
                  id="cmp-title"
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Cleanroom HEPA Filter Validation"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="cmp-fw" className="block text-xs font-medium text-slate-700 mb-1">
                  Regulatory Framework *
                </label>
                <input
                  id="cmp-fw"
                  type="text"
                  required
                  value={docFramework}
                  onChange={(e) => setDocFramework(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="cmp-exp" className="block text-xs font-medium text-slate-700 mb-1">
                  Expiry / Renewal Date *
                </label>
                <input
                  id="cmp-exp"
                  type="date"
                  required
                  value={docExpiry}
                  onChange={(e) => setDocExpiry(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDocForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md cursor-pointer"
              >
                Save Document
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Document / Checklist</th>
                <th className="py-3 px-4">Framework</th>
                <th className="py-3 px-4">Last Inspection</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {dataset.complianceDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    No compliance documents configured yet.
                  </td>
                </tr>
              ) : (
                dataset.complianceDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-medium text-slate-900">{doc.title}</td>
                    <td className="py-3 px-4 text-xs text-slate-600">{doc.framework}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      {doc.lastInspectionDate || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-900 tabular-nums">
                      {doc.expiryDate}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          doc.status === 'valid'
                            ? 'text-emerald-700'
                            : doc.status === 'expired'
                            ? 'text-red-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {doc.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canManage && doc.status !== 'valid' ? (
                        <button
                          type="button"
                          onClick={() => onApproveComplianceDoc(doc.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Valid
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {doc.approvedByUid ? 'Approved' : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Incidents */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-950">
              Safety Incident & Near-Miss Log
            </h2>
            <p className="text-xs text-slate-500">
              Report shop-floor safety events and track corrective actions
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowIncidentForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Safety Incident
          </button>
        </div>

        {showIncidentForm && (
          <form onSubmit={handleAddIncident} className="p-5 bg-slate-50 border-b border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="saf-title" className="block text-xs font-medium text-slate-700 mb-1">
                  Incident / Hazard Description *
                </label>
                <input
                  id="saf-title"
                  type="text"
                  required
                  value={incTitle}
                  onChange={(e) => setIncTitle(e.target.value)}
                  placeholder="Solvent drum grounding clamp loose in Tank Bay"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label htmlFor="saf-sev" className="block text-xs font-medium text-slate-700 mb-1">
                  Severity
                </label>
                <select
                  id="saf-sev"
                  value={incSeverity}
                  onChange={(e) => setIncSeverity(e.target.value as SafetyIncident['severity'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="saf-dept" className="block text-xs font-medium text-slate-700 mb-1">
                  Department
                </label>
                <select
                  id="saf-dept"
                  value={incDept}
                  onChange={(e) => setIncDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                >
                  {dataset.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="saf-action" className="block text-xs font-medium text-slate-700 mb-1">
                  Immediate Containment / Corrective Action
                </label>
                <input
                  id="saf-action"
                  type="text"
                  value={incAction}
                  onChange={(e) => setIncAction(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowIncidentForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#0B192C] rounded-md cursor-pointer"
              >
                Submit Incident
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {dataset.safetyIncidents.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No safety incidents reported.
            </p>
          ) : (
            dataset.safetyIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{inc.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{inc.incidentDate}</span> · Severity:{' '}
                    <span
                      className={`font-semibold uppercase ${
                        inc.severity === 'critical' || inc.severity === 'high'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {inc.severity}
                    </span>{' '}
                    · Status: <span className="uppercase font-medium">{inc.status}</span>
                  </p>
                  {inc.correctiveAction && (
                    <p className="text-xs text-slate-600 mt-1">
                      CAPA: {inc.correctiveAction}
                    </p>
                  )}
                </div>
                {canManage && inc.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => onCloseSafetyIncident(inc.id)}
                    className="px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-md shrink-0 cursor-pointer"
                  >
                    Mark Closed
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
