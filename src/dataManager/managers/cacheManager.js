class GlobalCacheManager {
    constructor() {
        this.caches = new Map();
    }

    getCache(cacheName) {
        if (!this.caches.has(cacheName)) {
            this.caches.set(cacheName, new Map());
        }

        return this.caches.get(cacheName);
    }

    set(key, value, cacheName = "default") {
        const cache = this.getCache(cacheName);
        cache.set(key, value);
    }

    get(key, cacheName = "default") {
        const cache = this.getCache(cacheName);
        return cache.get(key);
    }

    delete(key, cacheName = "default") {
        const cache = this.getCache(cacheName);
        cache.delete(key);
    }

    clear(cacheName = "default") {
        const cache = this.getCache(cacheName);
        cache.clear();
    }

    findByQuery(query, cacheName = "default") {
        const cache = this.getCache(cacheName);
        let results = [];
        for (let [key, value] of cache) {
            const formattedKey = key.replace(" ", "").toLowerCase();
            const formattedQuery = query.replace(" ", "").toLowerCase();
            if (formattedKey.includes(formattedQuery)) {
                results.push({ key, value });
            }
        }
        return results;
    }
}

module.exports = GlobalCacheManager;
