import { describe, it, expect, beforeEach } from 'vitest';
import { TrackerService } from '../src/tracker/tracker.service';
import {
  LocalStorageTrackerRepository,
  LocalStorageStore,
} from '../src/repositories/local-storage';

describe('TrackerService — Modular Expense Tracker Engine', () => {
  let service: TrackerService;
  let repo: LocalStorageTrackerRepository;
  const familyId = 'fam_test_construction';
  const memberId = 'mem_test_user';

  beforeEach(() => {
    LocalStorageStore.clear();
    repo = new LocalStorageTrackerRepository();
    service = new TrackerService(repo);
  });

  it('creates a project with sq ft and calculates price per sq ft dynamically', async () => {
    const project = await service.createProject(familyId, memberId, {
      name: 'SK Complex',
      totalAreaSqFt: '3058',
      description: 'Commercial building',
    });

    expect(project.name).toBe('SK Complex');
    expect(project.total_area_sqft).toBe('3058');
    expect(project.phases.length).toBeGreaterThan(0);

    // Add an expense: 1000 cement bags @ ₹350 = ₹3,50,000
    await service.createExpense(familyId, memberId, project.id, {
      productName: 'UltraTech Cement',
      quantity: '1000',
      pricePerQty: '350',
    });

    const projectWithStats = await service.getProject(familyId, project.id);
    expect(projectWithStats.totalSpend).toBe('350000.00');
    expect(projectWithStats.itemsCount).toBe(1);
    // Price per sq ft = 350000 / 3058 = 114.45
    expect(projectWithStats.pricePerSqFt).toBe('114.45');
  });

  it('calculates average cost per item if area sq ft is not provided', async () => {
    const project = await service.createProject(familyId, memberId, {
      name: 'Retail Store',
      description: 'Retail inventory & setup',
    });

    await service.createExpense(familyId, memberId, project.id, {
      productName: 'Racks & Shelves',
      quantity: '2',
      pricePerQty: '25000',
    });

    const projectWithStats = await service.getProject(familyId, project.id);
    expect(projectWithStats.pricePerSqFt).toBeNull();
    expect(projectWithStats.avgCostPerItem).toBe('50000.00');
  });

  it('generates phase, tag, and quantity analytics with Show Labour Cost toggle', async () => {
    const project = await service.createProject(familyId, memberId, {
      name: 'SK Complex',
      totalAreaSqFt: '3058',
    });

    const phaseBasement = await service.createPhase(familyId, project.id, { name: 'Basement' });
    const phaseLabour = await service.createPhase(familyId, project.id, { name: 'Labour' });

    const tagSteels = await service.createTag(familyId, project.id, { name: 'Steels', hexColor: '#6E7B8B' });
    const tagLabour = await service.createTag(familyId, project.id, { name: 'Labour Cost', hexColor: '#E53935' });

    const typeSteels = await service.createType(familyId, project.id, { name: 'TMT Steels' });
    const typeLabour = await service.createType(familyId, project.id, { name: 'Masonry Labour' });

    // 1. Material Expense: 500 kg @ ₹70 = ₹35,000
    await service.createExpense(familyId, memberId, project.id, {
      expenseTypeId: typeSteels.id,
      productName: 'TMT 12mm',
      quantity: '500',
      pricePerQty: '70',
      projectPhaseId: phaseBasement.id,
      tagItemId: tagSteels.id,
    });

    // 2. Labour Expense: 1 unit @ ₹1,00,000 = ₹1,00,000
    await service.createExpense(familyId, memberId, project.id, {
      expenseTypeId: typeLabour.id,
      productName: 'Basement Masonry',
      quantity: '1',
      pricePerQty: '100000',
      projectPhaseId: phaseLabour.id,
      tagItemId: tagLabour.id,
    });

    // Analytics with Labour included
    const analyticsWithLabour = await service.getAnalytics(familyId, project.id, { includeLabour: true });
    expect(analyticsWithLabour.summary.totalSpend).toBe('135000.00');
    expect(analyticsWithLabour.priceByPhase.length).toBe(2);

    // Analytics with Labour excluded (toggle OFF)
    const analyticsNoLabour = await service.getAnalytics(familyId, project.id, { includeLabour: false });
    expect(analyticsNoLabour.summary.totalSpend).toBe('35000.00');
    expect(analyticsNoLabour.priceByPhase.length).toBe(1);
    expect(analyticsNoLabour.priceByPhase[0].phaseName).toBe('Basement');
  });
});
