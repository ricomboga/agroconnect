import { createProductSchema } from '../../../src/schemas/createProduct.schema';

const VALID = {
  name: 'Urea 50kg',
  category: 'fertiliser',
  description: 'Nitrogen fertiliser for top-dressing',
  unit: 'bag',
  pricePerUnitKes: 3800,
  stockQuantity: 200,
  countyAvailability: ['Nakuru', 'Kiambu'],
};

describe('createProductSchema', () => {
  it('accepts a valid product', () => {
    expect(createProductSchema.safeParse(VALID).success).toBe(true);
  });

  it('rejects missing name', () => {
    const { name: _, ...rest } = VALID;
    expect(createProductSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects invalid category', () => {
    expect(createProductSchema.safeParse({ ...VALID, category: 'magic_beans' }).success).toBe(false);
  });

  it('rejects non-positive pricePerUnitKes', () => {
    expect(createProductSchema.safeParse({ ...VALID, pricePerUnitKes: 0 }).success).toBe(false);
  });

  it('rejects negative stockQuantity', () => {
    expect(createProductSchema.safeParse({ ...VALID, stockQuantity: -1 }).success).toBe(false);
  });

  it('rejects empty countyAvailability array', () => {
    expect(createProductSchema.safeParse({ ...VALID, countyAvailability: [] }).success).toBe(false);
  });

  it('rejects missing description', () => {
    const { description: _, ...rest } = VALID;
    expect(createProductSchema.safeParse(rest).success).toBe(false);
  });
});
