type CacheEntry<V> = { value: V; expiresAt: number };

export class SimpleTTLCache<K, V> {
	private store = new Map<K, CacheEntry<V>>();

	constructor(private defaultTtlMs: number = 60000) {}

	get(key: K): V | undefined {
		const entry = this.store.get(key);
		if (!entry) return undefined;
		if (entry.expiresAt < Date.now()) {
			this.store.delete(key);
			return undefined;
		}
		return entry.value;
	}

	set(key: K, value: V, ttlMs?: number) {
		this.store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) });
	}

	delete(key: K) {
		this.store.delete(key);
	}

	clear() {
		this.store.clear();
	}
}
