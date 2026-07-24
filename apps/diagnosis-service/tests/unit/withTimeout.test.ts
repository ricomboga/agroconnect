import { withTimeout, TimeoutError } from '../../src/utils/withTimeout';

describe('withTimeout', () => {
  it('resolves with the original value when the promise settles before the deadline', async () => {
    const result = await withTimeout(Promise.resolve('done'), 100, 'test');
    expect(result).toBe('done');
  });

  it('rejects with TimeoutError when the promise does not settle before the deadline', async () => {
    const neverResolves = new Promise(() => {});
    await expect(withTimeout(neverResolves, 20, 'slow-op')).rejects.toThrow(TimeoutError);
  });

  it('propagates the original rejection when the promise rejects before the deadline', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100, 'test')).rejects.toThrow('boom');
  });
});
