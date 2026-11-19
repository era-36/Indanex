import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { WorkspaceShell } from './components/WorkspaceShell';
import { AdminConsoleView } from './components/modules/AdminConsoleView';
import { AiPredictionCentreView } from './components/modules/AiPredictionCentreView';
import { CommandCentreView } from './components/modules/CommandCentreView';
import { ComplianceSafetyView } from './components/modules/ComplianceSafetyView';
import { InventoryModule } from './components/modules/InventoryModule';
import { ProductionModule } from './components/modules/ProductionModule';
import { QualityModule } from './components/modules/QualityModule';
import { ReportsAnalyticsView } from './components/modules/ReportsAnalyticsView';
import { SuppliersModule } from './components/modules/SuppliersModule';
import { createSandboxDataset } from './data/sandboxSeed';
import { auth, googleProvider } from './firebase';
import {
  appendAuditLog,
  fetchCompanyById,
  fetchDemoEnquiries,
  fetchUserCompanies,
  getOrCreateUserProfile,
  registerCompanyWorkspace,
  subscribeCompanySubcollection,
  SUPER_ADMIN_EMAIL,
  updateCompanySettings,
  writeCompanyRecord,
} from './services/firestoreService';
import type {
  AiRecommendation,
  AuditLog,
  Company,
  CompanyMember,
  ComplianceDocument,
  DemoEnquiry,
  Department,
  IndustrialProfile,
  IndustrySegment,
  InventoryItem,
  Machine,
  MachineDowntime,
  ModuleKey,
  OperationalDataset,
  ProductionOrder,
  PurchaseOrder,
  QualityInspection,
  SafetyIncident,
  StockMovement,
  Supplier,
  UserProfile,
  UserRole,
} from './types/industrial';
import { generateRecordId } from './utils/validation';

