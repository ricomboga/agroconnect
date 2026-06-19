import { parsePaginationParams } from '../../../src/utils/pagination';

describe('parsePaginationParams', () => {
  it('returns defaults when query is empty', () => {
    const result = parsePaginationParams({});
    expect(result).toEqual({ take: 20, skip: 0 });
  });

  it('computes skip correctly for page 2', () => {
    const result = parsePaginationParams({ page: '2', page_size: '10' });
    expect(result).toEqual({ take: 10, skip: 10 });
  });

  it('computes skip correctly for page 3 with page_size 5', () => {
    const result = parsePaginationParams({ page: '3', page_size: '5' });
    expect(result).toEqual({ take: 5, skip: 10 });
  });

  it('clamps page_size to MAX_PAGE_SIZE of 100', () => {
    const result = parsePaginationParams({ page: '1', page_size: '500' });
    expect(result.take).toBe(100);
  });

  it('defaults page to 1 when value is 0', () => {
    const result = parsePaginationParams({ page: '0' });
    expect(result.skip).toBe(0);
  });

  it('defaults page to 1 when value is NaN', () => {
    const result = parsePaginationParams({ page: 'abc' });
    expect(result.skip).toBe(0);
  });

  it('defaults page_size to 20 when value is NaN', () => {
    const result = parsePaginationParams({ page_size: 'xyz' });
    expect(result.take).toBe(20);
  });
});
