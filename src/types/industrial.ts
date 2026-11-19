export type IndustrySegment =
  | 'pharma'
  | 'chemicals'
  | 'food'
  | 'electronics'
  | 'engineering';

export type UserRole =
  | 'super_admin'
  | 'company_admin'
  | 'department_manager'
  | 'operator';

export type RegistrationStatus = 'pending' | 'approved' | 'suspended';

export type ModuleKey =
  | 'command_centre'
  | 'quality'
  | 'inventory'
  | 'production'
  | 'suppliers'
  | 'ai_predictions'
  | 'compliance'
  | 'reports'
  | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyId?: string;
  departmentId?: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt?: string;
  updatedAt?: string;
}

export interface Company {
  id: string;
  name: string;
  segment: IndustrySegment;
  location: string;
  gstNumber?: string;
  registrationStatus: RegistrationStatus;
  adminUid: string;
  enabledModules: ModuleKey[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CompanyMember {
  uid: string;
  companyId: string;
  email: string;
  displayName: string;
  role: Exclude<UserRole, 'super_admin'>;
  departmentId?: string;
  status: 'active' | 'invited' | 'disabled';
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string;
  managerName?: string;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IndustrialProfile {
  id: string;
  companyId: string;
  segment: IndustrySegment;
  validatedProblems: string[];
  regulatoryFrameworks: string[];
  qcParameters: string[];
  updatedByUid: string;
  updatedAt?: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  category: string;
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  city?: string;
  status: 'approved' | 'probation' | 'blocked';
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  companyId: string;
  sku: string;
  name: string;
  itemType: 'raw_material' | 'finished_goods' | 'component' | 'packaging';
  departmentId?: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCostInr: number;
  supplierId?: string;
  dailyConsumptionAvg?: number;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockMovement {
  id: string;
  companyId: string;
  itemId: string;
  movementType: 'inbound' | 'outbound' | 'adjustment' | 'return';
  quantity: number;
  reference?: string;
  createdByUid: string;
  createdAt?: string;
}

export interface PurchaseOrder {
  id: string;
  companyId: string;
  poNumber: string;
  supplierId: string;
  materialName: string;
  quantity: number;
  unit?: string;
  totalCostInr: number;
  expectedDate: string;
  deliveredDate?: string;
  status:
    | 'ordered'
    | 'in_transit'
    | 'delivered_on_time'
    | 'delivered_late'
    | 'delayed'
    | 'cancelled';
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductionOrder {
  id: string;
  companyId: string;
  orderCode: string;
  productName: string;
  batchCode?: string;
  departmentId: string;
  machineId?: string;
  targetQty: number;
  actualQty: number;
  reworkQty?: number;
  operationalCostInr?: number;
  dueDate: string;
  status: 'scheduled' | 'in_progress' | 'delayed' | 'completed' | 'on_hold';
  scheduleApprovedByUid?: string;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Machine {
  id: string;
  companyId: string;
  code: string;
  name: string;
  departmentId: string;
  status: 'running' | 'idle' | 'maintenance' | 'down';
  utilizationPct: number;
  downtimeHoursMonth: number;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineDowntime {
  id: string;
  companyId: string;
  machineId: string;
  reason: string;
  durationHours: number;
  downtimeType: 'unplanned' | 'maintenance' | 'changeover' | 'power';
  loggedDate: string;
  createdByUid: string;
  createdAt?: string;
}

export interface QualityInspection {
  id: string;
  companyId: string;
  inspectionCode: string;
  inspectionType: 'raw_material' | 'in_process' | 'batch_release' | 'component';
  subjectName: string;
  batchCode?: string;
  supplierId?: string;
  departmentId?: string;
  parametersChecked?: string;
  result: 'pending' | 'pass' | 'fail' | 'conditional';
  releaseStatus: 'awaiting_review' | 'released' | 'rejected' | 'rework';
  defectCategory?: string;
  correctiveAction?: string;
  approvedByUid?: string;
  inspectedDate: string;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SafetyIncident {
  id: string;
  companyId: string;
  title: string;
  departmentId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'closed';
  correctiveAction?: string;
  incidentDate: string;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplianceDocument {
  id: string;
  companyId: string;
  title: string;
  framework: string;
  departmentId?: string;
  lastInspectionDate?: string;
  expiryDate: string;
  status: 'valid' | 'expiring_soon' | 'expired' | 'pending_approval';
  approvedByUid?: string;
  createdByUid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiRecommendation {
  id: string;
  companyId: string;
  domain: PredictionDomain;
  summary: string;
  recommendedAction: string;
  dataPeriod: string;
  sampleSize: number;
  createdByUid: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  module: string;
  targetId?: string;
  details?: string;
  createdAt?: string;
}

export interface DemoEnquiry {
  id: string;
  contactName: string;
  companyName: string;
  email: string;
  phone?: string;
  segment: IndustrySegment;
  message?: string;
  createdAt?: string;
}

export interface OperationalDataset {
  company: Company;
  departments: Department[];
  members: CompanyMember[];
  industrialProfile: IndustrialProfile | null;
  suppliers: Supplier[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  purchaseOrders: PurchaseOrder[];
  productionOrders: ProductionOrder[];
  machines: Machine[];
  machineDowntime: MachineDowntime[];
  qualityInspections: QualityInspection[];
  safetyIncidents: SafetyIncident[];
  complianceDocuments: ComplianceDocument[];
  aiRecommendations: AiRecommendation[];
  auditLogs: AuditLog[];
}

export interface KPIStats {
  totalProductionOrders: number;
  completedProductionOrders: number;
  delayedOrders: number;
  pendingQualityInspections: number;
  rejectedBatches: number;
  inventoryShortageAlerts: number;
  excessInventoryItems: number;
  supplierDelays: number;
  avgMachineUtilizationPct: number | null;
  productionEfficiencyPct: number | null;
  operationalCostInr: number;
  qualityRejectionPct: number | null;
  totalInventoryValuationInr: number;
}

export type PredictionDomain =
  | 'qc_failure'
  | 'inventory_shortage'
  | 'batch_rejection'
  | 'supplier_delivery'
  | 'component_defect'
  | 'production_delay'
  | 'machine_utilization'
  | 'delivery_forecast';

export interface PredictionBaseline {
  domain: PredictionDomain;
  title: string;
  hasSufficientData: boolean;
  minimumRequiredRecords: number;
  sampleSize: number;
  dataPeriod: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'insufficient_data';
  headlineSummary: string;
  supportingMetrics: { label: string; value: string }[];
  contributingFactors: string[];
  recommendedAction: string;
  uncertaintyNote: string;
}

export interface GeminiAnalysisResult {
  domain: PredictionDomain;
  status: 'analyzed' | 'insufficient_data';
  headline: string;
  rootCauseHypotheses: string[];
  contributingFactors: string[];
  recommendedActions: string[];
  dataLimitationsAndUncertainty: string;
  humanApprovalNotice: string;
  dataPeriod: string;
  sampleSize: number;
  generatedAt: string;
}
