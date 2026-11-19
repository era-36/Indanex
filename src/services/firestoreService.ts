import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
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
  ProductionOrder,
  PurchaseOrder,
  QualityInspection,
  SafetyIncident,
  StockMovement,
  Supplier,
  UserProfile,
} from '../types/industrial';
import { INDUSTRY_SEGMENTS } from '../data/industrySegments';
import { clampText, FIELD_LIMITS, generateRecordId } from '../utils/validation';

export const ALL_MODULE_KEYS: ModuleKey[] = [
  'command_centre',
  'quality',
  'inventory',
  'production',
  'suppliers',
  'ai_predictions',
  'compliance',
  'reports',
  'admin',
];

export const SUPER_ADMIN_EMAIL = 'ayush.0251mba543@dgu.ac.in';

export async function submitDemoEnquiry(input: {
  contactName: string;
  companyName: string;
  email: string;
  phone?: string;
  segment: IndustrySegment;
  message?: string;
}): Promise<string> {
  const id = generateRecordId('enq');
  const path = `demo_enquiries/${id}`;
  try {
    await setDoc(doc(db, 'demo_enquiries', id), {
      id,
      contactName: clampText(input.contactName, FIELD_LIMITS.displayName),
      companyName: clampText(input.companyName, FIELD_LIMITS.companyName),
      email: clampText(input.email, FIELD_LIMITS.email),
      ...(input.phone ? { phone: clampText(input.phone, FIELD_LIMITS.phone) } : {}),
      segment: input.segment,
      ...(input.message ? { message: clampText(input.message, FIELD_LIMITS.message) } : {}),
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getOrCreateUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
}): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const isSuper = user.email === SUPER_ADMIN_EMAIL;
    const profile: Record<string, unknown> = {
      uid: user.uid,
      email: clampText(user.email || 'user@selaqui.local', FIELD_LIMITS.email),
      displayName: clampText(user.displayName || 'Industrial User', FIELD_LIMITS.displayName),
      role: isSuper ? 'super_admin' : 'company_admin',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', user.uid), profile);
    return {
      uid: user.uid,
      email: String(profile.email),
      displayName: String(profile.displayName),
      role: profile.role as UserProfile['role'],
      status: 'active',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function registerCompanyWorkspace(input: {
  uid: string;
  email: string;
  displayName: string;
  companyName: string;
  segment: IndustrySegment;
  location: string;
  gstNumber?: string;
}): Promise<Company> {
  const companyId = generateRecordId('comp');
  const compPath = `companies/${companyId}`;
  try {
    const companyPayload: Record<string, unknown> = {
      id: companyId,
      name: clampText(input.companyName, FIELD_LIMITS.companyName),
      segment: input.segment,
      location: clampText(input.location, FIELD_LIMITS.location),
      ...(input.gstNumber?.trim()
        ? { gstNumber: clampText(input.gstNumber, FIELD_LIMITS.gstNumber) }
        : {}),
      registrationStatus: 'pending',
      adminUid: input.uid,
      enabledModules: ALL_MODULE_KEYS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'companies', companyId), companyPayload);

    // Create initial Company Admin membership
    await setDoc(doc(db, `companies/${companyId}/members`, input.uid), {
      uid: input.uid,
      companyId,
      email: clampText(input.email, FIELD_LIMITS.email),
      displayName: clampText(input.displayName, FIELD_LIMITS.displayName),
      role: 'company_admin',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update user profile pointer
    await updateDoc(doc(db, 'users', input.uid), {
      companyId,
      updatedAt: serverTimestamp(),
    });

    // Seed default departments and industrial profile for the chosen segment
    const segDef = INDUSTRY_SEGMENTS[input.segment];
    for (const dept of segDef.defaultDepartments) {
      const deptId = generateRecordId('dept');
      await setDoc(doc(db, `companies/${companyId}/departments`, deptId), {
        id: deptId,
        companyId,
        name: clampText(dept.name, FIELD_LIMITS.departmentName),
        code: clampText(dept.code, FIELD_LIMITS.departmentCode),
        createdByUid: input.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, `companies/${companyId}/industrial_profiles`, 'default'), {
      id: 'default',
      companyId,
      segment: input.segment,
      validatedProblems: segDef.investigativeProblems.slice(0, 3),
      regulatoryFrameworks: segDef.defaultComplianceFrameworks,
      qcParameters: segDef.defaultQcParameters,
      updatedByUid: input.uid,
      updatedAt: serverTimestamp(),
    });

    await appendAuditLog(companyId, {
      actorUid: input.uid,
      actorEmail: input.email,
      action: 'COMPANY_REGISTERED',
      module: 'admin',
      targetId: companyId,
      details: `Registered ${input.companyName} (${segDef.name}) pending verification.`,
    });

    return {
      id: companyId,
      name: String(companyPayload.name),
      segment: input.segment,
      location: String(companyPayload.location),
      gstNumber: input.gstNumber?.trim() || undefined,
      registrationStatus: 'pending',
      adminUid: input.uid,
      enabledModules: ALL_MODULE_KEYS,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, compPath);
  }
}

export async function fetchUserCompanies(uid: string, isSuperAdmin: boolean): Promise<Company[]> {
  const path = 'companies';
  try {
    const q = isSuperAdmin
      ? query(collection(db, path))
      : query(collection(db, path), where('adminUid', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Company);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchCompanyById(companyId: string): Promise<Company | null> {
  const path = `companies/${companyId}`;
  try {
    const snap = await getDoc(doc(db, 'companies', companyId));
    return snap.exists() ? (snap.data() as Company) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function appendAuditLog(
  companyId: string,
  entry: {
    actorUid: string;
    actorEmail?: string;
    action: string;
    module: string;
    targetId?: string;
    details?: string;
  }
): Promise<void> {
  const id = generateRecordId('aud');
  const path = `companies/${companyId}/audit_logs/${id}`;
  try {
    await setDoc(doc(db, `companies/${companyId}/audit_logs`, id), {
      id,
      companyId,
      actorUid: entry.actorUid,
      ...(entry.actorEmail ? { actorEmail: clampText(entry.actorEmail, FIELD_LIMITS.email) } : {}),
      action: clampText(entry.action, 120),
      module: clampText(entry.module, 64),
      ...(entry.targetId ? { targetId: clampText(entry.targetId, FIELD_LIMITS.id) } : {}),
      ...(entry.details ? { details: clampText(entry.details, FIELD_LIMITS.auditDetails) } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeCompanySubcollection<T>(
  companyId: string,
  subcollection: string,
  onData: (items: T[]) => void,
  orderField?: string
): Unsubscribe {
  const path = `companies/${companyId}/${subcollection}`;
  const colRef = collection(db, path);
  const q = orderField ? query(colRef, orderBy(orderField, 'desc')) : query(colRef);
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as T);
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function writeCompanyRecord(
  companyId: string,
  subcollection: string,
  id: string,
  payload: Record<string, unknown>,
  isUpdate = false
): Promise<void> {
  const path = `companies/${companyId}/${subcollection}/${id}`;
  try {
    if (isUpdate) {
      await updateDoc(doc(db, `companies/${companyId}/${subcollection}`, id), {
        ...payload,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, `companies/${companyId}/${subcollection}`, id), {
        ...payload,
        id,
        companyId,
        createdAt: serverTimestamp(),
        ...(subcollection === 'stock_movements' ||
        subcollection === 'machine_downtime' ||
        subcollection === 'ai_recommendations' ||
        subcollection === 'audit_logs'
          ? {}
          : { updatedAt: serverTimestamp() }),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isUpdate ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export async function removeCompanyRecord(
  companyId: string,
  subcollection: string,
  id: string
): Promise<void> {
  const path = `companies/${companyId}/${subcollection}/${id}`;
  try {
    await deleteDoc(doc(db, `companies/${companyId}/${subcollection}`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateCompanySettings(
  companyId: string,
  patch: Partial<Pick<Company, 'name' | 'location' | 'segment' | 'gstNumber' | 'enabledModules' | 'registrationStatus'>>
): Promise<void> {
  const path = `companies/${companyId}`;
  try {
    await updateDoc(doc(db, 'companies', companyId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function fetchDemoEnquiries(): Promise<DemoEnquiry[]> {
  const path = 'demo_enquiries';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.data() as DemoEnquiry);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export type SubcollectionTypes = {
  departments: Department;
  members: CompanyMember;
  industrial_profiles: IndustrialProfile;
  suppliers: Supplier;
  inventory: InventoryItem;
  stock_movements: StockMovement;
  purchase_orders: PurchaseOrder;
  production_orders: ProductionOrder;
  machines: Machine;
  machine_downtime: MachineDowntime;
  quality_inspections: QualityInspection;
  safety_incidents: SafetyIncident;
  compliance_documents: ComplianceDocument;
  ai_recommendations: AiRecommendation;
  audit_logs: AuditLog;
};
