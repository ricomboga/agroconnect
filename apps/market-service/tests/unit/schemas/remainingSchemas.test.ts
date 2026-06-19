import { createInquirySchema } from '../../../src/schemas/createInquiry.schema';
import { listListingsQuerySchema } from '../../../src/schemas/listListings.query.schema';
import { listOrdersQuerySchema } from '../../../src/schemas/listOrders.query.schema';
import { listProductsQuerySchema } from '../../../src/schemas/listProducts.query.schema';
import { updateListingSchema } from '../../../src/schemas/updateListing.schema';
import { updateProductSchema } from '../../../src/schemas/updateProduct.schema';

describe('createInquirySchema', () => {
  it('accepts valid message', () => {
    expect(createInquirySchema.safeParse({ message: 'Is this available?' }).success).toBe(true);
  });

  it('rejects empty message', () => {
    expect(createInquirySchema.safeParse({ message: '' }).success).toBe(false);
  });

  it('rejects message over 500 chars', () => {
    expect(createInquirySchema.safeParse({ message: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('listListingsQuerySchema', () => {
  it('accepts empty query with defaults', () => {
    const result = listListingsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.page_size).toBe(20);
    }
  });

  it('accepts all optional filters', () => {
    const result = listListingsQuerySchema.safeParse({
      crop: 'maize',
      county: 'Nakuru',
      quality_grade: 'A',
      available_from: '2026-07-01',
      available_until: '2026-07-31',
      page: '2',
      page_size: '10',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid quality_grade', () => {
    expect(listListingsQuerySchema.safeParse({ quality_grade: 'premium' }).success).toBe(false);
  });
});

describe('listOrdersQuerySchema', () => {
  it('accepts valid status filter', () => {
    expect(listOrdersQuerySchema.safeParse({ status: 'pending' }).success).toBe(true);
    expect(listOrdersQuerySchema.safeParse({ status: 'dispatched' }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(listOrdersQuerySchema.safeParse({ status: 'shipped' }).success).toBe(false);
  });

  it('uses defaults for page/page_size', () => {
    const result = listOrdersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.page_size).toBe(20);
    }
  });
});

describe('listProductsQuerySchema', () => {
  it('accepts valid category filter', () => {
    expect(listProductsQuerySchema.safeParse({ category: 'fertiliser' }).success).toBe(true);
    expect(listProductsQuerySchema.safeParse({ category: 'seed' }).success).toBe(true);
  });

  it('rejects invalid category', () => {
    expect(listProductsQuerySchema.safeParse({ category: 'chemicals' }).success).toBe(false);
  });

  it('accepts county filter', () => {
    expect(listProductsQuerySchema.safeParse({ county: 'Nakuru' }).success).toBe(true);
  });
});

describe('updateListingSchema', () => {
  it('accepts partial update', () => {
    expect(updateListingSchema.safeParse({ crop: 'beans' }).success).toBe(true);
  });

  it('accepts quality grade update', () => {
    expect(updateListingSchema.safeParse({ qualityGrade: 'B' }).success).toBe(true);
  });

  it('rejects empty object (at least one field required)', () => {
    expect(updateListingSchema.safeParse({}).success).toBe(false);
  });

  it('rejects invalid quality grade', () => {
    expect(updateListingSchema.safeParse({ qualityGrade: 'premium' }).success).toBe(false);
  });

  it('rejects photos array with more than 5 items', () => {
    const photos = ['https://a.com/1.jpg', 'https://a.com/2.jpg', 'https://a.com/3.jpg',
      'https://a.com/4.jpg', 'https://a.com/5.jpg', 'https://a.com/6.jpg'];
    expect(updateListingSchema.safeParse({ photos }).success).toBe(false);
  });
});

describe('updateProductSchema', () => {
  it('accepts partial update', () => {
    expect(updateProductSchema.safeParse({ name: 'New Name' }).success).toBe(true);
  });

  it('accepts stockQuantity of 0 (nonnegative)', () => {
    expect(updateProductSchema.safeParse({ stockQuantity: 0 }).success).toBe(true);
  });

  it('rejects negative stockQuantity', () => {
    expect(updateProductSchema.safeParse({ stockQuantity: -1 }).success).toBe(false);
  });

  it('rejects empty countyAvailability array', () => {
    expect(updateProductSchema.safeParse({ countyAvailability: [] }).success).toBe(false);
  });

  it('rejects empty object (at least one field required)', () => {
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });
});
