import { parsePaginationParams } from '../../../src/utils/pagination';

describe('parsePaginationParams', () => {
  it('returns page=1, pageSize=20 for empty query', () => {
    const result = parsePaginationParams({});
    expect(result).toEqual({ take: 20, skip: 0 });
  });

  it('calculates correct skip from page number', () => {
    const result = parsePaginationParams({ page: '3', page_size: '10' });
    expect(result).toEqual({ take: 10, skip: 20 });
  });

  it('uses page 2 with default page_size', () => {
    const result = parsePaginationParams({ page: '2' });
    expect(result).toEqual({ take: 20, skip: 20 });
  });

  it('clamps page_size to MAX_PAGE_SIZE of 100', () => {
    const result = parsePaginationParams({ page_size: '500' });
    expect(result.take).toBe(100);
  });

  it('falls back to default page_size when 0 is given (0 is falsy)', () => {
    const result = parsePaginationParams({ page_size: '0' });
    expect(result.take).toBe(20);
  });

  it('clamps negative page_size to minimum of 1', () => {
    const result = parsePaginationParams({ page_size: '-5' });
    expect(result.take).toBe(1);
  });

  it('clamps page to minimum of 1 so skip is never negative', () => {
    const result = parsePaginationParams({ page: '0' });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('falls back to defaults for non-numeric page and page_size', () => {
    const result = parsePaginationParams({ page: 'abc', page_size: 'xyz' });
    expect(result).toEqual({ take: 20, skip: 0 });
  });

  it('handles numeric values (non-string) gracefully', () => {
    const result = parsePaginationParams({ page: 2, page_size: 5 });
    expect(result).toEqual({ take: 5, skip: 5 });
  });
});
