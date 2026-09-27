# Design Spec 03 — Assets & Income

**Companion to:** SDD-Family-Wealth-Manager.md §4.2, §3.2.1
**Shared tokens/components:** see Design-Spec-00-Foundations.md

---

## 1. Screen: Assets
- **List view**: grouped by Member (section headers) then by Asset Type within each; each row shows Name, Type icon, Current Value, (if applicable) Projected Maturity Value as a muted secondary figure, Maturity Date, and an edit/delete kebab menu.
- **Add/Edit Drawer** (`SlideDrawer`): Type dropdown, Name, Currency, Current Value, Principal Invested (optional), Interest Rate (optional, shown only for FD/RD/PF/NPS types — conditional fields), Maturity Date (optional), Notes. Save/Cancel.
- Deleting shows a `ConfirmDialog`: "This will remove [Asset] from your portfolio. This can be restored from Audit Trail."

## 2. Screen: Income
- **List view**: two tabs — "Recurring" and "One-off" — each filterable by Member and Type.
- Recurring rows show: Label, Amount/month, Expected Day of Month (e.g. "5th of every month"), Reminders badge (Active / Muted), Start Date, Status badge (Active/Stopped), and actions:
  - **Edit** → opens an "Effective date of this change?" flow. Per SDD §3.2.1, this does not overwrite history: the current entry is closed as of the day before the new effective date, and a new entry begins — so a mid-year rent increase shows correctly in trend charts.
  - **Stop** → asks "Stop as of which date?", sets `end_date`, `status = stopped`.
  - **Delete** → red trash button triggering confirmation modal: "Delete this income stream? (Can be restored from Audit Trail)". Soft-deletes record and produces audit log.
  - **Toggle Reminders** → turn on/off monthly arrival reminder in the Dashboard queue.
- One-off rows: Label, Amount, Date, Status, and actions:
  - **Edit** in place (direct edit drawer).
  - **Delete** red trash icon triggering confirmation modal to remove the one-off record with audit trail recording.
- Add flow: Type, Label, Amount, Currency, Recurring toggle.
  - If recurring is ON:
    - Start Date
    - Expected Day of Month (default 1st or day of start date)
    - **Reminders Toggle** ("Show in monthly arrival reminders on Dashboard" - default true)
  - If recurring is OFF: single Date.
- **Monthly Variation Tracking**: For incomes that vary from month to month (such as partial rent collection or fluctuating salary bonuses/overtime), the member confirms the actual received amount directly on the monthly dashboard reminder. This writes a monthly receipt record for that month/year while leaving the base contract/expected recurring amount intact.

## States
- Empty state per tab: "No recurring income yet — add your salary to get started" / "No one-off income logged yet."
- Asset type with no applicable interest-rate field (e.g., bank balance) simply hides that field rather than showing it disabled.
