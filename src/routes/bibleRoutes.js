// src/routes/bibleRoutes.js
const bibleApi = require('../bibleApi');
const redis = require('../config/redis');
const { cachedFetch } = require('../utils');

module.exports = [
  {
    method: 'GET',
    path: '/api/bibles',
    handler: async () => {
      return cachedFetch('bibles', async () => {
        const res = await bibleApi.get('/bibles');
        return res.data;
      });
    }
  },
  {
    method: 'GET',
    path: '/api/bibles/{bibleId}/books',
    handler: async (req) => {
      const { bibleId } = req.params;
      const cacheKey = `books:${bibleId}`;

      return cachedFetch(cacheKey, async () => {
        const res = await bibleApi.get(`/bibles/${bibleId}/books`);
        return res.data;
      });
    }
  },
  {
    method: 'GET',
    path: '/api/bibles/{bibleId}/books/{bookId}/chapters',
    handler: async (req) => {
      const { bibleId, bookId } = req.params;
      const cacheKey = `chapters:${bibleId}:${bookId}`;

      return cachedFetch(cacheKey, async () => {
        const res = await bibleApi.get(`/bibles/${bibleId}/books/${bookId}/chapters`);
        return res.data;
      });
    }
  },
  {
    method: 'GET',
    path: '/api/bibles/{bibleId}/chapters/{chapterId}/verses',
    handler: async (req) => {
      const { bibleId, chapterId } = req.params;
      const cacheKey = `chapter:${bibleId}:${chapterId}`;

      return cachedFetch(cacheKey, async () => {
        const res = await bibleApi.get(`/bibles/${bibleId}/chapters/${chapterId}/verses`);
        console.log('Fetched verses:', res.data);
        return res.data;
      });
    }
  },
  {
    method: 'GET',
    path: '/api/bibles/{bibleId}/verses/{verseId}',
    handler: async (req) => {
      const { bibleId, verseId } = req.params;
      const cacheKey = `verse:${bibleId}:${verseId}`;

      return cachedFetch(cacheKey, async () => {
        const res = await bibleApi.get(`/bibles/${bibleId}/verses/${verseId}`);
        return res.data;
      });
    }
  },
  {
    method: 'GET',
    path: '/api/chapters/{chapterId}',
    handler: async (req) => {
      const { chapterId } = req.params;
      const cacheKey = `chapter:${chapterId}`;

      return cachedFetch(cacheKey, async () => {
        const res = await bibleApi.get(`/chapters/${chapterId}?content-type=text`);
        return res.data;
      });
    }
  },
  // Cache management endpoints
  {
    method: 'POST',
    path: '/api/cache/clear/{pattern}',
    handler: async (req) => {
      const { pattern } = req.params;
      const keys = await redis.keys(pattern || '*');

      if (keys.length > 0) {
        await redis.del(...keys);
      }

      return {
        success: true,
        message: `Cleared ${keys.length} cache entries`,
        pattern
      };
    }
  },
  {
    method: 'GET',
    path: '/api/cache/stats',
    handler: async () => {
      const info = await redis.info();
      const keys = await redis.keys('*');

      return {
        totalKeys: keys.length,
        memoryUsage: info.split('\r\n').find(line => line.startsWith('used_memory_human')),
        uptime: info.split('\r\n').find(line => line.startsWith('uptime_in_seconds')),
        connectedClients: info.split('\r\n').find(line => line.startsWith('connected_clients')),
      };
    }
  }
];