function buildEmptyDataset(company: Company): OperationalDataset {
  return {
    company,
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
}

function AppContent() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [viewMode, setViewMode] = useState<'landing' | 'workspace'>(
    initialAutostart ? 'workspace' : 'landing'
  );
  const [isSandbox, setIsSandbox] = useState<boolean>(initialAutostart);
  const [sandboxDataset, setSandboxDataset] = useState<OperationalDataset>(() =>
    createSandboxDataset()
  );
  const [sandboxRole, setSandboxRole] = useState<UserRole>('company_admin');

  const [activeModule, setActiveModule] = useState<ModuleKey>('command_centre');

  // Firebase Auth & Tenant State
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [enquiries, setEnquiries] = useState<DemoEnquiry[]>([]);
  const [tenantDataset, setTenantDataset] = useState<OperationalDataset | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'register'>('signin');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setActiveCompany(null);
        setTenantDataset(null);
        return;
      }

      try {
        const profile = await getOrCreateUserProfile(user);
        setUserProfile(profile);

        const isSuper = user.email === SUPER_ADMIN_EMAIL || profile.role === 'super_admin';
        const companies = await fetchUserCompanies(user.uid, isSuper);
        setAllCompanies(companies);

        if (isSuper) {
          fetchDemoEnquiries().then(setEnquiries).catch(() => {});
        }

        let targetCompany: Company | null = null;
        if (profile.companyId) {
          targetCompany =
            companies.find((c) => c.id === profile.companyId) ||
            (await fetchCompanyById(profile.companyId));
        } else if (companies.length > 0) {
          targetCompany = companies[0];
        }

        if (targetCompany) {
          setActiveCompany(targetCompany);
          setTenantDataset(buildEmptyDataset(targetCompany));
          setIsSandbox(false);
          setViewMode('workspace');
          setAuthModalOpen(false);
        } else {
          // Signed in but no company registered yet
          setAuthModalMode('register');
        }
      } catch (err) {
        setAuthError(
          err instanceof Error ? err.message : 'Unable to load workspace profile.'
        );
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to all company subcollections when authenticated into a real tenant
  useEffect(() => {
    if (isSandbox || !firebaseUser || !activeCompany) return;

    const cid = activeCompany.id;
    const unsubs = [
      subscribeCompanySubcollection<Department>(cid, 'departments', (departments) =>
        setTenantDataset((prev) => (prev ? { ...prev, departments } : prev))
      ),
      subscribeCompanySubcollection<CompanyMember>(cid, 'members', (members) =>
        setTenantDataset((prev) => (prev ? { ...prev, members } : prev))
      ),
      subscribeCompanySubcollection<IndustrialProfile>(cid, 'industrial_profiles', (profiles) =>
        setTenantDataset((prev) =>
          prev ? { ...prev, industrialProfile: profiles[0] || null } : prev
        )
      ),
      subscribeCompanySubcollection<Supplier>(cid, 'suppliers', (suppliers) =>
        setTenantDataset((prev) => (prev ? { ...prev, suppliers } : prev))
      ),
      subscribeCompanySubcollection<InventoryItem>(cid, 'inventory', (inventory) =>
        setTenantDataset((prev) => (prev ? { ...prev, inventory } : prev))
      ),
      subscribeCompanySubcollection<StockMovement>(cid, 'stock_movements', (stockMovements) =>
        setTenantDataset((prev) => (prev ? { ...prev, stockMovements } : prev))
      ),
      subscribeCompanySubcollection<PurchaseOrder>(cid, 'purchase_orders', (purchaseOrders) =>
        setTenantDataset((prev) => (prev ? { ...prev, purchaseOrders } : prev))
      ),
      subscribeCompanySubcollection<ProductionOrder>(cid, 'production_orders', (productionOrders) =>
        setTenantDataset((prev) => (prev ? { ...prev, productionOrders } : prev))
      ),
      subscribeCompanySubcollection<Machine>(cid, 'machines', (machines) =>
        setTenantDataset((prev) => (prev ? { ...prev, machines } : prev))
      ),
      subscribeCompanySubcollection<MachineDowntime>(cid, 'machine_downtime', (machineDowntime) =>
        setTenantDataset((prev) => (prev ? { ...prev, machineDowntime } : prev))
      ),
      subscribeCompanySubcollection<QualityInspection>(cid, 'quality_inspections', (qualityInspections) =>
        setTenantDataset((prev) => (prev ? { ...prev, qualityInspections } : prev))
      ),
      subscribeCompanySubcollection<SafetyIncident>(cid, 'safety_incidents', (safetyIncidents) =>
        setTenantDataset((prev) => (prev ? { ...prev, safetyIncidents } : prev))
      ),
      subscribeCompanySubcollection<ComplianceDocument>(cid, 'compliance_documents', (complianceDocuments) =>
        setTenantDataset((prev) => (prev ? { ...prev, complianceDocuments } : prev))
      ),
      subscribeCompanySubcollection<AiRecommendation>(cid, 'ai_recommendations', (aiRecommendations) =>
        setTenantDataset((prev) => (prev ? { ...prev, aiRecommendations } : prev))
      ),
      subscribeCompanySubcollection<AuditLog>(cid, 'audit_logs', (auditLogs) =>
        setTenantDataset((prev) => (prev ? { ...prev, auditLogs } : prev))
      ),
    ];

    return () => {
      for (const u of unsubs) u();
    };
  }, [isSandbox, firebaseUser, activeCompany]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In failed or was cancelled.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterCompany = async (input: {
    companyName: string;
    segment: IndustrySegment;
    location: string;
    gstNumber?: string;
  }) => {
    if (!firebaseUser) return;
    setAuthError(null);
    setAuthLoading(true);
    try {
      const company = await registerCompanyWorkspace({
        uid: firebaseUser.uid,
        email: firebaseUser.email || 'admin@selaqui.in',
        displayName: firebaseUser.displayName || 'Company Admin',
        ...input,
      });
      setActiveCompany(company);
      setTenantDataset(buildEmptyDataset(company));
      setAllCompanies((prev) => [...prev, company]);
      setIsSandbox(false);
      setViewMode('workspace');
      setAuthModalOpen(false);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Failed to register company workspace.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEnterSandbox = () => {
    setIsSandbox(true);
    setViewMode('workspace');
    setAuthModalOpen(false);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsSandbox(false);
    setViewMode('landing');
  };

  const dataset = isSandbox ? sandboxDataset : tenantDataset;
  const activeRole: UserRole = isSandbox
    ? sandboxRole
    : userProfile?.role || 'company_admin';
  const currentUid = isSandbox
    ? 'demo_admin_01'
    : firebaseUser?.uid || 'demo_admin_01';
  const currentEmail = isSandbox
    ? 'operations@himalayanmedtech.in'
    : firebaseUser?.email || '';

  const logLocalAudit = (action: string, module: string, targetId: string, details: string) => {
    const entry: AuditLog = {
      id: generateRecordId('aud'),
      companyId: sandboxDataset.company.id,
      actorUid: currentUid,
      actorEmail: currentEmail,
      action,
      module,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    };
    setSandboxDataset((prev) => ({
      ...prev,
      auditLogs: [entry, ...prev.auditLogs],
    }));
  };

  // Unified Mutation Handlers (Sandbox state OR Firestore)
  const handleAddInspection = async (inspection: QualityInspection) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        qualityInspections: [inspection, ...prev.qualityInspections],
      }));
      logLocalAudit('LOGGED_QC_INSPECTION', 'quality', inspection.id, `Logged ${inspection.inspectionCode}`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'quality_inspections', inspection.id, { ...inspection });
    await appendAuditLog(activeCompany.id, {
      actorUid: currentUid,
      actorEmail: currentEmail,
      action: 'LOGGED_QC_INSPECTION',
      module: 'quality',
      targetId: inspection.id,
      details: `Logged QC inspection ${inspection.inspectionCode} (${inspection.subjectName}).`,
    });
  };

  const handleUpdateReleaseStatus = async (
    inspectionId: string,
    releaseStatus: QualityInspection['releaseStatus'],
    correctiveAction?: string
  ) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        qualityInspections: prev.qualityInspections.map((q) =>
          q.id === inspectionId
            ? {
                ...q,
                releaseStatus,
                approvedByUid: currentUid,
                ...(correctiveAction ? { correctiveAction } : {}),
              }
            : q
        ),
      }));
      logLocalAudit(`QC_${releaseStatus.toUpperCase()}`, 'quality', inspectionId, `QA status updated to ${releaseStatus}`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(
      activeCompany.id,
      'quality_inspections',
      inspectionId,
      {
        releaseStatus,
        approvedByUid: currentUid,
        ...(correctiveAction ? { correctiveAction } : {}),
      },
      true
    );
    await appendAuditLog(activeCompany.id, {
      actorUid: currentUid,
      actorEmail: currentEmail,
      action: `QC_${releaseStatus.toUpperCase()}`,
      module: 'quality',
      targetId: inspectionId,
      details: `Authorized release status changed to ${releaseStatus}.`,
    });
  };

  const handleAddInventoryItem = async (item: InventoryItem) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        inventory: [item, ...prev.inventory],
      }));
      logLocalAudit('ADDED_INVENTORY_SKU', 'inventory', item.id, `Added ${item.sku} - ${item.name}`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'inventory', item.id, { ...item });
    await appendAuditLog(activeCompany.id, {
      actorUid: currentUid,
      actorEmail: currentEmail,
      action: 'ADDED_INVENTORY_SKU',
      module: 'inventory',
      targetId: item.id,
      details: `Added ${item.sku} (${item.name}).`,
    });
  };

  const handleLogStockMovement = async (
    item: InventoryItem,
    movement: StockMovement,
    nextStock: number
  ) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        inventory: prev.inventory.map((i) =>
          i.id === item.id ? { ...i, currentStock: nextStock } : i
        ),
        stockMovements: [movement, ...prev.stockMovements],
      }));
      logLocalAudit('STOCK_MOVEMENT', 'inventory', item.id, `${movement.movementType} ${movement.quantity} ${item.unit}`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'stock_movements', movement.id, { ...movement });
    await writeCompanyRecord(activeCompany.id, 'inventory', item.id, { currentStock: nextStock }, true);
    await appendAuditLog(activeCompany.id, {
      actorUid: currentUid,
      actorEmail: currentEmail,
      action: 'STOCK_MOVEMENT',
      module: 'inventory',
      targetId: item.id,
      details: `${movement.movementType} ${movement.quantity} ${item.unit} on ${item.sku}.`,
    });
  };

  const handleAddProductionOrder = async (order: ProductionOrder) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        productionOrders: [order, ...prev.productionOrders],
      }));
      logLocalAudit('CREATED_PRODUCTION_ORDER', 'production', order.id, `Created ${order.orderCode}`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'production_orders', order.id, { ...order });
    await appendAuditLog(activeCompany.id, {
      actorUid: currentUid,
      actorEmail: currentEmail,
      action: 'CREATED_PRODUCTION_ORDER',
      module: 'production',
      targetId: order.id,
      details: `Scheduled order ${order.orderCode} for ${order.productName}.`,
    });
  };

  const handleUpdateProductionOrder = async (
    orderId: string,
    patch: Partial<ProductionOrder>
  ) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        productionOrders: prev.productionOrders.map((o) =>
          o.id === orderId ? { ...o, ...patch } : o
        ),
      }));
      logLocalAudit('UPDATED_PRODUCTION_ORDER', 'production', orderId, `Updated order status/output`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'production_orders', orderId, { ...patch }, true);
    await appendAuditLog(activeCompany.id, {
      actorUid: currentUid,
      actorEmail: currentEmail,
      action: 'UPDATED_PRODUCTION_ORDER',
      module: 'production',
      targetId: orderId,
      details: `Updated production order fields: ${Object.keys(patch).join(', ')}.`,
    });
  };

  const handleLogDowntime = async (
    downtime: MachineDowntime,
    machineId: string,
    addHours: number
  ) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        machineDowntime: [downtime, ...prev.machineDowntime],
        machines: prev.machines.map((m) =>
          m.id === machineId
            ? {
                ...m,
                downtimeHoursMonth: Number((m.downtimeHoursMonth + addHours).toFixed(1)),
                status: downtime.downtimeType === 'unplanned' ? 'maintenance' : m.status,
              }
            : m
        ),
      }));
      logLocalAudit('LOGGED_DOWNTIME', 'production', machineId, `${addHours}h ${downtime.downtimeType}`);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'machine_downtime', downtime.id, { ...downtime });
    const targetMachine = tenantDataset?.machines.find((m) => m.id === machineId);
    if (targetMachine) {
      await writeCompanyRecord(
        activeCompany.id,
        'machines',
        machineId,
        {
          downtimeHoursMonth: Number((targetMachine.downtimeHoursMonth + addHours).toFixed(1)),
        },
        true
      );
    }
  };

  const handleAddSupplier = async (sup: Supplier) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({ ...prev, suppliers: [sup, ...prev.suppliers] }));
      logLocalAudit('REGISTERED_SUPPLIER', 'suppliers', sup.id, sup.name);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'suppliers', sup.id, { ...sup });
  };

  const handleAddPurchaseOrder = async (po: PurchaseOrder) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({ ...prev, purchaseOrders: [po, ...prev.purchaseOrders] }));
      logLocalAudit('CREATED_PO', 'suppliers', po.id, po.poNumber);
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'purchase_orders', po.id, { ...po });
  };

  const handleUpdatePurchaseOrder = async (poId: string, patch: Partial<PurchaseOrder>) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        purchaseOrders: prev.purchaseOrders.map((p) => (p.id === poId ? { ...p, ...patch } : p)),
      }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'purchase_orders', poId, { ...patch }, true);
  };

  const handleSaveAiRecommendation = async (rec: AiRecommendation) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        aiRecommendations: [rec, ...prev.aiRecommendations],
      }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'ai_recommendations', rec.id, { ...rec });
  };

  const handleAddComplianceDoc = async (docItem: ComplianceDocument) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        complianceDocuments: [docItem, ...prev.complianceDocuments],
      }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'compliance_documents', docItem.id, { ...docItem });
  };

  const handleApproveComplianceDoc = async (docId: string) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        complianceDocuments: prev.complianceDocuments.map((d) =>
          d.id === docId ? { ...d, status: 'valid', approvedByUid: currentUid } : d
        ),
      }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(
      activeCompany.id,
      'compliance_documents',
      docId,
      { status: 'valid', approvedByUid: currentUid },
      true
    );
  };

  const handleAddSafetyIncident = async (incident: SafetyIncident) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        safetyIncidents: [incident, ...prev.safetyIncidents],
      }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'safety_incidents', incident.id, { ...incident });
  };

  const handleCloseSafetyIncident = async (incidentId: string) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        safetyIncidents: prev.safetyIncidents.map((s) =>
          s.id === incidentId ? { ...s, status: 'closed' } : s
        ),
      }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(
      activeCompany.id,
      'safety_incidents',
      incidentId,
      { status: 'closed' },
      true
    );
  };

  const handleAddDepartment = async (dept: Department) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({ ...prev, departments: [...prev.departments, dept] }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'departments', dept.id, { ...dept });
  };

  const handleAddMember = async (member: CompanyMember) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({ ...prev, members: [...prev.members, member] }));
      return;
    }
    if (!activeCompany) return;
    await writeCompanyRecord(activeCompany.id, 'members', member.uid, { ...member });
  };

  const handleToggleModule = async (moduleKey: ModuleKey) => {
    if (!dataset) return;
    const exists = dataset.company.enabledModules.includes(moduleKey);
    const nextModules = exists
      ? dataset.company.enabledModules.filter((k) => k !== moduleKey)
      : [...dataset.company.enabledModules, moduleKey];

    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        company: { ...prev.company, enabledModules: nextModules },
      }));
      return;
    }
    if (!activeCompany) return;
    await updateCompanySettings(activeCompany.id, { enabledModules: nextModules });
    setActiveCompany((prev) => (prev ? { ...prev, enabledModules: nextModules } : prev));
  };

  const handleUpdateCompanyStatus = async (
    companyId: string,
    status: Company['registrationStatus']
  ) => {
    if (isSandbox) {
      setSandboxDataset((prev) => ({
        ...prev,
        company: { ...prev.company, registrationStatus: status },
      }));
      return;
    }
    await updateCompanySettings(companyId, { registrationStatus: status });
    setAllCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, registrationStatus: status } : c))
    );
    if (activeCompany?.id === companyId) {
      setActiveCompany((prev) => (prev ? { ...prev, registrationStatus: status } : prev));
    }
  };

  const handleLoadSampleTemplate = async () => {
    if (!activeCompany || isSandbox) return;
    const sample = createSandboxDataset();
    for (const sup of sample.suppliers) {
      await writeCompanyRecord(activeCompany.id, 'suppliers', sup.id, {
        ...sup,
        companyId: activeCompany.id,
        createdByUid: currentUid,
      });
    }
    for (const inv of sample.inventory) {
      await writeCompanyRecord(activeCompany.id, 'inventory', inv.id, {
        ...inv,
        companyId: activeCompany.id,
        createdByUid: currentUid,
      });
    }
    for (const ord of sample.productionOrders) {
      await writeCompanyRecord(activeCompany.id, 'production_orders', ord.id, {
        ...ord,
        companyId: activeCompany.id,
        departmentId: tenantDataset?.departments[0]?.id || 'dept_default',
        createdByUid: currentUid,
      });
    }
    for (const qc of sample.qualityInspections) {
      await writeCompanyRecord(activeCompany.id, 'quality_inspections', qc.id, {
        ...qc,
        companyId: activeCompany.id,
        createdByUid: currentUid,
      });
    }
  };

  if (viewMode === 'landing' || !dataset) {
    return (
      <>
        <LandingPage
          onOpenAuthModal={(mode = 'signin') => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onEnterSandbox={handleEnterSandbox}
        />
        <AuthOnboardingModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          isAuthenticated={Boolean(firebaseUser)}
          userEmail={firebaseUser?.email}
          onClose={() => setAuthModalOpen(false)}
          onGoogleSignIn={handleGoogleSignIn}
          onRegisterCompany={handleRegisterCompany}
          onEnterSandbox={handleEnterSandbox}
          authError={authError}
          loading={authLoading}
        />
      </>
    );
  }

  return (
    <WorkspaceShell
      company={dataset.company}
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      userRole={activeRole}
      onChangeSandboxRole={isSandbox ? setSandboxRole : undefined}
      isSandbox={isSandbox}
      userDisplayName={
        isSandbox
          ? 'Demo Plant Evaluator'
          : userProfile?.displayName || firebaseUser?.displayName || 'Authorized User'
      }
      onExitToWebsite={() => setViewMode('landing')}
      onSignOut={handleSignOut}
    >
      {activeModule === 'command_centre' && (
        <CommandCentreView
          dataset={dataset}
          onNavigateModule={setActiveModule}
          onLoadSampleTemplate={!isSandbox ? handleLoadSampleTemplate : undefined}
          isSandbox={isSandbox}
        />
      )}
      {activeModule === 'quality' && (
        <QualityModule
          dataset={dataset}
          userRole={activeRole}
          currentUid={currentUid}
          onAddInspection={handleAddInspection}
          onUpdateReleaseStatus={handleUpdateReleaseStatus}
        />
      )}
      {activeModule === 'inventory' && (
        <InventoryModule
          dataset={dataset}
          userRole={activeRole}
          currentUid={currentUid}
          onAddInventoryItem={handleAddInventoryItem}
          onLogStockMovement={handleLogStockMovement}
        />
      )}
      {activeModule === 'production' && (
        <ProductionModule
          dataset={dataset}
          userRole={activeRole}
          currentUid={currentUid}
          onAddProductionOrder={handleAddProductionOrder}
          onUpdateProductionOrder={handleUpdateProductionOrder}
          onLogDowntime={handleLogDowntime}
        />
      )}
      {activeModule === 'suppliers' && (
        <SuppliersModule
          dataset={dataset}
          userRole={activeRole}
          currentUid={currentUid}
          onAddSupplier={handleAddSupplier}
          onAddPurchaseOrder={handleAddPurchaseOrder}
          onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
        />
      )}
      {activeModule === 'ai_predictions' && (
        <AiPredictionCentreView
          dataset={dataset}
          isSandbox={isSandbox}
          currentUid={currentUid}
          onSaveAiRecommendation={handleSaveAiRecommendation}
        />
      )}
      {activeModule === 'compliance' && (
        <ComplianceSafetyView
          dataset={dataset}
          userRole={activeRole}
          currentUid={currentUid}
          onAddComplianceDoc={handleAddComplianceDoc}
          onApproveComplianceDoc={handleApproveComplianceDoc}
          onAddSafetyIncident={handleAddSafetyIncident}
          onCloseSafetyIncident={handleCloseSafetyIncident}
        />
      )}
      {activeModule === 'reports' && <ReportsAnalyticsView dataset={dataset} />}
      {activeModule === 'admin' && (
        <AdminConsoleView
          dataset={dataset}
          userRole={activeRole}
          currentUid={currentUid}
          allCompanies={isSandbox ? [dataset.company] : allCompanies}
          enquiries={enquiries}
          onAddDepartment={handleAddDepartment}
          onAddMember={handleAddMember}
          onToggleModule={handleToggleModule}
          onUpdateCompanyStatus={handleUpdateCompanyStatus}
        />
      )}
    </WorkspaceShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
