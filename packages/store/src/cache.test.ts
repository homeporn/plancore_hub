import { describe, it, expect, vi } from 'vitest';
import { AsyncCache } from './cache.js';

describe('AsyncCache', () => {
  it('caches the resolved value and does not reload', async () => {
    const cache = new AsyncCache();
    const load = vi.fn().mockResolvedValue(42);
    expect(await cache.get('k', load)).toBe(42);
    expect(await cache.get('k', load)).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shares an in-flight promise between concurrent callers', async () => {
    const cache = new AsyncCache();
    const load = vi.fn().mockImplementation(() => Promise.resolve('x'));
    const [a, b] = await Promise.all([cache.get('k', load), cache.get('k', load)]);
    expect(a).toBe('x');
    expect(b).toBe('x');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const cache = new AsyncCache();
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');
    await expect(cache.get('k', load)).rejects.toThrow('boom');
    expect(await cache.get('k', load)).toBe('ok');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('invalidate drops a single key', async () => {
    const cache = new AsyncCache();
    const load = vi.fn().mockResolvedValue(1);
    await cache.get('k', load);
    cache.invalidate('k');
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('invalidatePrefix drops matching keys only', async () => {
    const cache = new AsyncCache();
    const a = vi.fn().mockResolvedValue('a');
    const b = vi.fn().mockResolvedValue('b');
    await cache.get('items:1', a);
    await cache.get('other', b);
    cache.invalidatePrefix('items:');
    await cache.get('items:1', a);
    await cache.get('other', b);
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
