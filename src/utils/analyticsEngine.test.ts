import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeInventoryItem,
  computeAllPredictionBaselines,
  computeKPIs,
  computeSupplierPerformance,
  exportRowsToCsv,
  filterDataset,
} from './analyticsEngine';
import type { OperationalDataset } from '../types/industrial';

const emptyDataset: OperationalDataset = {
  company: {
    id: 'comp_empty',
    name: 'Empty Plant Ltd',
    segment: 'pharma',
    location: 'Selaqui, Dehradun',
    registrationStatus: 'approved',
    adminUid: 'uid_1',
    enabledModules: ['command_centre'],
  },
  departments: [],
  members: [],
  industrialProfile: null,
  suppliers: [],
  inventory: [],
  stockMovements: [],
  purchaseOrders: [],
  productionOrders: [],
  machines: [],
  machineDowntime: [],
  qualityInspections: [],
  safetyIncidents: [],
  complianceDocuments: [],
  aiRecommendations: [],
  auditLogs: [],
};

test('computeKPIs returns null ratios and zero counts for an empty company (no fabricated data)', () => {
  const kpis = computeKPIs(emptyDataset);
  assert.equal(kpis.totalProductionOrders, 0);
  assert.equal(kpis.completedProductionOrders, 0);
  assert.equal(kpis.delayedOrders, 0);
  assert.equal(kpis.avgMachineUtilizationPct, null);
  assert.equal(kpis.productionEfficiencyPct, null);
  assert.equal(kpis.qualityRejectionPct, null);
  assert.equal(kpis.operationalCostInr, 0);
});

test('computeKPIs accurately aggregates production, quality, inventory, and supplier metrics', () => {
  const dataset: OperationalDataset = {
    ...emptyDataset,
    productionOrders: [
      {
        id: 'po1',
        companyId: 'comp_empty',
        orderCode: 'ORD-01',
        productName: 'Paracetamol 500mg',
        departmentId: 'dept_1',
        targetQty: 1000,
        actualQty: 1000,
        operationalCostInr: 50000,
        dueDate: '2026-11-10',
        status: 'completed',
        createdByUid: 'u1',
      },
      {
        id: 'po2',
        companyId: 'comp_empty',
        orderCode: 'ORD-02',
        productName: 'Azithromycin 250mg',
        departmentId: 'dept_2',
        targetQty: 1000,
        actualQty: 600,
        operationalCostInr: 40000,
        dueDate: '2026-11-18',
        status: 'delayed',
        createdByUid: 'u1',
      },
    ],
    qualityInspections: [
      {
        id: 'qi1',
        companyId: 'comp_empty',
        inspectionCode: 'QC-1',
        inspectionType: 'raw_material',
        subjectName: 'API Excipient',
        result: 'fail',
        releaseStatus: 'rejected',
        inspectedDate: '2026-11-12',
        createdByUid: 'u1',
      },
      {
        id: 'qi2',
        companyId: 'comp_empty',
        inspectionCode: 'QC-2',
        inspectionType: 'batch_release',
        subjectName: 'Batch B2',
        result: 'pass',
        releaseStatus: 'released',
        inspectedDate: '2026-11-14',
        createdByUid: 'u1',
      },
    ],
    inventory: [
      {
        id: 'inv1',
        companyId: 'comp_empty',
        sku: 'SKU-1',
        name: 'Lactose Monohydrate',
        itemType: 'raw_material',
        unit: 'kg',
        currentStock: 80,
        minStock: 100,
        maxStock: 500,
        unitCostInr: 250,
        dailyConsumptionAvg: 20,
        createdByUid: 'u1',
      },
    ],
    purchaseOrders: [
      {
        id: 'pur1',
        companyId: 'comp_empty',
        poNumber: 'PO-101',
        supplierId: 'sup1',
        materialName: 'Lactose',
        quantity: 200,
        totalCostInr: 50000,
        expectedDate: '2026-11-15',
        status: 'delayed',
        createdByUid: 'u1',
      },
    ],
    machines: [
      {
        id: 'm1',
        companyId: 'comp_empty',
        code: 'M-1',
        name: 'Tablet Press A',
        departmentId: 'dept_1',
        status: 'running',
        utilizationPct: 84,
        downtimeHoursMonth: 2,
        createdByUid: 'u1',
      },
    ],
  };

  const kpis = computeKPIs(dataset);
  assert.equal(kpis.totalProductionOrders, 2);
  assert.equal(kpis.completedProductionOrders, 1);
  assert.equal(kpis.delayedOrders, 1);
  assert.equal(kpis.rejectedBatches, 1);
  assert.equal(kpis.qualityRejectionPct, 50);
  assert.equal(kpis.inventoryShortageAlerts, 1);
  assert.equal(kpis.supplierDelays, 1);
  assert.equal(kpis.productionEfficiencyPct, 80);
  assert.equal(kpis.avgMachineUtilizationPct, 84);
  assert.equal(kpis.operationalCostInr, 140000);
  assert.equal(kpis.totalInventoryValuationInr, 20000);

  const filtered = filterDataset(dataset, { departmentId: 'dept_1' });
  assert.equal(filtered.productionOrders.length, 1);
  assert.equal(filtered.productionOrders[0].orderCode, 'ORD-01');
});

test('analyzeInventoryItem computes runway days and reorder quantity accurately', () => {
  const analysis = analyzeInventoryItem({
    id: 'inv1',
    companyId: 'c1',
    sku: 'CHEM-10',
    name: 'Isopropyl Alcohol',
    itemType: 'raw_material',
    unit: 'L',
    currentStock: 120,
    minStock: 150,
    maxStock: 600,
    unitCostInr: 110,
    dailyConsumptionAvg: 30,
    createdByUid: 'u1',
  });
  assert.equal(analysis.status, 'shortage');
  assert.equal(analysis.daysRemaining, 4);
  assert.equal(analysis.recommendedReorderQty, 480);
});

test('computeSupplierPerformance avoids fabricated ratings when supplier has no orders', () => {
  const stats = computeSupplierPerformance(
    [
      {
        id: 'sup_new',
        companyId: 'c1',
        name: 'Uttarakhand Fine Chem',
        category: 'Solvents',
        status: 'approved',
        createdByUid: 'u1',
      },
    ],
    [],
    []
  );
  assert.equal(stats[0].totalOrders, 0);
  assert.equal(stats[0].onTimeDeliveryPct, null);
  assert.equal(stats[0].qcPassPct, null);
});

test('computeAllPredictionBaselines flags insufficient data when records are below threshold', () => {
  const baselines = computeAllPredictionBaselines(emptyDataset);
  assert.equal(baselines.length, 8);
  for (const b of baselines) {
    assert.equal(b.hasSufficientData, false);
    assert.equal(b.riskLevel, 'insufficient_data');
  }
});

test('exportRowsToCsv properly escapes commas and quotes', () => {
  const csv = exportRowsToCsv(['Name', 'Notes'], [['Acme, Ltd', 'Contains "quotes"']]);
  assert.equal(csv, 'Name,Notes\n"Acme, Ltd","Contains ""quotes"""');
});
