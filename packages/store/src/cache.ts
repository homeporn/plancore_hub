/**
 * Minimal async memoization cache.
 *
 * Keyed by string; stores the in-flight promise so concurrent callers share a
 * single fetch. Entries persist until explicitly invalidated (the reference
 * data it backs changes rarely and only via the orchestrator). Pure and
 * dependency-free, so it is trivially testable.
 */
export class AsyncCache {
  private readonly entries = new Map<string, Promise<unknown>>();

  /** Return the cached value for `key`, or call `load` and cache its promise. */
  async get<T>(key: string, load: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing) return existing as Promise<T>;
    const promise = load().catch((err) => {
      // Don't cache failures — allow the next caller to retry.
      this.entries.delete(key);
      throw err;
    });
    this.entries.set(key, promise);
    return promise as Promise<T>;
  }

  /** Drop a single key (e.g. after a write that affects it). */
  invalidate(key: string): void {
    this.entries.delete(key);
  }

  /** Drop every key whose name starts with `prefix`. */
  invalidatePrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  /** Clear the whole cache. */
  clear(): void {
    this.entries.clear();
  }
}
