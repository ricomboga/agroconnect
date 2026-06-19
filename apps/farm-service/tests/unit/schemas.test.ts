import { createFarmSchema } from '../../src/schemas/createFarm.schema';
import { updateFarmSchema } from '../../src/schemas/updateFarm.schema';
import { createPlotSchema } from '../../src/schemas/createPlot.schema';
import { createActivitySchema } from '../../src/schemas/createActivity.schema';
import { updateActivitySchema } from '../../src/schemas/updateActivity.schema';
import { createInputSchema } from '../../src/schemas/createInput.schema';
import { createHarvestSchema } from '../../src/schemas/createHarvest.schema';
import { listActivitiesQuerySchema } from '../../src/schemas/listActivities.query.schema';
import { listInputsQuerySchema } from '../../src/schemas/listInputs.query.schema';
import { farmSummaryQuerySchema } from '../../src/schemas/farmSummary.query.schema';

// ---------------------------------------------------------------------------
// createFarmSchema
// ---------------------------------------------------------------------------
describe('createFarmSchema', () => {
  const valid = {
    name: 'Wanjiru Farm',
    locationLat: -0.023559,
    locationLng: 37.906193,
    county: 'Meru',
    areaAcres: 5.5,
  };

  it('accepts a minimal valid payload', () => {
    expect(createFarmSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts all optional fields', () => {
    const r = createFarmSchema.safeParse({
      ...valid,
      subCounty: 'Imenti North',
      soilType: 'loam',
      waterSource: 'borehole',
    });
    expect(r.success).toBe(true);
  });

  it('rejects latitude out of range', () => {
    expect(createFarmSchema.safeParse({ ...valid, locationLat: 91 }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...valid, locationLat: -91 }).success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    expect(createFarmSchema.safeParse({ ...valid, locationLng: 181 }).success).toBe(false);
  });

  it('rejects non-positive areaAcres', () => {
    expect(createFarmSchema.safeParse({ ...valid, areaAcres: 0 }).success).toBe(false);
    expect(createFarmSchema.safeParse({ ...valid, areaAcres: -1 }).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(createFarmSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects unknown soilType', () => {
    expect(createFarmSchema.safeParse({ ...valid, soilType: 'volcanic' }).success).toBe(false);
  });

  it('rejects unknown waterSource', () => {
    expect(createFarmSchema.safeParse({ ...valid, waterSource: 'tap' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateFarmSchema
// ---------------------------------------------------------------------------
describe('updateFarmSchema', () => {
  it('accepts a partial update with only name', () => {
    expect(updateFarmSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('accepts status change to fallow', () => {
    expect(updateFarmSchema.safeParse({ status: 'fallow' }).success).toBe(true);
  });

  it('rejects unknown status', () => {
    expect(updateFarmSchema.safeParse({ status: 'abandoned' }).success).toBe(false);
  });

  it('rejects negative areaAcres', () => {
    expect(updateFarmSchema.safeParse({ areaAcres: -1 }).success).toBe(false);
  });

  it('accepts an empty object (all fields are optional)', () => {
    expect(updateFarmSchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createPlotSchema
// ---------------------------------------------------------------------------
describe('createPlotSchema', () => {
  const valid = { name: 'Plot A', areaAcres: 1.2 };

  it('accepts a minimal payload', () => {
    expect(createPlotSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a planting date in YYYY-MM-DD format', () => {
    expect(
      createPlotSchema.safeParse({ ...valid, currentCropPlantedAt: '2025-03-15' }).success,
    ).toBe(true);
  });

  it('rejects a planting date in wrong format', () => {
    expect(
      createPlotSchema.safeParse({ ...valid, currentCropPlantedAt: '15/03/2025' }).success,
    ).toBe(false);
  });

  it('rejects non-positive areaAcres', () => {
    expect(createPlotSchema.safeParse({ name: 'Plot B', areaAcres: 0 }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createActivitySchema
// ---------------------------------------------------------------------------
describe('createActivitySchema', () => {
  const valid = {
    type: 'planting' as const,
    title: 'Maize planting season 1',
    scheduledDate: '2025-03-01',
  };

  it('accepts a minimal activity', () => {
    expect(createActivitySchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown activity type', () => {
    expect(createActivitySchema.safeParse({ ...valid, type: 'pruning' }).success).toBe(false);
  });

  it('rejects a malformed scheduledDate', () => {
    expect(createActivitySchema.safeParse({ ...valid, scheduledDate: '01-03-2025' }).success).toBe(
      false,
    );
  });

  it('rejects negative labourCostKes', () => {
    expect(createActivitySchema.safeParse({ ...valid, labourCostKes: -100 }).success).toBe(false);
  });

  it('defaults labourCostKes to 0 when omitted', () => {
    const r = createActivitySchema.safeParse(valid);
    expect(r.success && r.data.labourCostKes).toBe(0);
  });

  it('accepts a valid plotId UUID', () => {
    const r = createActivitySchema.safeParse({
      ...valid,
      plotId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a non-UUID plotId', () => {
    expect(createActivitySchema.safeParse({ ...valid, plotId: 'not-a-uuid' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateActivitySchema
// ---------------------------------------------------------------------------
describe('updateActivitySchema', () => {
  it('accepts completing an activity', () => {
    const r = updateActivitySchema.safeParse({ status: 'completed', completedDate: '2025-03-10' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown status', () => {
    expect(updateActivitySchema.safeParse({ status: 'cancelled' }).success).toBe(false);
  });

  it('accepts an empty object (all fields optional)', () => {
    expect(updateActivitySchema.safeParse({}).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createInputSchema
// ---------------------------------------------------------------------------
describe('createInputSchema', () => {
  const valid = {
    type: 'fertiliser' as const,
    productName: 'CAN Fertiliser 26N',
    quantity: 50,
    unit: 'kg',
    unitCostKes: 60,
    totalCostKes: 3000,
    appliedDate: '2025-03-05',
  };

  it('accepts a valid input', () => {
    expect(createInputSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown input type', () => {
    expect(createInputSchema.safeParse({ ...valid, type: 'water' }).success).toBe(false);
  });

  it('rejects zero quantity', () => {
    expect(createInputSchema.safeParse({ ...valid, quantity: 0 }).success).toBe(false);
  });

  it('rejects negative unitCostKes', () => {
    expect(createInputSchema.safeParse({ ...valid, unitCostKes: -1 }).success).toBe(false);
  });

  it('rejects a malformed appliedDate', () => {
    expect(createInputSchema.safeParse({ ...valid, appliedDate: '2025/03/05' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createHarvestSchema
// ---------------------------------------------------------------------------
describe('createHarvestSchema', () => {
  const valid = {
    crop: 'maize',
    quantityKg: 800,
    harvestDate: '2025-07-20',
  };

  it('accepts a minimal harvest', () => {
    expect(createHarvestSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects non-positive quantityKg', () => {
    expect(createHarvestSchema.safeParse({ ...valid, quantityKg: 0 }).success).toBe(false);
  });

  it('rejects an unknown qualityGrade', () => {
    expect(createHarvestSchema.safeParse({ ...valid, qualityGrade: 'S' }).success).toBe(false);
  });

  it('accepts all quality grades', () => {
    for (const grade of ['A', 'B', 'C', 'reject']) {
      expect(createHarvestSchema.safeParse({ ...valid, qualityGrade: grade }).success).toBe(true);
    }
  });

  it('defaults soldQuantityKg to 0', () => {
    const r = createHarvestSchema.safeParse(valid);
    expect(r.success && r.data.soldQuantityKg).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// listActivitiesQuerySchema
// ---------------------------------------------------------------------------
describe('listActivitiesQuerySchema', () => {
  it('accepts empty query (all defaults)', () => {
    const r = listActivitiesQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.page_size).toBe(20);
    }
  });

  it('accepts valid filters', () => {
    const r = listActivitiesQuerySchema.safeParse({
      from_date: '2025-01-01',
      to_date: '2025-06-30',
      status: 'completed',
    });
    expect(r.success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    expect(listActivitiesQuerySchema.safeParse({ status: 'done' }).success).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(listActivitiesQuerySchema.safeParse({ from_date: '01/01/2025' }).success).toBe(false);
  });

  it('rejects page less than 1', () => {
    expect(listActivitiesQuerySchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects page_size greater than 100', () => {
    expect(listActivitiesQuerySchema.safeParse({ page_size: 101 }).success).toBe(false);
  });

  it('coerces string page to number', () => {
    const r = listActivitiesQuerySchema.safeParse({ page: '3' });
    expect(r.success && r.data.page).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// listInputsQuerySchema
// ---------------------------------------------------------------------------
describe('listInputsQuerySchema', () => {
  it('accepts empty query', () => {
    expect(listInputsQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid input type filter', () => {
    expect(listInputsQuerySchema.safeParse({ type: 'seed' }).success).toBe(true);
  });

  it('rejects an unknown input type', () => {
    expect(listInputsQuerySchema.safeParse({ type: 'water' }).success).toBe(false);
  });

  it('accepts a valid 4-digit season year', () => {
    const r = listInputsQuerySchema.safeParse({ season: '2025' });
    expect(r.success && r.data.season).toBe(2025);
  });

  it('rejects a season year before 2000', () => {
    expect(listInputsQuerySchema.safeParse({ season: '1999' }).success).toBe(false);
  });

  it('rejects a season year after 2100', () => {
    expect(listInputsQuerySchema.safeParse({ season: '2101' }).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// farmSummaryQuerySchema
// ---------------------------------------------------------------------------
describe('farmSummaryQuerySchema', () => {
  it('accepts empty query', () => {
    expect(farmSummaryQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts a valid date range', () => {
    const r = farmSummaryQuerySchema.safeParse({ from_date: '2025-01-01', to_date: '2025-12-31' });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(farmSummaryQuerySchema.safeParse({ from_date: '2025/01/01' }).success).toBe(false);
  });
});
