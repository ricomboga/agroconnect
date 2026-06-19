import { createListingSchema } from '../../../src/schemas/createListing.schema';

const VALID = {
  farmId: '00000000-0000-0000-0000-000000000001',
  crop: 'maize',
  quantityKg: 500,
  askingPriceKes: 42,
  qualityGrade: 'A',
  availableFrom: '2026-07-01',
  availableUntil: '2026-07-31',
  locationCounty: 'Nakuru',
};

describe('createListingSchema', () => {
  it('accepts a valid listing', () => {
    expect(createListingSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects missing crop', () => {
    const { crop: _, ...rest } = VALID;
    expect(createListingSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects non-positive quantityKg', () => {
    expect(createListingSchema.safeParse({ ...VALID, quantityKg: 0 }).success).toBe(false);
    expect(createListingSchema.safeParse({ ...VALID, quantityKg: -1 }).success).toBe(false);
  });

  it('rejects non-positive askingPriceKes', () => {
    expect(createListingSchema.safeParse({ ...VALID, askingPriceKes: 0 }).success).toBe(false);
  });

  it('rejects invalid qualityGrade', () => {
    expect(createListingSchema.safeParse({ ...VALID, qualityGrade: 'Z' }).success).toBe(false);
  });

  it('rejects invalid date format for availableFrom', () => {
    expect(createListingSchema.safeParse({ ...VALID, availableFrom: 'not-a-date' }).success).toBe(false);
  });

  it('rejects invalid farmId UUID', () => {
    expect(createListingSchema.safeParse({ ...VALID, farmId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects photos array exceeding 5 items', () => {
    expect(
      createListingSchema.safeParse({
        ...VALID,
        photos: ['https://a.com/1.jpg', 'https://a.com/2.jpg', 'https://a.com/3.jpg',
                 'https://a.com/4.jpg', 'https://a.com/5.jpg', 'https://a.com/6.jpg'],
      }).success,
    ).toBe(false);
  });
});
