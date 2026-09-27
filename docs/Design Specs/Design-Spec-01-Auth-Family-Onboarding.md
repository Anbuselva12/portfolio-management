# Design Spec 01 — Auth & Family Onboarding

**Companion to:** SDD-Family-Wealth-Manager.md §4.1, §15.3
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Login
- Centered card: app logo/name, Username field, Password field, "Log in" button.
- Link: "Forgot password? Contact your family admin." (v1 has no self-service email reset — matches SDD FR-5).
- Link: "New here? Create an account" → Register.

## 2. Screen: Register
- Fields: Username (validated unique in real time via debounce API check), Password, Confirm Password, Display Name.
- On success: account created with `status = unaffiliated`, auto-logs in, routes straight to **Family Selection** (no dead-end "you're registered, now log in" step).

## 3. Screen: Family Selection
Shown to any logged-in Member whose `family_id` is null. Two large side-by-side choice cards (stack on mobile):

**Card A — Create a New Family**
- Fields: Family Name, Base Currency (dropdown, defaults to INR), Country (v1: India only, shown as a fixed/disabled selector with a tooltip "More countries coming soon").
- Additional toggle: "Allow other people to find and join this family" (`is_discoverable`), and if enabled, a sub-toggle "Require my approval before they join" (`join_policy = approval_required`, default ON) vs "Let them join immediately" (`open`).
- Button: "Create Family" → user becomes Admin, `status = active`, routes to empty Dashboard with onboarding empty-states.

**Card B — Join an Existing Family**
- A searchable list of discoverable families (`GET /families/discoverable`): Family Name, member count, join-policy badge ("Open" / "Requires approval").
- Selecting one and confirming triggers `POST /families/:id/join`:
  - If `open`: immediate `status = active`, routes to Dashboard (data already populated by other members — a brief "Welcome to [Family Name]" toast).
  - If `approval_required`: `status = pending_approval`, routes to the **Pending-Approval Holding Screen**.
- Empty state if no discoverable families exist: "No families are open to join right now. Ask your family admin to invite you directly, or create your own family."

## 4. Screen: Pending-Approval Holding Screen
- Simple centered state: icon + "Your request to join **[Family Name]** is waiting for approval from an admin." + "Log out" and a muted "Choose a different family instead" link (routes back to Family Selection, cancels the pending request).
- No sidebar/nav/financial data rendered in this state — enforced both client-side and by the API (all financial endpoints reject `pending_approval` callers).
- Auto-polls (or refreshes on next login) to detect approval and transition to Dashboard once `status = active`.

## 5. Admin Screen: Pending Requests (also referenced in Design-Spec-07)
- A list under Settings → Members & Access: each row shows the requesting user's Display Name/Username, requested date, with **Approve** / **Reject** buttons.
- A small amber `PendingBadge` count appears on the Settings nav item whenever pending requests exist, so Admins don't have to check manually.
- Approve → member becomes `active`, gains full data access per their role; Reject → member reverts to `unaffiliated` and returns to Family Selection on next visit, with a neutral toast (no shaming copy — "Your request wasn't approved. You can try another family or create your own.").

## 6. Admin-Direct Invite Flow (alternative entry point)
- From Settings → Members & Access → "+ Add Member": Admin enters username + temp password directly; this path **skips join-request/approval** entirely since the Admin is the one initiating it.
- If the username already exists as an `unaffiliated` account, the system offers "This username already has an account — send them a join invite instead?" rather than erroring, to avoid duplicate-account confusion.

## 7. States & Edge Cases
| State | UI Behavior |
|---|---|
| Username taken (register) | Inline field error, real-time check |
| Family name not required unique | Multiple families may share a display name; disambiguate join list by creator/member-count if needed |
| User cancels a pending join to pick another family | Pending request is withdrawn; no notification sent to the rejected family's admin |
| Deactivated member tries to log in | Clear message: "Your account has been deactivated by your family admin." No password-reset self-service offered here (contact admin) |
