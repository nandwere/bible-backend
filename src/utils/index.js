const redis = require('../config/redis');

// Cache duration in seconds (5 minutes)
const CACHE_DURATION = 600;

// Helper function for Redis caching
const cachedFetch = async (cacheKey, fetchFn) => {
    try {
        // Try to get from cache first
        const cached = await redis.get(cacheKey);
        if (cached) {
            console.log(`Cache hit for key: ${cacheKey}`);
            return JSON.parse(cached);
        }

        console.log(`Cache miss for key: ${cacheKey}, fetching from API`);
        const data = await fetchFn();

        // Store in Redis with expiration
        await redis.setex(cacheKey, CACHE_DURATION, JSON.stringify(data));

        return data;
    } catch (error) {
        console.error('Redis error:', error);
        // Fallback to direct API call if Redis fails
        return fetchFn();
    }
};

module.exports = { cachedFetch };