import React, { useMemo, useState } from 'react';
import { Check, Download, Plus, ShieldAlert, XCircle } from 'lucide-react';
import type {
  OperationalDataset,
  QualityInspection,
  UserRole,
} from '../../types/industrial';
import { exportRowsToCsv } from '../../utils/analyticsEngine';
import { generateRecordId } from '../../utils/validation';

interface QualityModuleProps {
  dataset: OperationalDataset;
  userRole: UserRole;
  currentUid: string;
  onAddInspection: (inspection: QualityInspection) => Promise<void>;
  onUpdateReleaseStatus: (
    inspectionId: string,
    releaseStatus: QualityInspection['releaseStatus'],
    correctiveAction?: string
  ) => Promise<void>;
}

export function QualityModule({
  dataset,
  userRole,
  currentUid,
  onAddInspection,
  onUpdateReleaseStatus,
}: QualityModuleProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRelease, setFilterRelease] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const [inspectionCode, setInspectionCode] = useState('');
  const [inspectionType, setInspectionType] =
    useState<QualityInspection['inspectionType']>('raw_material');
  const [subjectName, setSubjectName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [departmentId, setDepartmentId] = useState(dataset.departments[0]?.id || '');
  const [parametersChecked, setParametersChecked] = useState(
    dataset.industrialProfile?.qcParameters.join(', ') || ''
  );
  const [result, setResult] = useState<QualityInspection['result']>('pass');
  const [defectCategory, setDefectCategory] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canRelease =
    userRole === 'super_admin' ||
    userRole === 'company_admin' ||
    userRole === 'department_manager';

  const filteredInspections = useMemo(() => {
    return dataset.qualityInspections.filter((q) => {
      if (filterType !== 'all' && q.inspectionType !== filterType) return false;
      if (filterRelease !== 'all' && q.releaseStatus !== filterRelease) return false;
      return true;
    });
  }, [dataset.qualityInspections, filterType, filterRelease]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (inspectionCode.trim().length < 2 || subjectName.trim().length < 2) {
      setFormError('Inspection code and subject/material name are required.');
      return;
    }

    setSaving(true);
    try {
      const record: QualityInspection = {
        id: generateRecordId('qc'),
        companyId: dataset.company.id,
        inspectionCode: inspectionCode.trim(),
        inspectionType,
        subjectName: subjectName.trim(),
        ...(batchCode.trim() ? { batchCode: batchCode.trim() } : {}),
        ...(supplierId ? { supplierId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(parametersChecked.trim() ? { parametersChecked: parametersChecked.trim() } : {}),
        result,
        releaseStatus: 'awaiting_review',
        ...(defectCategory.trim() ? { defectCategory: defectCategory.trim() } : {}),
        ...(correctiveAction.trim() ? { correctiveAction: correctiveAction.trim() } : {}),
        inspectedDate: new Date().toISOString().slice(0, 10),
        createdByUid: currentUid,
      };
      await onAddInspection(record);
      setInspectionCode('');
      setSubjectName('');
      setBatchCode('');
      setDefectCategory('');
      setCorrectiveAction('');
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to save QC inspection.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCsv = () => {
    const csv = exportRowsToCsv(
      [
        'Code',
        'Type',
        'Subject',
        'Batch',
        'Parameters',
        'Result',
        'Release Status',
        'Defect Category',
        'Corrective Action',
        'Date',
      ],
      filteredInspections.map((q) => [
        q.inspectionCode,
        q.inspectionType,
        q.subjectName,
        q.batchCode || '',
        q.parametersChecked || '',
        q.result,
        q.releaseStatus,
        q.defectCategory || '',
        q.correctiveAction || '',
        q.inspectedDate,
      ])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quality-inspections-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Governance Notice */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <span className="font-semibold text-slate-900">Human QA Release Control:</span>{' '}
            All submitted inspections enter as <span className="font-mono">awaiting_review</span>.
            Only authorized Department Managers or Company Admins can release or reject materials
            and batches. AI risk signals never approve formal QC release.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? 'Close Form' : 'Log QC Inspection'}
          </button>
        </div>
      </div>

      {/* Configurable Parameters Summary */}
      {dataset.industrialProfile && (
        <div className="bg-slate-100/70 border border-slate-200 rounded-lg px-4 py-3 text-xs text-slate-700">
          <span className="font-semibold text-slate-900 mr-2">Configured Segment QC Parameters:</span>
          <span>{dataset.industrialProfile.qcParameters.join(' · ')}</span>
        </div>
      )}

      {/* Create Inspection Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-950">
            New Quality Inspection Record
          </h2>
          {formError && (
            <div role="alert" className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="qc-code" className="block text-xs font-medium text-slate-700 mb-1">
                Inspection Code *
              </label>
              <input
                id="qc-code"
                type="text"
                required
                value={inspectionCode}
                onChange={(e) => setInspectionCode(e.target.value)}
                placeholder="QC-RM-2611-08"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>

            <div>
              <label htmlFor="qc-type" className="block text-xs font-medium text-slate-700 mb-1">
                Inspection Type *
              </label>
              <select
                id="qc-type"
                value={inspectionType}
                onChange={(e) =>
                  setInspectionType(e.target.value as QualityInspection['inspectionType'])
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                <option value="raw_material">Raw Material</option>
                <option value="in_process">In-Process Check</option>
                <option value="batch_release">Batch Release</option>
                <option value="component">Component IQC</option>
              </select>
            </div>

            <div>
              <label htmlFor="qc-result" className="block text-xs font-medium text-slate-700 mb-1">
                Lab / Test Observation *
              </label>
              <select
                id="qc-result"
                value={result}
                onChange={(e) => setResult(e.target.value as QualityInspection['result'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                <option value="pass">Pass</option>
                <option value="conditional">Conditional</option>
                <option value="fail">Fail</option>
                <option value="pending">Pending Lab Result</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="qc-subject" className="block text-xs font-medium text-slate-700 mb-1">
                Material / Product Name *
              </label>
              <input
                id="qc-subject"
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Paracetamol API Lot #512"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="qc-batch" className="block text-xs font-medium text-slate-700 mb-1">
                Batch / Lot Code
              </label>
              <input
                id="qc-batch"
                type="text"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="HM-2611-E"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>

            <div>
              <label htmlFor="qc-supplier" className="block text-xs font-medium text-slate-700 mb-1">
                Supplier (if incoming)
              </label>
              <select
                id="qc-supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                <option value="">Internal / Not Applicable</option>
                {dataset.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="qc-params" className="block text-xs font-medium text-slate-700 mb-1">
                Inspection Parameters Checked
              </label>
              <input
                id="qc-params"
                type="text"
                value={parametersChecked}
                onChange={(e) => setParametersChecked(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="qc-defect" className="block text-xs font-medium text-slate-700 mb-1">
                Defect Category (if any)
              </label>
              <input
                id="qc-defect"
                type="text"
                value={defectCategory}
                onChange={(e) => setDefectCategory(e.target.value)}
                placeholder="e.g. Moisture out of spec, Visual defect"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label htmlFor="qc-capa" className="block text-xs font-medium text-slate-700 mb-1">
              Corrective / Preventive Action Notes
            </label>
            <input
              id="qc-capa"
              type="text"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              placeholder="Containment or supplier escalation action"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              {saving ? 'Saving...' : 'Submit Inspection Record'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by inspection type"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
        >
          <option value="all">All Inspection Types</option>
          <option value="raw_material">Raw Material</option>
          <option value="in_process">In-Process</option>
          <option value="batch_release">Batch Release</option>
          <option value="component">Component</option>
        </select>

        <select
          aria-label="Filter by release status"
          value={filterRelease}
          onChange={(e) => setFilterRelease(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
        >
          <option value="all">All Release States</option>
          <option value="awaiting_review">Awaiting Review</option>
          <option value="released">Released</option>
          <option value="rework">Rework</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Inspection Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Code & Date</th>
                <th className="py-3 px-4">Subject / Batch</th>
                <th className="py-3 px-4">Parameters & Defect</th>
                <th className="py-3 px-4">Test Result</th>
                <th className="py-3 px-4">QA Release</th>
                <th className="py-3 px-4 text-right">Authorized Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No quality inspection records found. Click &ldquo;Log QC Inspection&rdquo; to create one.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((qc) => (
                  <tr key={qc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 align-top">
                      <p className="font-mono text-xs font-semibold text-slate-900">
                        {qc.inspectionCode}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{qc.inspectedDate}</p>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <p className="font-medium text-slate-900">{qc.subjectName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {qc.inspectionType.replace('_', ' ')}
                        {qc.batchCode ? ` · Batch ${qc.batchCode}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs">
                      <p className="text-xs text-slate-700">{qc.parametersChecked || 'Standard checklist'}</p>
                      {qc.defectCategory && (
                        <p className="text-xs text-red-700 font-medium mt-1">
                          Defect: {qc.defectCategory}
                        </p>
                      )}
                      {qc.correctiveAction && (
                        <p className="text-xs text-slate-500 mt-0.5">{qc.correctiveAction}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`text-xs font-semibold uppercase ${
                          qc.result === 'pass'
                            ? 'text-emerald-700'
                            : qc.result === 'fail'
                            ? 'text-red-700'
                            : qc.result === 'conditional'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {qc.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`text-xs font-semibold ${
                          qc.releaseStatus === 'released'
                            ? 'text-emerald-700'
                            : qc.releaseStatus === 'rejected'
                            ? 'text-red-700'
                            : qc.releaseStatus === 'rework'
                            ? 'text-amber-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {qc.releaseStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                      {qc.releaseStatus === 'awaiting_review' ? (
                        canRelease ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onUpdateReleaseStatus(qc.id, 'released')}
                              aria-label={`Release ${qc.inspectionCode}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Release
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateReleaseStatus(qc.id, 'rejected')}
                              aria-label={`Reject ${qc.inspectionCode}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded-sm cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Manager sign-off required</span>
                        )
                      ) : (
                        <span className="text-xs text-slate-500">Decision recorded</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
