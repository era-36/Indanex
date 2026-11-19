import React, { useMemo, useState } from 'react';
import { ArrowDownUp, Download, Plus } from 'lucide-react';
import type {
  InventoryItem,
  OperationalDataset,
  StockMovement,
  UserRole,
} from '../../types/industrial';
import { analyzeInventoryItem, exportRowsToCsv } from '../../utils/analyticsEngine';
import { generateRecordId } from '../../utils/validation';

interface InventoryModuleProps {
  dataset: OperationalDataset;
  userRole: UserRole;
  currentUid: string;
  onAddInventoryItem: (item: InventoryItem) => Promise<void>;
  onLogStockMovement: (item: InventoryItem, movement: StockMovement, nextStock: number) => Promise<void>;
}

export function InventoryModule({
  dataset,
  userRole,
  currentUid,
  onAddInventoryItem,
  onLogStockMovement,
}: InventoryModuleProps) {
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [movementTarget, setMovementTarget] = useState<InventoryItem | null>(null);

  // Add Item Form
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [itemType, setItemType] = useState<InventoryItem['itemType']>('raw_material');
  const [unit, setUnit] = useState('kg');
  const [currentStock, setCurrentStock] = useState('0');
  const [minStock, setMinStock] = useState('100');
  const [maxStock, setMaxStock] = useState('500');
  const [unitCostInr, setUnitCostInr] = useState('250');
  const [dailyConsumptionAvg, setDailyConsumptionAvg] = useState('15');
  const [formError, setFormError] = useState<string | null>(null);

  // Stock Movement Form
  const [movementType, setMovementType] = useState<StockMovement['movementType']>('inbound');
  const [movementQty, setMovementQty] = useState('50');
  const [movementRef, setMovementRef] = useState('');

  const canCreateItem =
    userRole === 'super_admin' ||
    userRole === 'company_admin' ||
    userRole === 'department_manager';

  const analyzedItems = useMemo(() => {
    return dataset.inventory
      .map(analyzeInventoryItem)
      .filter((a) => {
        if (itemTypeFilter !== 'all' && a.item.itemType !== itemTypeFilter) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        return true;
      });
  }, [dataset.inventory, itemTypeFilter, statusFilter]);

  const totalValuation = useMemo(
    () =>
      dataset.inventory.reduce(
        (sum, item) => sum + item.currentStock * item.unitCostInr,
        0
      ),
    [dataset.inventory]
  );

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const cur = Number(currentStock);
    const min = Number(minStock);
    const max = Number(maxStock);
    const cost = Number(unitCostInr);
    const daily = Number(dailyConsumptionAvg);

    if (sku.trim().length < 2 || name.trim().length < 2) {
      setFormError('SKU and material name are required.');
      return;
    }
    if (max < min) {
      setFormError('Maximum stock cannot be less than minimum stock.');
      return;
    }

    const newItem: InventoryItem = {
      id: generateRecordId('inv'),
      companyId: dataset.company.id,
      sku: sku.trim(),
      name: name.trim(),
      itemType,
      departmentId: dataset.departments[0]?.id,
      unit: unit.trim() || 'units',
      currentStock: Math.max(0, cur),
      minStock: Math.max(0, min),
      maxStock: Math.max(min, max),
      unitCostInr: Math.max(0, cost),
      dailyConsumptionAvg: Math.max(0, daily),
      createdByUid: currentUid,
    };
    await onAddInventoryItem(newItem);
    setSku('');
    setName('');
    setShowAddForm(false);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementTarget) return;
    const qty = Number(movementQty);
    if (!Number.isFinite(qty) || qty <= 0) return;

    let nextStock = movementTarget.currentStock;
    if (movementType === 'inbound' || movementType === 'return') {
      nextStock += qty;
    } else if (movementType === 'outbound') {
      nextStock = Math.max(0, nextStock - qty);
    } else if (movementType === 'adjustment') {
      nextStock = qty;
    }

    const mov: StockMovement = {
      id: generateRecordId('mov'),
      companyId: dataset.company.id,
      itemId: movementTarget.id,
      movementType,
      quantity: qty,
      ...(movementRef.trim() ? { reference: movementRef.trim() } : {}),
      createdByUid: currentUid,
    };
    await onLogStockMovement(movementTarget, mov, nextStock);
    setMovementTarget(null);
    setMovementRef('');
  };

  const handleExportCsv = () => {
    const csv = exportRowsToCsv(
      ['SKU', 'Name', 'Type', 'Current Stock', 'Min', 'Max', 'Unit', 'Valuation INR', 'Runway Days', 'Status', 'Reorder Qty'],
      analyzedItems.map((a) => [
        a.item.sku,
        a.item.name,
        a.item.itemType,
        a.item.currentStock,
        a.item.minStock,
        a.item.maxStock,
        a.item.unit,
        a.item.currentStock * a.item.unitCostInr,
        a.daysRemaining ?? 'N/A',
        a.status,
        a.recommendedReorderQty,
      ])
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Tracked SKUs</p>
          <p className="font-mono text-2xl font-semibold text-slate-950 tabular-nums mt-1">
            {dataset.inventory.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Shortage Alerts</p>
          <p className="font-mono text-2xl font-semibold text-red-700 tabular-nums mt-1">
            {dataset.inventory.filter((i) => i.currentStock <= i.minStock).length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Excess Stock Items</p>
          <p className="font-mono text-2xl font-semibold text-amber-700 tabular-nums mt-1">
            {dataset.inventory.filter((i) => i.maxStock > 0 && i.currentStock > i.maxStock).length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Total Stock Valuation</p>
          <p className="font-mono text-2xl font-semibold text-slate-950 tabular-nums mt-1">
            ₹{totalValuation.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            aria-label="Filter by item type"
            value={itemTypeFilter}
            onChange={(e) => setItemTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
          >
            <option value="all">All Item Types</option>
            <option value="raw_material">Raw Materials</option>
            <option value="finished_goods">Finished Goods</option>
            <option value="packaging">Packaging</option>
            <option value="component">Components</option>
          </select>

          <select
            aria-label="Filter by stock status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
          >
            <option value="all">All Stock States</option>
            <option value="shortage">Shortage (Below Min)</option>
            <option value="low_runway">Low Runway (≤7d)</option>
            <option value="excess">Excess Stock</option>
            <option value="healthy">Healthy</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {canCreateItem && (
            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Close Form' : 'Add Material / SKU'}
            </button>
          )}
        </div>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateItem}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-950">
            Register Inventory Item
          </h2>
          {formError && (
            <div role="alert" className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label htmlFor="inv-sku" className="block text-xs font-medium text-slate-700 mb-1">
                SKU Code *
              </label>
              <input
                id="inv-sku"
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="API-AZM-100"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="inv-name" className="block text-xs font-medium text-slate-700 mb-1">
                Material / Product Name *
              </label>
              <input
                id="inv-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Azithromycin Dihydrate IP"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="inv-type" className="block text-xs font-medium text-slate-700 mb-1">
                Category *
              </label>
              <select
                id="inv-type"
                value={itemType}
                onChange={(e) => setItemType(e.target.value as InventoryItem['itemType'])}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              >
                <option value="raw_material">Raw Material</option>
                <option value="finished_goods">Finished Goods</option>
                <option value="packaging">Packaging</option>
                <option value="component">Component</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div>
              <label htmlFor="inv-unit" className="block text-xs font-medium text-slate-700 mb-1">
                Unit *
              </label>
              <input
                id="inv-unit"
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="inv-cur" className="block text-xs font-medium text-slate-700 mb-1">
                Current Stock
              </label>
              <input
                id="inv-cur"
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="inv-min" className="block text-xs font-medium text-slate-700 mb-1">
                Min Level
              </label>
              <input
                id="inv-min"
                type="number"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="inv-max" className="block text-xs font-medium text-slate-700 mb-1">
                Max Level
              </label>
              <input
                id="inv-max"
                type="number"
                min="0"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="inv-cost" className="block text-xs font-medium text-slate-700 mb-1">
                Unit Cost (INR)
              </label>
              <input
                id="inv-cost"
                type="number"
                min="0"
                value={unitCostInr}
                onChange={(e) => setUnitCostInr(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
            <div>
              <label htmlFor="inv-daily" className="block text-xs font-medium text-slate-700 mb-1">
                Daily Use Avg
              </label>
              <input
                id="inv-daily"
                type="number"
                min="0"
                value={dailyConsumptionAvg}
                onChange={(e) => setDailyConsumptionAvg(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              Save Inventory SKU
            </button>
          </div>
        </form>
      )}

      {/* Stock Movement Modal/Inline Bar */}
      {movementTarget && (
        <form
          onSubmit={handleMovementSubmit}
          className="bg-slate-900 text-white rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold">
              Record Stock Movement — {movementTarget.name} ({movementTarget.sku})
            </h3>
            <button
              type="button"
              onClick={() => setMovementTarget(null)}
              className="text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label htmlFor="mov-type" className="block text-xs text-slate-300 mb-1">
                Movement Type
              </label>
              <select
                id="mov-type"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as StockMovement['movementType'])}
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-white"
              >
                <option value="inbound">Inbound Receipt (+)</option>
                <option value="outbound">Production Issue (-)</option>
                <option value="return">Supplier Return (+)</option>
                <option value="adjustment">Physical Audit Set (=)</option>
              </select>
            </div>
            <div>
              <label htmlFor="mov-qty" className="block text-xs text-slate-300 mb-1">
                Quantity ({movementTarget.unit})
              </label>
              <input
                id="mov-qty"
                type="number"
                min="1"
                required
                value={movementQty}
                onChange={(e) => setMovementQty(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-white font-mono"
              />
            </div>
            <div>
              <label htmlFor="mov-ref" className="block text-xs text-slate-300 mb-1">
                Batch / PO Reference
              </label>
              <input
                id="mov-ref"
                type="text"
                value={movementRef}
                onChange={(e) => setMovementRef(e.target.value)}
                placeholder="PO-2026-419 or Batch HM-..."
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-md cursor-pointer"
            >
              Apply Movement
            </button>
          </div>
        </form>
      )}

      {/* Inventory Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">SKU & Material</th>
                <th className="py-3 px-4 text-right">Stock / Limits</th>
                <th className="py-3 px-4 text-right">Runway</th>
                <th className="py-3 px-4">Status & Reorder Guidance</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {analyzedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-slate-500">
                    No inventory items recorded matching your filter.
                  </td>
                </tr>
              ) : (
                analyzedItems.map(({ item, daysRemaining, status, recommendedReorderQty, assumptionNote }) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 align-top">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {item.sku} · {item.itemType.replace('_', ' ')}
                      </p>
                    </td>
                    <td className="py-3 px-4 align-top text-right font-mono tabular-nums">
                      <p className="font-semibold text-slate-950">
                        {item.currentStock.toLocaleString('en-IN')} {item.unit}
                      </p>
                      <p className="text-xs text-slate-500">
                        Min {item.minStock} / Max {item.maxStock}
                      </p>
                    </td>
                    <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs text-slate-700">
                      {daysRemaining !== null ? `${daysRemaining} days` : 'Not set'}
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs">
                      <p
                        className={`text-xs font-semibold uppercase ${
                          status === 'shortage'
                            ? 'text-red-700'
                            : status === 'low_runway' || status === 'excess'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {status.replace('_', ' ')}
                        {recommendedReorderQty > 0
                          ? ` · Suggest +${recommendedReorderQty} ${item.unit}`
                          : ''}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{assumptionNote}</p>
                    </td>
                    <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs text-slate-900">
                      ₹{(item.currentStock * item.unitCostInr).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 align-top text-right">
                      <button
                        type="button"
                        onClick={() => setMovementTarget(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 rounded-sm cursor-pointer"
                      >
                        <ArrowDownUp className="w-3.5 h-3.5" />
                        Move Stock
                      </button>
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
