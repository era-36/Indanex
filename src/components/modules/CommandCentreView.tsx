import React, { useMemo, useState } from 'react';
import { AlertCircle, Download, Filter, Plus } from 'lucide-react';
import type { ModuleKey, OperationalDataset } from '../../types/industrial';
import {
  computeKPIs,
  exportRowsToCsv,
  filterDataset,
  type AnalyticsFilter,
} from '../../utils/analyticsEngine';

interface CommandCentreViewProps {
  dataset: OperationalDataset;
  onNavigateModule: (mod: ModuleKey) => void;
  onLoadSampleTemplate?: () => void;
  isSandbox: boolean;
}

export function CommandCentreView({
  dataset,
  onNavigateModule,
  onLoadSampleTemplate,
  isSandbox,
}: CommandCentreViewProps) {
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const filter: AnalyticsFilter = { departmentId, dateFrom, dateTo };
  const filtered = useMemo(() => filterDataset(dataset, filter), [dataset, departmentId, dateFrom, dateTo]);
  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);

  const hasAnyOperationalData =
    dataset.productionOrders.length > 0 ||
    dataset.qualityInspections.length > 0 ||
    dataset.inventory.length > 0 ||
    dataset.purchaseOrders.length > 0 ||
    dataset.machines.length > 0;

  const alerts = useMemo(() => {
    const list: { id: string; severity: 'high' | 'medium'; module: ModuleKey; message: string }[] = [];
    for (const item of filtered.inventory) {
      if (item.currentStock <= item.minStock) {
        list.push({
          id: `inv_${item.id}`,
          severity: 'high',
          module: 'inventory',
          message: `Inventory shortage: ${item.name} (${item.currentStock} ${item.unit} remaining vs min ${item.minStock} ${item.unit}).`,
        });
      }
    }
    for (const ord of filtered.productionOrders) {
      if (ord.status === 'delayed') {
        list.push({
          id: `ord_${ord.id}`,
          severity: 'high',
          module: 'production',
          message: `Delayed production order ${ord.orderCode} (${ord.productName}) — due ${ord.dueDate}.`,
        });
      }
    }
    for (const po of filtered.purchaseOrders) {
      if (po.status === 'delayed' || po.status === 'delivered_late') {
        list.push({
          id: `po_${po.id}`,
          severity: 'medium',
          module: 'suppliers',
          message: `Supplier delay on ${po.poNumber} (${po.materialName}) — expected ${po.expectedDate}.`,
        });
      }
    }
    for (const qc of filtered.qualityInspections) {
      if (qc.releaseStatus === 'awaiting_review') {
        list.push({
          id: `qc_${qc.id}`,
          severity: 'medium',
          module: 'quality',
          message: `Pending QA release: ${qc.inspectionCode} (${qc.subjectName}).`,
        });
      }
    }
    for (const doc of filtered.complianceDocuments) {
      if (doc.status === 'expired' || doc.status === 'expiring_soon') {
        list.push({
          id: `cmp_${doc.id}`,
          severity: doc.status === 'expired' ? 'high' : 'medium',
          module: 'compliance',
          message: `Compliance ${doc.status.replace('_', ' ')}: ${doc.title} (Expiry: ${doc.expiryDate}).`,
        });
      }
    }
    return list;
  }, [filtered]);

  const handleDownloadSnapshot = () => {
    const csv = exportRowsToCsv(
      ['Metric', 'Value'],
      [
        ['Company', dataset.company.name],
        ['Department Filter', departmentId],
        ['Date From', dateFrom || 'All'],
        ['Date To', dateTo || 'All'],
        ['Total Production Orders', kpis.totalProductionOrders],
        ['Completed Production Orders', kpis.completedProductionOrders],
        ['Delayed Orders', kpis.delayedOrders],
        ['Pending Quality Inspections', kpis.pendingQualityInspections],
        ['Rejected Batches', kpis.rejectedBatches],
        ['Inventory Shortage Alerts', kpis.inventoryShortageAlerts],
        ['Supplier Delays', kpis.supplierDelays],
        ['Avg Machine Utilization (%)', kpis.avgMachineUtilizationPct ?? 'Insufficient data'],
        ['Production Efficiency (%)', kpis.productionEfficiencyPct ?? 'Insufficient data'],
        ['Quality Rejection (%)', kpis.qualityRejectionPct ?? 'Insufficient data'],
        ['Operational Cost (INR)', kpis.operationalCostInr],
        ['Inventory Valuation (INR)', kpis.totalInventoryValuationInr],
      ]
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selaqui-command-centre-kpis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!hasAnyOperationalData) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 sm:p-12 text-center max-w-2xl mx-auto mt-6">
        <h2 className="font-display text-xl font-bold text-slate-950 mb-2">
          No Operational Records Logged Yet
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          {dataset.company.name} currently has zero recorded production orders, inventory
          items, or quality inspections. Selaqui Industrial Intelligence never fabricates KPI
          metrics—log your first operational record below to begin real-time tracking.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateModule('production')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log First Production Order
          </button>
          <button
            type="button"
            onClick={() => onNavigateModule('quality')}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            Record QC Inspection
          </button>
          {onLoadSampleTemplate && !isSandbox && (
            <button
              type="button"
              onClick={onLoadSampleTemplate}
              className="px-4 py-2 text-sm font-medium text-blue-700 hover:underline cursor-pointer"
            >
              Load Sample Plant Template
            </button>
          )}
        </div>
      </div>
    );
  }

  const maxOrderQty = Math.max(
    1,
    ...filtered.productionOrders.map((o) => Math.max(o.targetQty, o.actualQty))
  );

  const qcBreakdown = [
    {
      label: 'Pass',
      count: filtered.qualityInspections.filter((q) => q.result === 'pass').length,
      color: 'bg-emerald-600',
    },
    {
      label: 'Conditional',
      count: filtered.qualityInspections.filter((q) => q.result === 'conditional').length,
      color: 'bg-amber-500',
    },
    {
      label: 'Fail',
      count: filtered.qualityInspections.filter((q) => q.result === 'fail').length,
      color: 'bg-red-600',
    },
    {
      label: 'Pending',
      count: filtered.qualityInspections.filter((q) => q.result === 'pending').length,
      color: 'bg-slate-400',
    },
  ];
  const qcTotal = Math.max(1, filtered.qualityInspections.length);

  return (
    <div className="space-y-6">
      {/* Filter & Export Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label
              htmlFor="cc-dept-filter"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              Department
            </label>
            <select
              id="cc-dept-filter"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
            >
              <option value="all">All Departments</option>
              {dataset.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="cc-date-from"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              From Date
            </label>
            <input
              id="cc-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label
              htmlFor="cc-date-to"
              className="block text-xs font-medium text-slate-600 mb-1"
            >
              To Date
            </label>
            <input
              id="cc-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md font-mono"
            />
          </div>

          {(departmentId !== 'all' || dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => {
                setDepartmentId('all');
                setDateFrom('');
                setDateTo('');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 border border-slate-200 rounded-md cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDownloadSnapshot}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download KPI CSV
        </button>
      </div>

      {/* Primary KPI Grid (11 Data-Based Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Production Orders', value: String(kpis.totalProductionOrders), tone: 'text-slate-950' },
          { label: 'Completed Orders', value: String(kpis.completedProductionOrders), tone: 'text-emerald-700' },
          { label: 'Delayed Orders', value: String(kpis.delayedOrders), tone: kpis.delayedOrders > 0 ? 'text-red-700' : 'text-slate-950' },
          {
            label: 'Production Efficiency',
            value: kpis.productionEfficiencyPct !== null ? `${kpis.productionEfficiencyPct}%` : 'No orders',
            tone: 'text-blue-700',
          },
          { label: 'Pending QC Inspections', value: String(kpis.pendingQualityInspections), tone: kpis.pendingQualityInspections > 0 ? 'text-amber-700' : 'text-slate-950' },
          { label: 'Rejected Batches', value: String(kpis.rejectedBatches), tone: kpis.rejectedBatches > 0 ? 'text-red-700' : 'text-slate-950' },
          {
            label: 'Quality Rejection Rate',
            value: kpis.qualityRejectionPct !== null ? `${kpis.qualityRejectionPct}%` : 'No QC data',
            tone: (kpis.qualityRejectionPct ?? 0) > 10 ? 'text-red-700' : 'text-slate-950',
          },
          { label: 'Inventory Shortage Alerts', value: String(kpis.inventoryShortageAlerts), tone: kpis.inventoryShortageAlerts > 0 ? 'text-red-700' : 'text-slate-950' },
          { label: 'Supplier Delays', value: String(kpis.supplierDelays), tone: kpis.supplierDelays > 0 ? 'text-amber-700' : 'text-slate-950' },
          {
            label: 'Avg Machine Utilization',
            value: kpis.avgMachineUtilizationPct !== null ? `${kpis.avgMachineUtilizationPct}%` : 'No machines',
            tone: 'text-slate-950',
          },
          {
            label: 'Operational & PO Cost',
            value: `₹${kpis.operationalCostInr.toLocaleString('en-IN')}`,
            tone: 'text-slate-950',
          },
          {
            label: 'Stock Valuation',
            value: `₹${kpis.totalInventoryValuationInr.toLocaleString('en-IN')}`,
            tone: 'text-slate-950',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between"
          >
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
            <p className={`font-mono text-xl sm:text-2xl font-semibold tabular-nums mt-2 ${card.tone}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts + Operational Alerts Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Production Output vs Target Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-950">
                Production Target vs Actual Output
              </h2>
              <p className="text-xs text-slate-500">
                Calculated from filtered production orders ({filtered.productionOrders.length} orders)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-slate-200 border border-slate-300 inline-block" />
                Target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-700 inline-block" />
                Actual
              </span>
            </div>
          </div>

          {filtered.productionOrders.length === 0 ? (
            <p className="text-sm text-slate-500 py-10 text-center">
              No production orders match the active filter.
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.productionOrders.map((ord) => {
                const targetW = Math.round((ord.targetQty / maxOrderQty) * 100);
                const actualW = Math.round((ord.actualQty / maxOrderQty) * 100);
                const pct = Math.round((ord.actualQty / ord.targetQty) * 100);
                return (
                  <div key={ord.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate pr-3">
                        <span className="font-mono text-slate-500 mr-2">{ord.orderCode}</span>
                        {ord.productName}
                      </span>
                      <span className="font-mono text-slate-700 tabular-nums shrink-0">
                        {ord.actualQty.toLocaleString('en-IN')} / {ord.targetQty.toLocaleString('en-IN')} ({pct}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-sm overflow-hidden relative">
                      <div
                        className="h-full bg-slate-200 absolute top-0 left-0"
                        style={{ width: `${targetW}%` }}
                      />
                      <div
                        className={`h-full relative ${
                          ord.status === 'delayed' ? 'bg-red-600' : 'bg-blue-700'
                        }`}
                        style={{ width: `${actualW}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quality Inspection Distribution */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="font-display text-sm font-semibold text-slate-950 mb-3">
              Quality Inspection Outcomes ({filtered.qualityInspections.length} records)
            </h3>
            <div className="h-3 w-full bg-slate-100 rounded-sm overflow-hidden flex">
              {qcBreakdown.map(
                (seg) =>
                  seg.count > 0 && (
                    <div
                      key={seg.label}
                      className={`${seg.color} h-full`}
                      style={{ width: `${(seg.count / qcTotal) * 100}%` }}
                      title={`${seg.label}: ${seg.count}`}
                    />
                  )
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-xs text-slate-600">
              {qcBreakdown.map((seg) => (
                <div key={seg.label} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 inline-block ${seg.color}`} />
                  <span>{seg.label}:</span>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {seg.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Operational Alerts Panel */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-slate-950">
              Active Operational Alerts
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              {alerts.length} active
            </span>
          </div>

          {alerts.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8 text-sm text-slate-500 text-center">
              No active operational exceptions detected in the filtered view.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
              {alerts.map((al) => (
                <li key={al.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <AlertCircle
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        al.severity === 'high' ? 'text-red-600' : 'text-amber-600'
                      }`}
                    />
                    <p className="text-xs text-slate-700 leading-relaxed">{al.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateModule(al.module)}
                    className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Inspect
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
