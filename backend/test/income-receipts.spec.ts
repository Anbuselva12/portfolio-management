import { describe, it, expect, beforeEach } from 'vitest';
import { IncomeService } from '../src/income/income.service';
import {
  LocalStorageIncomeRepository,
  LocalStorageTrackerRepository,
  LocalStorageAuditRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';

const familyId = 'fam_1';
const memberId = 'mem_1';

const yearMonthOffset = (offset: number): string => {
  const d = new Date();
  const shifted = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
};

describe('IncomeService — recording, correcting and undoing receipts', () => {
  let incomeRepo: LocalStorageIncomeRepository;
  let service: IncomeService;
  let streamId: string;

  beforeEach(async () => {
    LocalStorageStore.clear();
    incomeRepo = new LocalStorageIncomeRepository();
    service = new IncomeService(incomeRepo, new LocalStorageAuditRepository(), new LocalStorageTrackerRepository());
    streamId = (
      await service.createIncome(memberId, familyId, {
        type: 'rent', label: 'House 4', amount: 11000, currency: 'INR', recurrence: 'recurring_monthly',
        startDate: '2026-01-01T00:00:00.000Z',
      })
    ).id;
  });

  it('records receipts for past months but rejects future or malformed months', async () => {
    const past = yearMonthOffset(-6);
    const receipt = await service.confirmReceipt(memberId, familyId, streamId, past, { receivedAmount: 11000 });
    expect(receipt.year_month).toBe(past);

    await expect(
      service.confirmReceipt(memberId, familyId, streamId, yearMonthOffset(1), { receivedAmount: 1 }),
    ).rejects.toThrow(/current and past months/);
    await expect(
      service.confirmReceipt(memberId, familyId, streamId, '2026-13', { receivedAmount: 1 }),
    ).rejects.toThrow(/YYYY-MM/);
  });

  it('corrects a receipt in place and undoes it back to pending', async () => {
    const past = yearMonthOffset(-2);
    const receipt = await service.confirmReceipt(memberId, familyId, streamId, past, { receivedAmount: 11000 });

    const edited = await service.updateReceipt(memberId, familyId, receipt.id, { receivedAmount: 9000, notes: 'part payment' });
    expect(edited.received_amount.toString()).toBe('9000');
    expect(edited.notes).toBe('part payment');
    expect(edited.status).toBe('received');

    await service.revertReceipt(memberId, familyId, receipt.id);
    const stored = await incomeRepo.findReceiptByIncomeAndMonth(streamId, past);
    expect(stored.status).toBe('pending');

    // A reverted receipt can no longer be edited or reverted - it is not a transaction any more
    await expect(service.updateReceipt(memberId, familyId, receipt.id, { receivedAmount: 1 })).rejects.toThrow(/not found/i);
    await expect(service.revertReceipt(memberId, familyId, receipt.id)).rejects.toThrow(/not found/i);

    // Re-recording the month works again
    const again = await service.confirmReceipt(memberId, familyId, streamId, past, { receivedAmount: 11000 });
    expect(again.status).toBe('received');
  });

  it('never touches another family\'s receipt', async () => {
    const receipt = await service.confirmReceipt(memberId, familyId, streamId, yearMonthOffset(-1), { receivedAmount: 11000 });
    await expect(service.updateReceipt(memberId, 'other_family', receipt.id, { receivedAmount: 1 })).rejects.toThrow(/not found/i);
    await expect(service.revertReceipt(memberId, 'other_family', receipt.id)).rejects.toThrow(/not found/i);
  });

  it('lets a one-off income change its date, but not a recurring stream', async () => {
    const oneOff = await service.createIncome(memberId, familyId, {
      type: 'other', label: 'Bonus', amount: 5000, currency: 'INR', recurrence: 'one_off', startDate: '2026-03-01T00:00:00.000Z',
    });
    const moved = await service.updateIncome(memberId, familyId, oneOff.id, { startDate: '2026-02-10T00:00:00.000Z' });
    expect(new Date(moved.start_date).toISOString().slice(0, 10)).toBe('2026-02-10');

    await expect(
      service.updateIncome(memberId, familyId, streamId, { startDate: '2026-02-10T00:00:00.000Z' }),
    ).rejects.toThrow(/one-off/i);
  });
});
