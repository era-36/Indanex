import React, { useMemo, useState } from 'react';
import { Check, Download, Plus, Truck } from 'lucide-react';
import type {
  OperationalDataset,
  PurchaseOrder,
  Supplier,
  UserRole,
} from '../../types/industrial';
import { computeSupplierPerformance, exportRowsToCsv } from '../../utils/analyticsEngine';
import { generateRecordId } from '../../utils/validation';

interface SuppliersModuleProps {
  dataset: OperationalDataset;
  userRole: UserRole;
  currentUid: string;
  onAddSupplier: (sup: Supplier) => Promise<void>;
  onAddPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  onUpdatePurchaseOrder: (poId: string, patch: Partial<PurchaseOrder>) => Promise<void>;
}

export function SuppliersModule({
  dataset,
  userRole,
  currentUid,
  onAddSupplier,
  onAddPurchaseOrder,
  onUpdatePurchaseOrder,
}: SuppliersModuleProps) {
  const [showSupForm, setShowSupForm] = useState(false);
  const [showPoForm, setShowPoForm] = useState(false);

  // Supplier form
  const [supName, setSupName] = useState('');
  const [supCategory, setSupCategory] = useState('Raw Materials');
  const [supContact, setSupContact] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supCity, setSupCity] = useState('');

  // PO form
  const [poNumber, setPoNumber] = useState('');
  const [poSupplierId, setPoSupplierId] = useState(dataset.suppliers[0]?.id || '');
  const [poMaterial, setPoMaterial] = useState('');
  const [poQty, setPoQty] = useState('100');
  const [poUnit, setPoUnit] = useState('kg');
  const [poCost, setPoCost] = useState('50000');
  const [poExpectedDate, setPoExpectedDate] = useState(new Date().toISOString().slice(0, 10));

  const canManage =
    userRole === 'super_admin' ||
    userRole === 'company_admin' ||
    userRole === 'department_manager';

  const supplierMetrics = useMemo(
    () =>
      computeSupplierPerformance(
        dataset.suppliers,
        dataset.purchaseOrders,
        dataset.qualityInspections
      ),
    [dataset.suppliers, dataset.purchaseOrders, dataset.qualityInspections]
  );

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supName.trim().length < 2) return;
    await onAddSupplier({
      id: generateRecordId('sup'),
      companyId: dataset.company.id,
      name: supName.trim(),
      category: supCategory.trim() || 'Materials',
      ...(supContact.trim() ? { contactName: supContact.trim() } : {}),
      ...(supEmail.trim() ? { contactEmail: supEmail.trim() } : {}),
      ...(supPhone.trim() ? { phone: supPhone.trim() } : {}),
      ...(supCity.trim() ? { city: supCity.trim() } : {}),
      status: 'approved',
      createdByUid: currentUid,
    });
    setSupName('');
    setSupContact('');
    setSupEmail('');
    setShowSupForm(false);
  };

  const handleAddPo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poNumber.trim().length < 2 || !poSupplierId || poMaterial.trim().length < 2) return;
    await onAddPurchaseOrder({
      id: generateRecordId('po'),
      companyId: dataset.company.id,
      poNumber: poNumber.trim(),
      supplierId: poSupplierId,
      materialName: poMaterial.trim(),
      quantity: Math.max(1, Number(poQty)),
      unit: poUnit.trim() || 'units',
      totalCostInr: Math.max(0, Number(poCost)),
      expectedDate: poExpectedDate,
      status: 'ordered',
      createdByUid: currentUid,
    });
    setPoNumber('');
    setPoMaterial('');
    setShowPoForm(false);
  };

  const handleExportCsv = () => {
    const csv = exportRowsToCsv(
      ['Supplier', 'Category', 'Status', 'Total POs', 'On-Time %', 'Late POs', 'QC Pass %', 'Procurement INR'],
      supplierMetrics.map((m) => [
        m.supplier.name,
        m.supplier.category,
        m.supplier.status,
        m.totalOrders,
        m.onTimeDeliveryPct ?? 'No delivery history',
        m.lateOrDelayedOrders,
        m.qcPassPct ?? 'No QC history',
        m.totalProcurementInr,
      ])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-slate-600">
          Supplier delivery reliability and quality acceptance rates are computed exclusively from
          logged Purchase Orders and Quality Inspections. New vendors without history display
          &ldquo;No history&rdquo; rather than fabricated ratings.
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
          {canManage && dataset.suppliers.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPoForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              New Purchase Order
            </button>
          )}
          {canManage && (
            <button
              type="button"
              onClick={() => setShowSupForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Register Supplier
            </button>
          )}
        </div>
      </div>

      {/* Add Supplier Form */}
      {showSupForm && (
        <form
          onSubmit={handleAddSupplier}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-950">
            Register New Supplier
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sup-name" className="block text-xs font-medium text-slate-700 mb-1">
                Supplier Name *
              </label>
              <input
                id="sup-name"
                type="text"
                required
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                placeholder="Doon Valley Chemicals"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="sup-cat" className="block text-xs font-medium text-slate-700 mb-1">
                Supply Category *
              </label>
              <input
                id="sup-cat"
                type="text"
                required
                value={supCategory}
                onChange={(e) => setSupCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="sup-city" className="block text-xs font-medium text-slate-700 mb-1">
                City / State
              </label>
              <input
                id="sup-city"
                type="text"
                value={supCity}
                onChange={(e) => setSupCity(e.target.value)}
                placeholder="Dehradun, Uttarakhand"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="sup-contact" className="block text-xs font-medium text-slate-700 mb-1">
                Contact Person
              </label>
              <input
                id="sup-contact"
                type="text"
                value={supContact}
                onChange={(e) => setSupContact(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="sup-email" className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                id="sup-email"
                type="email"
                value={supEmail}
                onChange={(e) => setSupEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="sup-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Phone
              </label>
              <input
                id="sup-phone"
                type="tel"
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowSupForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Save Supplier
            </button>
          </div>
        </form>
      )}

      {/* Create Purchase Order Form */}
      {showPoForm && (
        <form
          onSubmit={handleAddPo}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-950">
            Create Purchase Order
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="po-num" className="block text-xs font-medium text-slate-700 mb-1">
                PO Number *
              </label>
              <input
                id="po-num"
                type="text"
                required
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO-2026-420"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="po-sup" className="block text-xs font-medium text-slate-700 mb-1">
                Supplier *
              </label>
              <select
                id="po-sup"
                value={poSupplierId}
                onChange={(e) => setPoSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                {dataset.suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="po-mat" className="block text-xs font-medium text-slate-700 mb-1">
                Material / Component *
              </label>
              <input
                id="po-mat"
                type="text"
                required
                value={poMaterial}
                onChange={(e) => setPoMaterial(e.target.value)}
                placeholder="Alu-Alu Foil 25um"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="po-qty" className="block text-xs font-medium text-slate-700 mb-1">
                Quantity *
              </label>
              <input
                id="po-qty"
                type="number"
                min="1"
                required
                value={poQty}
                onChange={(e) => setPoQty(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="po-unit" className="block text-xs font-medium text-slate-700 mb-1">
                Unit
              </label>
              <input
                id="po-unit"
                type="text"
                value={poUnit}
                onChange={(e) => setPoUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="po-cost" className="block text-xs font-medium text-slate-700 mb-1">
                Total Value (INR)
              </label>
              <input
                id="po-cost"
                type="number"
                min="0"
                value={poCost}
                onChange={(e) => setPoCost(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="po-date" className="block text-xs font-medium text-slate-700 mb-1">
                Expected Date *
              </label>
              <input
                id="po-date"
                type="date"
                required
                value={poExpectedDate}
                onChange={(e) => setPoExpectedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowPoForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Issue PO
            </button>
          </div>
        </form>
      )}

      {/* Supplier Performance Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="font-display text-sm font-semibold text-slate-950">
            Supplier Performance & Empirical Reliability
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Supplier & Contact</th>
                <th className="py-3 px-4">Category & Status</th>
                <th className="py-3 px-4 text-right">PO Count</th>
                <th className="py-3 px-4 text-right">On-Time Delivery</th>
                <th className="py-3 px-4 text-right">QC Acceptance</th>
                <th className="py-3 px-4 text-right">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {supplierMetrics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No suppliers registered yet.
                  </td>
                </tr>
              ) : (
                supplierMetrics.map((m) => (
                  <tr key={m.supplier.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{m.supplier.name}</p>
                      <p className="text-xs text-slate-500">
                        {[m.supplier.city, m.supplier.contactName, m.supplier.phone]
                          .filter(Boolean)
                          .join(' · ') || 'No contact info'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs text-slate-800">{m.supplier.category}</p>
                      <p
                        className={`text-xs font-semibold uppercase mt-0.5 ${
                          m.supplier.status === 'approved'
                            ? 'text-emerald-700'
                            : m.supplier.status === 'probation'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {m.supplier.status}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {m.totalOrders} ({m.lateOrDelayedOrders} late)
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {m.onTimeDeliveryPct !== null ? `${m.onTimeDeliveryPct}%` : 'No delivery history'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                      {m.qcPassPct !== null ? `${m.qcPassPct}% (${m.qcFailCount} fail)` : 'No QC history'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900">
                      ₹{m.totalProcurementInr.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="font-display text-sm font-semibold text-slate-950">
            Purchase Orders & Delivery Tracking
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Material & Supplier</th>
                <th className="py-3 px-4 text-right">Qty / Value</th>
                <th className="py-3 px-4">Expected Date</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {dataset.purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                    No purchase orders logged yet.
                  </td>
                </tr>
              ) : (
                dataset.purchaseOrders.map((po) => {
                  const sup = dataset.suppliers.find((s) => s.id === po.supplierId);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-950">
                        {po.poNumber}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{po.materialName}</p>
                        <p className="text-xs text-slate-500">{sup?.name || po.supplierId}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        <p>{po.quantity} {po.unit || ''}</p>
                        <p className="text-slate-500">₹{po.totalCostInr.toLocaleString('en-IN')}</p>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 tabular-nums">
                        {po.expectedDate}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-xs font-semibold uppercase ${
                            po.status === 'delivered_on_time'
                              ? 'text-emerald-700'
                              : po.status === 'delayed' || po.status === 'delivered_late'
                              ? 'text-red-700'
                              : 'text-blue-700'
                          }`}
                        >
                          {po.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canManage && (po.status === 'ordered' || po.status === 'in_transit' || po.status === 'delayed') && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdatePurchaseOrder(po.id, {
                                status: po.status === 'delayed' ? 'delivered_late' : 'delivered_on_time',
                                deliveredDate: new Date().toISOString().slice(0, 10),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 rounded-sm cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark Delivered
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
    </div>
  );
}
