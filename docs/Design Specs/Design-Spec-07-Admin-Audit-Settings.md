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
- **Navigation & Access**:
  - Direct entry point in the main sidebar and mobile slide-over drawer as **"Members & Access"** (`/settings/members`), plus reachable via Settings tab bar.
  - Displays an amber notification badge on navigation whenever pending join requests exist.
  - Also surfaces as an amber alert banner at the top of the Admin's Dashboard.
- **Pending Join Requests Section**:
  - Highlights all users with `status = pending_approval` who requested to join this family group.
  - Displays username, display name, and requested date with **Approve Access** and **Reject** buttons.
  - Approving instantly activates the account and moves them to the active roster; Rejecting clears the family association and resets status to `unaffiliated`.
- **Active Family Members Section**:
  - Table of current members: Display Name, Username, Role (Admin/Member), Status (Active/Deactivated), "Generate Reset Code" and "Deactivate/Reactivate" actions.
- **"+ Add Member"** button → Admin-direct invite flow (username + temp password; see Design-Spec-01 §6).

## 3. Screen: Settings → My Profile
- Change password (requires current password), preferred display currency, display name.

## 4. Screen: Audit Trail (Admin sees all; Members see "My Activity" filtered to themselves)
- Table: Timestamp, Member, Action (create/update/delete/restore/login/password_reset/approve/reject), Entity Type, Entity, Field Changes (expandable diff: old → new).
- Filters: Member, Entity Type, Date Range, Action.
- Deleted-record rows show a **Restore** action (Admin only) — restoring re-activates the record and logs the restore event itself.

## States
- Empty Audit Trail (brand-new family): "No activity yet."
- A Member without Admin role sees only their own actions and cannot see other members' entries in "My Activity," per the default privacy posture (family-level financial *totals* are shared; individual audit history is not, unless `allow_cross_member_edit` implies broader visibility — configurable at build time if the family wants full transparency instead).

## Update 2026-10-19 — Removing members, leaving, and admin notifications
- Members & Access shows a red **Remove** button for every member except yourself. It opens an alert dialog listing what will be permanently deleted (assets, income streams, receipts, loans, household expenses, insurance, project expenses) with counts, then **Remove and delete their data**.
- My Profile shows a **Leave this family** card for members of a real family, with the same impact dialog. The only admin cannot leave while others remain.
- After a removal or departure, admins see a dismissible banner at the top of the Dashboard after signing in ("<name> was removed from the family" / "<name> left the family", with what was deleted).
- In a solo workspace the Members & Access menu, Family Settings tab and family wording are hidden.
