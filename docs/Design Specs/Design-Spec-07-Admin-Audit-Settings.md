# Design Spec 07 — Admin, Audit Trail & Settings

**Companion to:** SDD-Family-Wealth-Manager.md §4.1, §4.7, §6
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Settings → Family Settings
- Base Currency, Country (India only in v1, shown disabled with "more countries coming soon"), Currency Rate table (manual entry/edit).
- **Join Policy controls**: `is_discoverable` toggle, `join_policy` (open / approval_required) selector — same fields set at family-creation time (Design-Spec-01), editable here afterward.
- Cross-Member Edit toggle (`allow_cross_member_edit`).
- Custom-Weighted strategy default weights (sliders: rate / balance / flexibility / penalty / tenure) + split-vs-cascade mode toggle.

## 2. Screen: Settings → Members & Access (Admin only)
- Table of members: Display Name, Username, Role, Status (Active/Deactivated/Pending), "Reset Password" and "Deactivate/Reactivate" actions.
- **"+ Add Member"** button → Admin-direct invite flow (username + temp password; see Design-Spec-01 §6).
- **Pending Requests** sub-section (or tab): list of `pending_approval` members with Approve/Reject actions (see Design-Spec-01 §5). A `PendingBadge` on the Settings nav item surfaces the count.

## 3. Screen: Settings → My Profile
- Change password (requires current password), preferred display currency, display name.

## 4. Screen: Audit Trail (Admin sees all; Members see "My Activity" filtered to themselves)
- Table: Timestamp, Member, Action (create/update/delete/restore/login/password_reset/approve/reject), Entity Type, Entity, Field Changes (expandable diff: old → new).
- Filters: Member, Entity Type, Date Range, Action.
- Deleted-record rows show a **Restore** action (Admin only) — restoring re-activates the record and logs the restore event itself.

## States
- Empty Audit Trail (brand-new family): "No activity yet."
- A Member without Admin role sees only their own actions and cannot see other members' entries in "My Activity," per the default privacy posture (family-level financial *totals* are shared; individual audit history is not, unless `allow_cross_member_edit` implies broader visibility — configurable at build time if the family wants full transparency instead).
