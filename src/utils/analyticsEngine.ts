import type {
  InventoryItem,
  KPIStats,
  OperationalDataset,
  PredictionBaseline,
  PredictionDomain,
  PurchaseOrder,
  QualityInspection,
  Supplier,
} from '../types/industrial';

export interface AnalyticsFilter {
  departmentId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function inDateRange(dateStr: string | undefined, from?: string, to?: string): boolean {
  if (!dateStr) return true;
  if (from && dateStr < from) return false;
  if (to && dateStr > to) return false;
  return true;
}

export function filterDataset(
  dataset: OperationalDataset,
  filter: AnalyticsFilter
): OperationalDataset {
  const { departmentId, dateFrom, dateTo } = filter;
  const matchDept = (dept?: string) => !departmentId || departmentId === 'all' || dept === departmentId;

  return {
    ...dataset,
    productionOrders: dataset.productionOrders.filter(
      (o) => matchDept(o.departmentId) && inDateRange(o.dueDate, dateFrom, dateTo)
    ),
    qualityInspections: dataset.qualityInspections.filter(
      (q) => matchDept(q.departmentId) && inDateRange(q.inspectedDate, dateFrom, dateTo)
    ),
    inventory: dataset.inventory.filter((i) => matchDept(i.departmentId)),
    machines: dataset.machines.filter((m) => matchDept(m.departmentId)),
    machineDowntime: dataset.machineDowntime.filter((d) =>
      inDateRange(d.loggedDate, dateFrom, dateTo)
    ),
    purchaseOrders: dataset.purchaseOrders.filter((p) =>
      inDateRange(p.expectedDate, dateFrom, dateTo)
    ),
    safetyIncidents: dataset.safetyIncidents.filter(
      (s) => matchDept(s.departmentId) && inDateRange(s.incidentDate, dateFrom, dateTo)
    ),
    complianceDocuments: dataset.complianceDocuments.filter((c) => matchDept(c.departmentId)),
  };
}

/**
 * Computes KPIs strictly from actual operational records.
 * Returns null for percentage ratios when denominator is zero (never fabricates figures).
 */
export function computeKPIs(dataset: OperationalDataset): KPIStats {
  const orders = dataset.productionOrders;
  const inspections = dataset.qualityInspections;
  const inventory = dataset.inventory;
  const purchaseOrders = dataset.purchaseOrders;
  const machines = dataset.machines;

  const totalProductionOrders = orders.length;
  const completedProductionOrders = orders.filter((o) => o.status === 'completed').length;
  const delayedOrders = orders.filter((o) => o.status === 'delayed').length;

  const pendingQualityInspections = inspections.filter(
    (q) => q.result === 'pending' || q.releaseStatus === 'awaiting_review'
  ).length;

  const rejectedBatches = inspections.filter(
    (q) => q.releaseStatus === 'rejected' || q.result === 'fail'
  ).length;

  const completedInspectionsCount = inspections.filter((q) => q.result !== 'pending').length;
  const qualityRejectionPct =
    completedInspectionsCount > 0
      ? Number(((rejectedBatches / completedInspectionsCount) * 100).toFixed(1))
      : null;

  const inventoryShortageAlerts = inventory.filter(
    (item) => item.currentStock <= item.minStock
  ).length;

  const excessInventoryItems = inventory.filter(
    (item) => item.maxStock > 0 && item.currentStock > item.maxStock
  ).length;

  const totalInventoryValuationInr = inventory.reduce(
    (sum, item) => sum + item.currentStock * item.unitCostInr,
    0
  );

  const supplierDelays = purchaseOrders.filter(
    (po) => po.status === 'delayed' || po.status === 'delivered_late'
  ).length;

  const avgMachineUtilizationPct =
    machines.length > 0
      ? Number(
          (
            machines.reduce((sum, m) => sum + m.utilizationPct, 0) / machines.length
          ).toFixed(1)
        )
      : null;

  const totalTarget = orders.reduce((sum, o) => sum + o.targetQty, 0);
  const totalActual = orders.reduce((sum, o) => sum + o.actualQty, 0);
  const productionEfficiencyPct =
    totalTarget > 0 ? Number(((totalActual / totalTarget) * 100).toFixed(1)) : null;

  const orderOpsCost = orders.reduce((sum, o) => sum + (o.operationalCostInr ?? 0), 0);
  const procurementCost = purchaseOrders
    .filter((po) => po.status !== 'cancelled')
    .reduce((sum, po) => sum + po.totalCostInr, 0);
  const operationalCostInr = orderOpsCost + procurementCost;

  return {
    totalProductionOrders,
    completedProductionOrders,
    delayedOrders,
    pendingQualityInspections,
    rejectedBatches,
    inventoryShortageAlerts,
    excessInventoryItems,
    supplierDelays,
    avgMachineUtilizationPct,
    productionEfficiencyPct,
    operationalCostInr,
    qualityRejectionPct,
    totalInventoryValuationInr,
  };
}

export interface InventoryRunwayAnalysis {
  item: InventoryItem;
  daysRemaining: number | null;
  status: 'shortage' | 'low_runway' | 'excess' | 'healthy';
  recommendedReorderQty: number;
  assumptionNote: string;
}

export function analyzeInventoryItem(item: InventoryItem): InventoryRunwayAnalysis {
  const dailyAvg = item.dailyConsumptionAvg ?? 0;
  const daysRemaining =
    dailyAvg > 0 ? Number((item.currentStock / dailyAvg).toFixed(1)) : null;

  let status: InventoryRunwayAnalysis['status'] = 'healthy';
  if (item.currentStock <= item.minStock) {
    status = 'shortage';
  } else if (item.maxStock > 0 && item.currentStock > item.maxStock) {
    status = 'excess';
  } else if (daysRemaining !== null && daysRemaining <= 7) {
    status = 'low_runway';
  }

  const targetLevel = item.maxStock > item.minStock ? item.maxStock : item.minStock * 2;
  const recommendedReorderQty =
    status === 'shortage' || status === 'low_runway'
      ? Math.max(0, Math.round(targetLevel - item.currentStock))
      : 0;

  const assumptionNote =
    dailyAvg > 0
      ? `Based on recorded average daily consumption of ${dailyAvg} ${item.unit}/day and configured max stock ceiling (${item.maxStock} ${item.unit}).`
      : `Daily consumption rate not yet recorded; reorder guidance derived from min/max thresholds (${item.minStock}–${item.maxStock} ${item.unit}).`;

  return {
    item,
    daysRemaining,
    status,
    recommendedReorderQty,
    assumptionNote,
  };
}

export interface SupplierPerformanceMetrics {
  supplier: Supplier;
  totalOrders: number;
  onTimeOrders: number;
  lateOrDelayedOrders: number;
  onTimeDeliveryPct: number | null;
  totalProcurementInr: number;
  inspectedDeliveries: number;
  qcFailCount: number;
  qcPassPct: number | null;
}

export function computeSupplierPerformance(
  suppliers: Supplier[],
  purchaseOrders: PurchaseOrder[],
  inspections: QualityInspection[]
): SupplierPerformanceMetrics[] {
  return suppliers.map((supplier) => {
    const orders = purchaseOrders.filter(
      (po) => po.supplierId === supplier.id && po.status !== 'cancelled'
    );
    const completedOrDelayed = orders.filter(
      (po) =>
        po.status === 'delivered_on_time' ||
        po.status === 'delivered_late' ||
        po.status === 'delayed'
    );
    const onTimeOrders = orders.filter((po) => po.status === 'delivered_on_time').length;
    const lateOrDelayedOrders = orders.filter(
      (po) => po.status === 'delivered_late' || po.status === 'delayed'
    ).length;

    const onTimeDeliveryPct =
      completedOrDelayed.length > 0
        ? Number(((onTimeOrders / completedOrDelayed.length) * 100).toFixed(1))
        : null;

    const totalProcurementInr = orders.reduce((sum, po) => sum + po.totalCostInr, 0);

    const supplierInspections = inspections.filter(
      (q) => q.supplierId === supplier.id && q.result !== 'pending'
    );
    const qcFailCount = supplierInspections.filter((q) => q.result === 'fail').length;
    const qcPassCount = supplierInspections.filter((q) => q.result === 'pass').length;
    const qcPassPct =
      supplierInspections.length > 0
        ? Number(((qcPassCount / supplierInspections.length) * 100).toFixed(1))
        : null;

    return {
      supplier,
      totalOrders: orders.length,
      onTimeOrders,
      lateOrDelayedOrders,
      onTimeDeliveryPct,
      totalProcurementInr,
      inspectedDeliveries: supplierInspections.length,
      qcFailCount,
      qcPassPct,
    };
  });
}

function getDateSpanLabel(dates: string[]): string {
  const valid = dates.filter(Boolean).sort();
  if (valid.length === 0) return 'No dated records available';
  if (valid[0] === valid[valid.length - 1]) return valid[0];
  return `${valid[0]} to ${valid[valid.length - 1]}`;
}

export function computeAllPredictionBaselines(
  dataset: OperationalDataset
): PredictionBaseline[] {
  const kpis = computeKPIs(dataset);
  const supplierStats = computeSupplierPerformance(
    dataset.suppliers,
    dataset.purchaseOrders,
    dataset.qualityInspections
  );
  const inventoryAnalysis = dataset.inventory.map(analyzeInventoryItem);

  const qcCompleted = dataset.qualityInspections.filter((q) => q.result !== 'pending');
  const qcPeriod = getDateSpanLabel(dataset.qualityInspections.map((q) => q.inspectedDate));
  const poPeriod = getDateSpanLabel(dataset.purchaseOrders.map((p) => p.expectedDate));
  const orderPeriod = getDateSpanLabel(dataset.productionOrders.map((o) => o.dueDate));
  const downtimePeriod = getDateSpanLabel(dataset.machineDowntime.map((d) => d.loggedDate));

  const minThreshold = 3;

  const buildInsufficient = (
    domain: PredictionDomain,
    title: string,
    sampleSize: number,
    dataPeriod: string,
    neededDesc: string
  ): PredictionBaseline => ({
    domain,
    title,
    hasSufficientData: false,
    minimumRequiredRecords: minThreshold,
    sampleSize,
    dataPeriod,
    riskLevel: 'insufficient_data',
    headlineSummary: `Additional operational records required (${sampleSize}/${minThreshold} minimum records logged).`,
    supportingMetrics: [
      { label: 'Available Records', value: String(sampleSize) },
      { label: 'Minimum Threshold', value: String(minThreshold) },
    ],
    contributingFactors: [`At least ${minThreshold} ${neededDesc} are required before statistical risk scoring can be computed.`],
    recommendedAction: `Continue logging ${neededDesc} in the operational modules to establish a reliable statistical baseline.`,
    uncertaintyNote:
      'No accuracy percentage or probability score is displayed because sample size is below statistical validity.',
  });

  // 1. QC Failure Prediction
  const qcFails = qcCompleted.filter((q) => q.result === 'fail' || q.result === 'conditional');
  const qcFailRate = qcCompleted.length > 0 ? (qcFails.length / qcCompleted.length) * 100 : 0;
  const recurringDefects = Object.entries(
    qcFails.reduce<Record<string, number>>((acc, q) => {
      const key = q.defectCategory || 'Unspecified defect';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${cat} (${count} cases)`);

  const qcBaseline: PredictionBaseline =
    qcCompleted.length < minThreshold
      ? buildInsufficient('qc_failure', 'QC Failure Risk Analysis', qcCompleted.length, qcPeriod, 'completed QC inspections')
      : {
          domain: 'qc_failure',
          title: 'QC Failure Risk Analysis',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: qcCompleted.length,
          dataPeriod: qcPeriod,
          riskLevel: qcFailRate >= 25 ? 'high' : qcFailRate >= 10 ? 'moderate' : 'low',
          headlineSummary: `${qcFailRate.toFixed(1)}% non-conformance observed across ${qcCompleted.length} completed inspections.`,
          supportingMetrics: [
            { label: 'Completed Inspections', value: String(qcCompleted.length) },
            { label: 'Fail / Conditional', value: String(qcFails.length) },
            { label: 'Observed Failure Rate', value: `${qcFailRate.toFixed(1)}%` },
          ],
          contributingFactors:
            recurringDefects.length > 0
              ? recurringDefects
              : ['No recurring defect categories logged in the selected period.'],
          recommendedAction:
            qcFailRate >= 15
              ? 'Escalate incoming material sampling for top defect categories and require QA Manager review prior to batch release.'
              : 'Maintain standard AQL sampling frequency; monitor conditional passes.',
          uncertaintyNote:
            'Descriptive historical rate based on logged inspections; not a validated predictive ML accuracy guarantee.',
        };

  // 2. Inventory Shortage Prediction
  const shortageItems = inventoryAnalysis.filter(
    (a) => a.status === 'shortage' || a.status === 'low_runway'
  );
  const invBaseline: PredictionBaseline =
    dataset.inventory.length < minThreshold
      ? buildInsufficient('inventory_shortage', 'Inventory Shortage Forecast', dataset.inventory.length, 'Current ledger', 'tracked inventory items')
      : {
          domain: 'inventory_shortage',
          title: 'Inventory Shortage Forecast',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: dataset.inventory.length,
          dataPeriod: 'Live stock ledger',
          riskLevel:
            shortageItems.some((i) => i.status === 'shortage')
              ? 'high'
              : shortageItems.length > 0
              ? 'moderate'
              : 'low',
          headlineSummary:
            shortageItems.length > 0
              ? `${shortageItems.length} of ${dataset.inventory.length} tracked materials are at or approaching reorder thresholds.`
              : `All ${dataset.inventory.length} tracked items are currently above minimum safety thresholds.`,
          supportingMetrics: [
            { label: 'Below Min Stock', value: String(kpis.inventoryShortageAlerts) },
            { label: 'Low Runway (≤7d)', value: String(shortageItems.filter((s) => s.status === 'low_runway').length) },
            { label: 'Excess Stock Items', value: String(kpis.excessInventoryItems) },
          ],
          contributingFactors:
            shortageItems.length > 0
              ? shortageItems.slice(0, 3).map(
                  (s) =>
                    `${s.item.name}: ${s.item.currentStock} ${s.item.unit} remaining (${s.daysRemaining !== null ? `${s.daysRemaining}d runway` : 'at min threshold'})`
                )
              : ['Current balances exceed configured minimum safety stock.'],
          recommendedAction:
            shortageItems.length > 0
              ? `Issue purchase requisitions for ${shortageItems.slice(0, 2).map((s) => `${s.item.name} (+${s.recommendedReorderQty} ${s.item.unit})`).join(', ')}.`
              : 'Continue monitoring daily consumption averages against lead times.',
          uncertaintyNote:
            'Runway estimates assume steady daily consumption; sudden batch schedule surges will shorten runway.',
        };

  // 3. Batch Rejection Risk
  const batchInspections = qcCompleted.filter(
    (q) => q.inspectionType === 'batch_release' || q.inspectionType === 'in_process'
  );
  const batchRejected = batchInspections.filter(
    (q) => q.releaseStatus === 'rejected' || q.releaseStatus === 'rework'
  );
  const batchRejectionRate =
    batchInspections.length > 0 ? (batchRejected.length / batchInspections.length) * 100 : 0;

  const batchBaseline: PredictionBaseline =
    batchInspections.length < minThreshold
      ? buildInsufficient('batch_rejection', 'Batch Rejection & Rework Risk', batchInspections.length, qcPeriod, 'in-process or batch release inspections')
      : {
          domain: 'batch_rejection',
          title: 'Batch Rejection & Rework Risk',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: batchInspections.length,
          dataPeriod: qcPeriod,
          riskLevel: batchRejectionRate >= 20 ? 'high' : batchRejectionRate >= 8 ? 'moderate' : 'low',
          headlineSummary: `${batchRejectionRate.toFixed(1)}% batch rejection/rework incidence across ${batchInspections.length} evaluated batches.`,
          supportingMetrics: [
            { label: 'Evaluated Batches', value: String(batchInspections.length) },
            { label: 'Rejected / Rework', value: String(batchRejected.length) },
            { label: 'Rejection Rate', value: `${batchRejectionRate.toFixed(1)}%` },
          ],
          contributingFactors:
            batchRejected.length > 0
              ? batchRejected.slice(0, 3).map((b) => `${b.subjectName} (${b.defectCategory || b.result})`)
              : ['Zero batch rejections recorded in evaluated batch sample.'],
          recommendedAction:
            batchRejected.length > 0
              ? 'Audit in-process check parameters prior to final batch release and enforce human QA sign-off.'
              : 'Maintain current in-process parameter checks.',
          uncertaintyNote:
            'Calculated strictly from completed batch inspections; AI never substitutes for formal QA batch release.',
        };

  // 4. Supplier Delivery Risk
  const poWithStatus = dataset.purchaseOrders.filter((p) => p.status !== 'cancelled');
  const lateOrders = poWithStatus.filter(
    (p) => p.status === 'delayed' || p.status === 'delivered_late'
  );
  const lateRate = poWithStatus.length > 0 ? (lateOrders.length / poWithStatus.length) * 100 : 0;
  const riskySuppliers = supplierStats
    .filter((s) => s.lateOrDelayedOrders > 0 || s.qcFailCount > 0)
    .slice(0, 3);

  const supplierBaseline: PredictionBaseline =
    poWithStatus.length < minThreshold
      ? buildInsufficient('supplier_delivery', 'Supplier Delivery Risk', poWithStatus.length, poPeriod, 'purchase orders')
      : {
          domain: 'supplier_delivery',
          title: 'Supplier Delivery Risk',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: poWithStatus.length,
          dataPeriod: poPeriod,
          riskLevel: lateRate >= 30 ? 'high' : lateRate >= 15 ? 'moderate' : 'low',
          headlineSummary: `${lateRate.toFixed(1)}% late or delayed purchase orders across ${poWithStatus.length} active/closed POs.`,
          supportingMetrics: [
            { label: 'Tracked POs', value: String(poWithStatus.length) },
            { label: 'Delayed / Late POs', value: String(lateOrders.length) },
            { label: 'Delay Incidence', value: `${lateRate.toFixed(1)}%` },
          ],
          contributingFactors:
            riskySuppliers.length > 0
              ? riskySuppliers.map(
                  (s) =>
                    `${s.supplier.name}: ${s.lateOrDelayedOrders} late deliveries, ${s.qcFailCount} QC fails`
                )
              : ['All tracked suppliers delivered within scheduled windows.'],
          recommendedAction:
            riskySuppliers.length > 0
              ? `Diversify safety stock or review SLA terms with ${riskySuppliers[0].supplier.name}.`
              : 'Continue tracking PO actual vs expected delivery dates.',
          uncertaintyNote:
            'Reflects observed historical PO performance; external transit disruptions are not modeled without carrier feeds.',
        };

  // 5. Component / Raw Material Defect Risk
  const incomingQc = qcCompleted.filter(
    (q) => q.inspectionType === 'raw_material' || q.inspectionType === 'component'
  );
  const incomingFails = incomingQc.filter((q) => q.result === 'fail' || q.result === 'conditional');
  const incomingFailRate =
    incomingQc.length > 0 ? (incomingFails.length / incomingQc.length) * 100 : 0;

  const componentBaseline: PredictionBaseline =
    incomingQc.length < minThreshold
      ? buildInsufficient('component_defect', 'Incoming Material & Component Defect Risk', incomingQc.length, qcPeriod, 'incoming material/component inspections')
      : {
          domain: 'component_defect',
          title: 'Incoming Material & Component Defect Risk',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: incomingQc.length,
          dataPeriod: qcPeriod,
          riskLevel: incomingFailRate >= 20 ? 'high' : incomingFailRate >= 10 ? 'moderate' : 'low',
          headlineSummary: `${incomingFailRate.toFixed(1)}% incoming lot defect/conditional rate across ${incomingQc.length} received lots.`,
          supportingMetrics: [
            { label: 'Incoming Lots Checked', value: String(incomingQc.length) },
            { label: 'Non-Conforming Lots', value: String(incomingFails.length) },
          ],
          contributingFactors:
            incomingFails.length > 0
              ? incomingFails.slice(0, 3).map((i) => `${i.subjectName}: ${i.defectCategory || 'Parameter variance'}`)
              : ['Incoming raw materials and components met acceptance specs.'],
          recommendedAction:
            incomingFails.length > 0
              ? 'Enforce pre-dispatch CoA verification and tighten incoming AQL inspection on flagged materials.'
              : 'Maintain current incoming inspection protocol.',
          uncertaintyNote:
            'Derived solely from recorded incoming inspection lots; vendor manufacturing changes can alter future lot quality.',
        };

  // 6. Production Delay Prediction
  const delayRate =
    dataset.productionOrders.length > 0
      ? (kpis.delayedOrders / dataset.productionOrders.length) * 100
      : 0;
  const delayedOrdersList = dataset.productionOrders.filter((o) => o.status === 'delayed');

  const prodDelayBaseline: PredictionBaseline =
    dataset.productionOrders.length < minThreshold
      ? buildInsufficient('production_delay', 'Production Schedule Delay Risk', dataset.productionOrders.length, orderPeriod, 'production orders')
      : {
          domain: 'production_delay',
          title: 'Production Schedule Delay Risk',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: dataset.productionOrders.length,
          dataPeriod: orderPeriod,
          riskLevel: delayRate >= 25 ? 'high' : delayRate >= 10 ? 'moderate' : 'low',
          headlineSummary: `${kpis.delayedOrders} of ${dataset.productionOrders.length} production orders (${delayRate.toFixed(1)}%) are currently delayed.`,
          supportingMetrics: [
            { label: 'Total Orders', value: String(dataset.productionOrders.length) },
            { label: 'Delayed Orders', value: String(kpis.delayedOrders) },
            { label: 'Output Efficiency', value: kpis.productionEfficiencyPct !== null ? `${kpis.productionEfficiencyPct}%` : 'N/A' },
          ],
          contributingFactors:
            delayedOrdersList.length > 0
              ? delayedOrdersList.slice(0, 3).map((o) => `${o.orderCode} (${o.productName}): ${o.actualQty}/${o.targetQty} units`)
              : ['Active schedule orders are tracking within due dates.'],
          recommendedAction:
            delayedOrdersList.length > 0
              ? 'Review machine allocation and material availability for delayed orders before authorizing schedule revisions.'
              : 'Keep monitoring work-in-progress completion rates.',
          uncertaintyNote:
            'Schedule changes require Department Manager or Company Admin authorization.',
        };

  // 7. Machine Utilization & Bottleneck Analysis
  const totalDowntimeHours = dataset.machineDowntime.reduce((s, d) => s + d.durationHours, 0);
  const bottleneckMachines = [...dataset.machines]
    .sort((a, b) => b.downtimeHoursMonth - a.downtimeHoursMonth)
    .slice(0, 3);

  const machineBaseline: PredictionBaseline =
    dataset.machines.length < minThreshold
      ? buildInsufficient('machine_utilization', 'Machine Utilization & Bottleneck Analysis', dataset.machines.length, downtimePeriod, 'tracked plant machines')
      : {
          domain: 'machine_utilization',
          title: 'Machine Utilization & Bottleneck Analysis',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: dataset.machines.length,
          dataPeriod: downtimePeriod,
          riskLevel:
            (kpis.avgMachineUtilizationPct ?? 100) < 65 || totalDowntimeHours > 30
              ? 'high'
              : (kpis.avgMachineUtilizationPct ?? 100) < 80
              ? 'moderate'
              : 'low',
          headlineSummary: `Average plant machine utilization is ${kpis.avgMachineUtilizationPct ?? 0}% with ${totalDowntimeHours.toFixed(1)} logged downtime hours.`,
          supportingMetrics: [
            { label: 'Tracked Machines', value: String(dataset.machines.length) },
            { label: 'Avg Utilization', value: kpis.avgMachineUtilizationPct !== null ? `${kpis.avgMachineUtilizationPct}%` : 'N/A' },
            { label: 'Logged Downtime', value: `${totalDowntimeHours.toFixed(1)} hrs` },
          ],
          contributingFactors: bottleneckMachines.map(
            (m) => `${m.name} (${m.code}): ${m.utilizationPct}% util, ${m.downtimeHoursMonth}h downtime`
          ),
          recommendedAction:
            bottleneckMachines.length > 0
              ? `Schedule preventive maintenance inspection on ${bottleneckMachines[0].name} and rebalance shift changeover windows.`
              : 'Maintain preventive maintenance intervals.',
          uncertaintyNote:
            'Utilization figures depend on operator and supervisor machine status updates.',
        };

  // 8. Delivery-Time Forecasting
  const activeOrders = dataset.productionOrders.filter((o) => o.status !== 'completed');
  const avgCompletionRatio =
    activeOrders.length > 0
      ? activeOrders.reduce((s, o) => s + o.actualQty / o.targetQty, 0) / activeOrders.length
      : 1;

  const deliveryBaseline: PredictionBaseline =
    dataset.productionOrders.length < minThreshold
      ? buildInsufficient('delivery_forecast', 'Order Delivery-Time Forecasting', dataset.productionOrders.length, orderPeriod, 'production orders')
      : {
          domain: 'delivery_forecast',
          title: 'Order Delivery-Time Forecasting',
          hasSufficientData: true,
          minimumRequiredRecords: minThreshold,
          sampleSize: dataset.productionOrders.length,
          dataPeriod: orderPeriod,
          riskLevel: delayRate >= 25 || avgCompletionRatio < 0.5 ? 'moderate' : 'low',
          headlineSummary: `${activeOrders.length} active orders averaging ${(avgCompletionRatio * 100).toFixed(0)}% progress toward target quantities.`,
          supportingMetrics: [
            { label: 'Active Orders', value: String(activeOrders.length) },
            { label: 'Completed Orders', value: String(kpis.completedProductionOrders) },
            { label: 'Delayed Orders', value: String(kpis.delayedOrders) },
          ],
          contributingFactors: [
            `${kpis.inventoryShortageAlerts} material shortage alerts affecting replenishment`,
            `${kpis.supplierDelays} delayed supplier purchase orders`,
          ],
          recommendedAction:
            activeOrders.length > 0
              ? 'Prioritize material kitting for orders within 5 days of due date and escalate delayed upstream POs.'
              : 'All current orders completed.',
          uncertaintyNote:
            'Forecasting is deterministic from current WIP completion and open delays; does not include unlogged shift absences.',
        };

  return [
    qcBaseline,
    invBaseline,
    batchBaseline,
    supplierBaseline,
    componentBaseline,
    prodDelayBaseline,
    machineBaseline,
    deliveryBaseline,
  ];
}

export function exportRowsToCsv(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const escape = (cell: string | number | null | undefined): string => {
    const str = cell === null || cell === undefined ? '' : String(cell);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}
