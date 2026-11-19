import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { OperationalDataset } from '../../types/industrial';
import {
  computeKPIs,
  computeSupplierPerformance,
  exportRowsToCsv,
  filterDataset,
} from '../../utils/analyticsEngine';

interface ReportsAnalyticsViewProps {
  dataset: OperationalDataset;
}

type ReportType =
  | 'daily_ops'
  | 'weekly_perf'
  | 'monthly_perf'
  | 'quality'
  | 'inventory'
  | 'production'
  | 'supplier'
  | 'cost_analysis'
  | 'delay_analysis'
  | 'ai_recommendations';

const REPORT_TYPES: { id: ReportType; label: string; desc: string }[] = [
  { id: 'daily_ops', label: 'Daily Operational Report', desc: 'Production progress, pending QC, and active shortages' },
  { id: 'weekly_perf', label: 'Weekly Performance Report', desc: 'Order throughput, efficiency, and downtime summary' },
  { id: 'monthly_perf', label: 'Monthly Performance Report', desc: 'Full-month operational KPIs and valuation ledger' },
  { id: 'quality', label: 'Quality Control Report', desc: 'Inspections, defect categories, and QA release outcomes' },
  { id: 'inventory', label: 'Inventory & Valuation Report', desc: 'Stock levels, min/max alerts, and INR valuation' },
  { id: 'production', label: 'Production & Rework Report', desc: 'Targets, actuals, rework quantities, and schedules' },
  { id: 'supplier', label: 'Supplier Reliability Report', desc: 'Empirical on-time delivery and QC acceptance rates' },
  { id: 'cost_analysis', label: 'Cost Analysis Report', desc: 'Production operating costs and procurement spend' },
  { id: 'delay_analysis', label: 'Delay Analysis Report', desc: 'Delayed production orders and late supplier POs' },
  { id: 'ai_recommendations', label: 'AI Recommendation Log', desc: 'Saved Gemini and baseline operational recommendations' },
];

