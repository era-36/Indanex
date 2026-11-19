import React, { useState } from 'react';
import { CheckCircle, Download, Plus, Wrench } from 'lucide-react';
import type {
  MachineDowntime,
  OperationalDataset,
  ProductionOrder,
  UserRole,
} from '../../types/industrial';
import { exportRowsToCsv } from '../../utils/analyticsEngine';
import { generateRecordId } from '../../utils/validation';

interface ProductionModuleProps {
  dataset: OperationalDataset;
  userRole: UserRole;
  currentUid: string;
  onAddProductionOrder: (order: ProductionOrder) => Promise<void>;
  onUpdateProductionOrder: (orderId: string, patch: Partial<ProductionOrder>) => Promise<void>;
  onLogDowntime: (downtime: MachineDowntime, machineId: string, addHours: number) => Promise<void>;
}

export function ProductionModule({
  dataset,
  userRole,
  currentUid,
  onAddProductionOrder,
  onUpdateProductionOrder,
  onLogDowntime,
}: ProductionModuleProps) {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showDowntimeForm, setShowDowntimeForm] = useState(false);

  // Order form
  const [orderCode, setOrderCode] = useState('');
  const [productName, setProductName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [departmentId, setDepartmentId] = useState(dataset.departments[0]?.id || 'dept_default');
  const [machineId, setMachineId] = useState(dataset.machines[0]?.id || '');
  const [targetQty, setTargetQty] = useState('10000');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [operationalCostInr, setOperationalCostInr] = useState('45000');

  // Downtime form
  const [dtMachineId, setDtMachineId] = useState(dataset.machines[0]?.id || '');
  const [dtReason, setDtReason] = useState('');
  const [dtHours, setDtHours] = useState('2.5');
  const [dtType, setDtType] = useState<MachineDowntime['downtimeType']>('unplanned');

  const canManageSchedule =
    userRole === 'super_admin' ||
    userRole === 'company_admin' ||
    userRole === 'department_manager';

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (orderCode.trim().length < 2 || productName.trim().length < 2) return;
    const order: ProductionOrder = {
      id: generateRecordId('ord'),
      companyId: dataset.company.id,
      orderCode: orderCode.trim(),
      productName: productName.trim(),
      ...(batchCode.trim() ? { batchCode: batchCode.trim() } : {}),
      departmentId: departmentId || 'dept_default',
      ...(machineId ? { machineId } : {}),
      targetQty: Math.max(1, Number(targetQty)),
      actualQty: 0,
      reworkQty: 0,
      operationalCostInr: Math.max(0, Number(operationalCostInr)),
      dueDate,
      status: 'scheduled',
      createdByUid: currentUid,
    };
    await onAddProductionOrder(order);
    setOrderCode('');
    setProductName('');
    setBatchCode('');
    setShowOrderForm(false);
  };

  const handleDowntimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dtMachineId || dtReason.trim().length < 2) return;
    const hours = Math.max(0.5, Number(dtHours));
    const entry: MachineDowntime = {
      id: generateRecordId('dt'),
      companyId: dataset.company.id,
      machineId: dtMachineId,
      reason: dtReason.trim(),
      durationHours: hours,
      downtimeType: dtType,
      loggedDate: new Date().toISOString().slice(0, 10),
      createdByUid: currentUid,
    };
    await onLogDowntime(entry, dtMachineId, hours);
    setDtReason('');
    setShowDowntimeForm(false);
  };

  const handleExportCsv = () => {
    const csv = exportRowsToCsv(
      ['Order Code', 'Product', 'Batch', 'Target Qty', 'Actual Qty', 'Rework', 'Due Date', 'Status', 'Schedule Approved'],
      dataset.productionOrders.map((o) => [
        o.orderCode,
        o.productName,
        o.batchCode || '',
        o.targetQty,
        o.actualQty,
        o.reworkQty ?? 0,
        o.dueDate,
        o.status,
        o.scheduleApprovedByUid ? 'Yes' : 'Pending',
      ])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-4">
        <p className="text-xs text-slate-600">
          Production schedules require authorized human approval. Operators can log progress and
          machine downtime; Managers/Admins approve schedules and mark orders complete.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {dataset.machines.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDowntimeForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" />
              Log Machine Downtime
            </button>
          )}
          {canManageSchedule && (
            <button
              type="button"
              onClick={() => setShowOrderForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Production Order
            </button>
          )}
        </div>
      </div>

      {/* New Production Order Form */}
      {showOrderForm && (
        <form
          onSubmit={handleCreateOrder}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-950">
            Schedule Production Order
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ord-code" className="block text-xs font-medium text-slate-700 mb-1">
                Order Code *
              </label>
              <input
                id="ord-code"
                type="text"
                required
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="WO-2026-895"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="ord-product" className="block text-xs font-medium text-slate-700 mb-1">
                Product / SKU *
              </label>
              <input
                id="ord-product"
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Metformin 500mg SR Tablets"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="ord-batch" className="block text-xs font-medium text-slate-700 mb-1">
                Batch Code
              </label>
              <input
                id="ord-batch"
                type="text"
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="HM-2611-F"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="ord-dept" className="block text-xs font-medium text-slate-700 mb-1">
                Department *
              </label>
              <select
                id="ord-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                {dataset.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ord-machine" className="block text-xs font-medium text-slate-700 mb-1">
                Assigned Machine
              </label>
              <select
                id="ord-machine"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                <option value="">Unassigned</option>
                {dataset.machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ord-target" className="block text-xs font-medium text-slate-700 mb-1">
                Target Quantity *
              </label>
              <input
                id="ord-target"
                type="number"
                min="1"
                required
                value={targetQty}
                onChange={(e) => setTargetQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="ord-due" className="block text-xs font-medium text-slate-700 mb-1">
                Delivery Deadline *
              </label>
              <input
                id="ord-due"
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="w-48">
              <label htmlFor="ord-cost" className="block text-xs font-medium text-slate-700 mb-1">
                Estimated Ops Cost (INR)
              </label>
              <input
                id="ord-cost"
                type="number"
                min="0"
                value={operationalCostInr}
                onChange={(e) => setOperationalCostInr(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowOrderForm(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
              >
                Create Order
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Downtime Form */}
      {showDowntimeForm && (
        <form
          onSubmit={handleDowntimeSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-950">
            Log Machine Downtime Event
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="dt-machine" className="block text-xs font-medium text-slate-700 mb-1">
                Machine *
              </label>
              <select
                id="dt-machine"
                value={dtMachineId}
                onChange={(e) => setDtMachineId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                {dataset.machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dt-type" className="block text-xs font-medium text-slate-700 mb-1">
                Stoppage Type
              </label>
              <select
                id="dt-type"
                value={dtType}
                onChange={(e) => setDtType(e.target.value as MachineDowntime['downtimeType'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                <option value="unplanned">Unplanned Breakdown</option>
                <option value="maintenance">Scheduled Maintenance</option>
                <option value="changeover">Batch Changeover</option>
                <option value="power">Power / Utility Outage</option>
              </select>
            </div>
            <div>
              <label htmlFor="dt-hours" className="block text-xs font-medium text-slate-700 mb-1">
                Duration (Hours) *
              </label>
              <input
                id="dt-hours"
                type="number"
                step="0.5"
                min="0.5"
                required
                value={dtHours}
                onChange={(e) => setDtHours(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="dt-reason" className="block text-xs font-medium text-slate-700 mb-1">
                Root Cause / Notes *
              </label>
              <input
                id="dt-reason"
                type="text"
                required
                value={dtReason}
                onChange={(e) => setDtReason(e.target.value)}
                placeholder="Sensor fault or mechanical wear"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowDowntimeForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Record Downtime
            </button>
          </div>
        </form>
      )}

      {/* Production Orders Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-950">
            Production Orders & Batch Schedule
          </h2>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {dataset.productionOrders.length} orders
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Order & Batch</th>
                <th className="py-3 px-4">Product & Dept</th>
                <th className="py-3 px-4 text-right">Output / Target</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {dataset.productionOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No production orders scheduled yet.
                  </td>
                </tr>
              ) : (
                dataset.productionOrders.map((ord) => {
                  const dept = dataset.departments.find((d) => d.id === ord.departmentId);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4">
                        <p className="font-mono text-xs font-semibold text-slate-950">
                          {ord.orderCode}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">{ord.batchCode || 'No batch'}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{ord.productName}</p>
                        <p className="text-xs text-slate-500">{dept?.name || ord.departmentId}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        <p className="font-semibold text-slate-950">
                          {ord.actualQty.toLocaleString('en-IN')} / {ord.targetQty.toLocaleString('en-IN')}
                        </p>
                        {(ord.reworkQty ?? 0) > 0 && (
                          <p className="text-amber-700">Rework: {ord.reworkQty?.toLocaleString('en-IN')}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                        {ord.dueDate}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold uppercase ${
                            ord.status === 'completed'
                              ? 'text-emerald-700'
                              : ord.status === 'delayed'
                              ? 'text-red-700'
                              : ord.status === 'in_progress'
                              ? 'text-blue-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {ord.status.replace('_', ' ')}
                        </span>
                        {!ord.scheduleApprovedByUid && (
                          <p className="text-[11px] text-amber-700 mt-0.5">Awaiting schedule approval</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                        {ord.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateProductionOrder(ord.id, {
                                actualQty: Math.min(
                                  ord.targetQty,
                                  ord.actualQty + Math.round(ord.targetQty * 0.25)
                                ),
                                status: 'in_progress',
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-sm cursor-pointer"
                          >
                            +25% Output
                          </button>
                        )}
                        {canManageSchedule && !ord.scheduleApprovedByUid && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateProductionOrder(ord.id, {
                                scheduleApprovedByUid: currentUid,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-sm cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve Schedule
                          </button>
                        )}
                        {canManageSchedule && ord.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateProductionOrder(ord.id, {
                                actualQty: ord.targetQty,
                                status: 'completed',
                              })
                            }
                            className="px-2.5 py-1 text-xs font-medium text-white bg-[#0B192C] hover:bg-blue-800 rounded-sm cursor-pointer"
                          >
                            Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Machine Utilization & Downtime Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-slate-950 mb-4">
            Plant Machine Utilization
          </h3>
          {dataset.machines.length === 0 ? (
            <p className="text-sm text-slate-500">No machines registered yet.</p>
          ) : (
            <div className="space-y-4">
              {dataset.machines.map((m) => (
                <div key={m.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900">
                      <span className="font-mono text-slate-500 mr-2">{m.code}</span>
                      {m.name}
                    </span>
                    <span className="font-mono text-slate-700 tabular-nums">
                      {m.utilizationPct}% · {m.downtimeHoursMonth}h down ·{' '}
                      <span
                        className={
                          m.status === 'running'
                            ? 'text-emerald-700 font-semibold'
                            : 'text-amber-700 font-semibold'
                        }
                      >
                        {m.status}
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${
                        m.utilizationPct >= 80
                          ? 'bg-emerald-600'
                          : m.utilizationPct >= 65
                          ? 'bg-blue-700'
                          : 'bg-amber-600'
                      }`}
                      style={{ width: `${m.utilizationPct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="font-display text-sm font-semibold text-slate-950 mb-4">
            Recent Machine Downtime Logs
          </h3>
          {dataset.machineDowntime.length === 0 ? (
            <p className="text-sm text-slate-500">No machine downtime events logged.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {dataset.machineDowntime.map((d) => {
                const mac = dataset.machines.find((m) => m.id === d.machineId);
                return (
                  <li key={d.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {mac?.name || d.machineId} ·{' '}
                        <span className="text-amber-700 uppercase">{d.downtimeType}</span>
                      </p>
                      <p className="text-slate-600 mt-0.5">{d.reason}</p>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <p className="font-semibold text-slate-900">{d.durationHours} hrs</p>
                      <p className="text-slate-500">{d.loggedDate}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
