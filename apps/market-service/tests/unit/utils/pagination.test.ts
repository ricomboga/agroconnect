import { parsePaginationParams, buildMeta } from '../../../src/utils/pagination';

describe('parsePaginationParams', () => {
  it('defaults to page 1 and page_size 20', () => {
    expect(parsePaginationParams({})).toEqual({ take: 20, skip: 0 });
  });

  it('parses page and page_size', () => {
    expect(parsePaginationParams({ page: '3', page_size: '10' })).toEqual({ take: 10, skip: 20 });
  });

  it('clamps page_size to 100 max', () => {
    expect(parsePaginationParams({ page_size: '999' })).toEqual({ take: 100, skip: 0 });
  });

  it('clamps page_size min to 1', () => {
    expect(parsePaginationParams({ page_size: '0' })).toEqual({ take: 20, skip: 0 });
  });

  it('clamps page min to 1', () => {
    expect(parsePaginationParams({ page: '-5' })).toEqual({ take: 20, skip: 0 });
  });

  it('handles non-numeric page/page_size gracefully', () => {
    expect(parsePaginationParams({ page: 'abc', page_size: 'xyz' })).toEqual({ take: 20, skip: 0 });
  });
});

describe('buildMeta', () => {
  it('builds correct meta for first page', () => {
    const meta = buildMeta({ page: '1' }, { take: 20, skip: 0 }, 100);
    expect(meta).toEqual({ page: 1, page_size: 20, total: 100, total_pages: 5 });
  });

  it('rounds up total_pages', () => {
    const meta = buildMeta({ page: '1' }, { take: 20, skip: 0 }, 21);
    expect(meta.total_pages).toBe(2);
  });

  it('returns total_pages 0 when total is 0', () => {
    const meta = buildMeta({}, { take: 20, skip: 0 }, 0);
    expect(meta.total_pages).toBe(0);
  });

  it('uses page from query', () => {
    const meta = buildMeta({ page: '3' }, { take: 10, skip: 20 }, 50);
    expect(meta).toEqual({ page: 3, page_size: 10, total: 50, total_pages: 5 });
  });
});