export function ReportsAnalyticsView({ dataset }: ReportsAnalyticsViewProps) {
  const [selectedReport, setSelectedReport] = useState<ReportType>('daily_ops');
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const filtered = useMemo(
    () => filterDataset(dataset, { departmentId, dateFrom, dateTo }),
    [dataset, departmentId, dateFrom, dateTo]
  );

  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const supplierPerf = useMemo(
    () =>
      computeSupplierPerformance(
        filtered.suppliers,
        filtered.purchaseOrders,
        filtered.qualityInspections
      ),
    [filtered]
  );

  const reportData = useMemo((): { headers: string[]; rows: Array<Array<string | number>> } => {
    switch (selectedReport) {
      case 'daily_ops':
      case 'weekly_perf':
      case 'monthly_perf':
        return {
          headers: ['KPI / Operational Metric', 'Calculated Value'],
          rows: [
            ['Company', filtered.company.name],
            ['Total Production Orders', kpis.totalProductionOrders],
            ['Completed Orders', kpis.completedProductionOrders],
            ['Delayed Orders', kpis.delayedOrders],
            ['Production Efficiency (%)', kpis.productionEfficiencyPct ?? 'No orders'],
            ['Pending QC Inspections', kpis.pendingQualityInspections],
            ['Rejected Batches', kpis.rejectedBatches],
            ['Quality Rejection (%)', kpis.qualityRejectionPct ?? 'No QC records'],
            ['Inventory Shortage Alerts', kpis.inventoryShortageAlerts],
            ['Supplier Delays', kpis.supplierDelays],
            ['Avg Machine Utilization (%)', kpis.avgMachineUtilizationPct ?? 'No machines'],
            ['Total Operational & PO Cost (INR)', kpis.operationalCostInr],
          ],
        };
      case 'quality':
        return {
          headers: ['Code', 'Type', 'Subject', 'Result', 'Release Status', 'Defect', 'Date'],
          rows: filtered.qualityInspections.map((q) => [
            q.inspectionCode,
            q.inspectionType,
            q.subjectName,
            q.result,
            q.releaseStatus,
            q.defectCategory || 'None',
            q.inspectedDate,
          ]),
        };
      case 'inventory':
        return {
          headers: ['SKU', 'Item', 'Category', 'Current', 'Min', 'Max', 'Unit', 'Valuation INR'],
          rows: filtered.inventory.map((i) => [
            i.sku,
            i.name,
            i.itemType,
            i.currentStock,
            i.minStock,
            i.maxStock,
            i.unit,
            i.currentStock * i.unitCostInr,
          ]),
        };
      case 'production':
        return {
          headers: ['Order Code', 'Product', 'Target', 'Actual', 'Rework', 'Due Date', 'Status'],
          rows: filtered.productionOrders.map((o) => [
            o.orderCode,
            o.productName,
            o.targetQty,
            o.actualQty,
            o.reworkQty ?? 0,
            o.dueDate,
            o.status,
          ]),
        };
      case 'supplier':
        return {
          headers: ['Supplier', 'Category', 'POs', 'Late POs', 'On-Time %', 'QC Pass %', 'Spend INR'],
          rows: supplierPerf.map((s) => [
            s.supplier.name,
            s.supplier.category,
            s.totalOrders,
            s.lateOrDelayedOrders,
            s.onTimeDeliveryPct ?? 'No data',
            s.qcPassPct ?? 'No data',
            s.totalProcurementInr,
          ]),
        };
      case 'cost_analysis':
        return {
          headers: ['Cost Source', 'Reference', 'Amount (INR)'],
          rows: [
            ...filtered.productionOrders.map((o) => [
              'Production Order',
              `${o.orderCode} - ${o.productName}`,
              o.operationalCostInr ?? 0,
            ]),
            ...filtered.purchaseOrders
              .filter((p) => p.status !== 'cancelled')
              .map((p) => ['Purchase Order', `${p.poNumber} - ${p.materialName}`, p.totalCostInr]),
          ],
        };
      case 'delay_analysis':
        return {
          headers: ['Delay Type', 'Reference', 'Subject', 'Due / Expected Date', 'Status'],
          rows: [
            ...filtered.productionOrders
              .filter((o) => o.status === 'delayed')
              .map((o) => ['Production Order', o.orderCode, o.productName, o.dueDate, o.status]),
            ...filtered.purchaseOrders
              .filter((p) => p.status === 'delayed' || p.status === 'delivered_late')
              .map((p) => ['Purchase Order', p.poNumber, p.materialName, p.expectedDate, p.status]),
          ],
        };
      case 'ai_recommendations':
        return {
          headers: ['Domain', 'Summary', 'Recommended Action', 'Data Period', 'Sample Size'],
          rows: filtered.aiRecommendations.map((r) => [
            r.domain,
            r.summary,
            r.recommendedAction,
            r.dataPeriod,
            r.sampleSize,
          ]),
        };
    }
  }, [selectedReport, filtered, kpis, supplierPerf]);

  const handleDownloadCsv = () => {
    const csv = exportRowsToCsv(reportData.headers, reportData.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selaqui-${selectedReport}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="rep-type" className="block text-xs font-medium text-slate-600 mb-1">
              Report Template
            </label>
            <select
              id="rep-type"
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value as ReportType)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md"
            >
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-dept" className="block text-xs font-medium text-slate-600 mb-1">
              Department
            </label>
            <select
              id="rep-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="all">All Departments</option>
              {dataset.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="rep-from" className="block text-xs font-medium text-slate-600 mb-1">
              From
            </label>
            <input
              id="rep-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label htmlFor="rep-to" className="block text-xs font-medium text-slate-600 mb-1">
              To
            </label>
            <input
              id="rep-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-md font-mono"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-md cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export Report CSV
        </button>
      </div>

      {/* Report Preview Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-950">
              {REPORT_TYPES.find((r) => r.id === selectedReport)?.label}
            </h2>
            <p className="text-xs text-slate-500">
              {REPORT_TYPES.find((r) => r.id === selectedReport)?.desc}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {reportData.rows.length} rows
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                {reportData.headers.map((h) => (
                  <th key={h} className="py-3 px-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={reportData.headers.length}
                    className="py-10 text-center text-sm text-slate-500"
                  >
                    No authorized company records found for this report & filter selection.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`py-2.5 px-4 ${
                          typeof cell === 'number' ? 'font-mono tabular-nums text-slate-900' : 'text-slate-700'
                        }`}
                      >
                        {typeof cell === 'number' ? cell.toLocaleString('en-IN') : cell}
                      </td>
                    ))}
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
