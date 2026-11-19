# Selaqui Industrial Intelligence — Payload-First Security Specification (Phase 0)

## 1. Core Data Invariants
1. **Tenant Isolation**: Every operational record (production orders, batches, quality inspections, inventory, suppliers, machines, safety incidents, compliance documents, AI predictions, reports, audit logs) lives under `/companies/{companyId}/...` and carries an immutable `companyId` field matching the path `{companyId}`. No user from Company A can read, list, create, update, or delete records in Company B.
2. **Membership & Role Gate**: Access to `/companies/{companyId}/...` requires an active membership record at `/companies/{companyId}/members/{request.auth.uid}` (or Super Admin verification), and `request.auth.token.email_verified == true` for all mutations.
3. **Immutable Ownership & Timestamps**: `companyId`, `createdByUid`, and `createdAt` cannot be modified after creation. `createdAt` on create and `updatedAt` on update must equal `request.time`.
4. **QC & Schedule Approval Authority**: AI prediction/recommendation records never auto-approve QC release (`releaseStatus: 'approved'`) or production schedules. Only `company_admin` or `department_manager` can transition a QC inspection to `released` or `rejected`, or approve a company registration (`super_admin` only).
5. **Append-Only Audit Trails**: Documents in `audit_logs` can only be created with valid schema and `actorUid == request.auth.uid`; updates and deletes are strictly forbidden (`false`).
6. **PII Isolation**: User email and profile metadata in `/users/{uid}` can only be read by the user themselves (`uid == request.auth.uid`) or a Super Admin.
7. **Terminal State Locking**: Completed/released/closed records (`status == 'completed'` or `'closed'` or `'released'`) cannot be mutated by operators; only `company_admin` or `super_admin` can perform audited overrides.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Read/Write**: User belonging to `comp_alpha` attempts to create or read `/companies/comp_beta/production_orders/po_1`. -> MUST return `PERMISSION_DENIED`.
2. **Self-Role Escalation on Registration**: New user registers `/users/{uid}` with `role: "super_admin"` -> MUST return `PERMISSION_DENIED`.
3. **Self-Role Escalation on Update**: Operator updates their own `/companies/{companyId}/members/{uid}` document changing `role` from `"operator"` to `"company_admin"` -> MUST return `PERMISSION_DENIED`.
4. **Shadow / Ghost Field Injection**: User creates a `quality_inspections` doc with all valid fields plus `isBypassed: true` -> MUST return `PERMISSION_DENIED` (`hasOnly` check).
5. **Unverified Email Mutation**: Authenticated user with `email_verified: false` attempts to write a production order -> MUST return `PERMISSION_DENIED`.
6. **ID Poisoning (Denial of Wallet)**: User attempts to create a document with a 300-char ID or invalid characters (`../hack`) -> MUST return `PERMISSION_DENIED` (`isValidId`).
7. **Timestamp Forgery**: Client submits `createdAt` set to a past date instead of `request.time` -> MUST return `PERMISSION_DENIED`.
8. **Operator QC Release Bypass**: User with `operator` role attempts to update `quality_inspections` `releaseStatus` to `"released"` -> MUST return `PERMISSION_DENIED`.
9. **Audit Log Tampering**: Even a `company_admin` attempts to `update` or `delete` an existing `audit_logs` document -> MUST return `PERMISSION_DENIED`.
10. **Company Registration Self-Approval**: Company Admin attempts to update `/companies/{companyId}` `registrationStatus` from `"pending"` to `"approved"` -> MUST return `PERMISSION_DENIED` (Super Admin only).
11. **Terminal State Mutation**: Operator attempts to edit a `production_orders` document whose `status` is already `"completed"` -> MUST return `PERMISSION_DENIED`.
12. **Blanket User Listing / PII Scrape**: Authenticated non-admin user attempts to `list` `/users` collection -> MUST return `PERMISSION_DENIED`.
