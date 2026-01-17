const Bookmark = require('../models/Bookmark');
const redis = require('../config/redis');
const { cachedFetch } = require('../utils');

module.exports = [
    // 1. CREATE: Save a new bookmark (any type)
    {
        method: 'POST',
        path: '/api/bookmarks',
        handler: async (request, h) => {
            try {
               let
                    userId, type, title, description,
                    bibleId, bibleName, bookId, bookName,
                    chapterId, chapterNumber, verseId,
                    verseNumber, verseText, reference, note;
                    if (typeof request.payload === 'string') {
                    // Payload is a string, parse it
                    try {
                        const parsed = JSON.parse(request.payload);
                        userId = parsed.userId;
                        type = parsed.type;
                        title = parsed.title;
                        description = parsed.description;
                        bibleId = parsed.bibleId;
                        bibleName = parsed.bibleName;
                        bookId = parsed.bookId;
                        bookName = parsed.bookName;
                        chapterId = parsed.chapterId;
                        chapterNumber = parsed.chapterNumber;
                        verseId = parsed.verseId;
                        verseNumber = parsed.verseNumber;
                        verseText = parsed.verseText;
                        reference = parsed.reference;
                        note = parsed.note;

                    } catch (parseError) {
                        console.error('Failed to parse payload as JSON:', parseError);
                        return h.response({
                            success: false,
                            message: 'Invalid JSON payload'
                        }).code(400);
                    }
                } else if (typeof request.payload === 'object') {
                    // Payload is already an object
                    userId = request.payload.userId;
                    type = request.payload.type;
                    title = request.payload.title;
                    description = request.payload.description;
                    bibleId = request.payload.bibleId;
                    bibleName = request.payload.bibleName;
                    bookId = request.payload.bookId;
                    bookName = request.payload.bookName;
                    chapterId = request.payload.chapterId;
                    chapterNumber = request.payload.chapterNumber;
                    verseId = request.payload.verseId;
                    verseNumber = request.payload.verseNumber;
                    verseText = request.payload.verseText;
                    reference = request.payload.reference;
                    note = request.payload.note;
                } else {
                    return h.response({
                        success: false,
                        message: 'Invalid payload format'
                    }).code(400);
                }

                console.log('Bookmark payload received:', request.payload);
                console.log(userId, type, bibleId, chapterId, verseId, reference);
                // Validate required fields based on type
                if (!userId || !type || !bibleId || !reference) {
                    return h.response({
                        success: false,
                        message: 'Missing required fields'
                    }).code(400);
                }

                // Check if already bookmarked (unique constraint)
                let existingQuery;
                switch (type) {
                    case 'bible':
                        existingQuery = { userId, type, bibleId };
                        break;
                    case 'chapter':
                        existingQuery = { userId, type, chapterId };
                        break;
                    case 'verse':
                        existingQuery = { userId, type, verseId };
                        break;
                    default:
                        return h.response({
                            success: false,
                            message: 'Invalid bookmark type'
                        }).code(400);
                }

                const existing = await Bookmark.findOne(existingQuery);
                if (existing) {
                    return h.response({
                        success: false,
                        message: 'Already bookmarked',
                        data: existing
                    }).code(400);
                }

                // Create new bookmark
                const bookmark = new Bookmark({
                    userId,
                    type,
                    title: title || reference,
                    description: description || `Bookmarked ${type}: ${reference}`,
                    bibleId,
                    bibleName: bibleName || '',
                    bookId: bookId || '',
                    bookName: bookName || '',
                    chapterId: chapterId || '',
                    chapterNumber: chapterNumber || 0,
                    verseId: verseId || '',
                    verseNumber: verseNumber || 0,
                    verseText: verseText || '',
                    reference,
                    note: note || ''
                });

                await bookmark.save();

                return h.response({
                    success: true,
                    message: 'Bookmark saved successfully',
                    data: bookmark
                }).code(201);
            } catch (error) {
                console.error('Error saving bookmark:', error);
                return h.response({
                    success: false,
                    message: 'Failed to save bookmark',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 2. CHECK: Check if something is bookmarked
    {
        method: 'POST',
        path: '/api/bookmarks/check',
        handler: async (request, h) => {
            try {

                let userId, items;

                if (typeof request.payload === 'string') {
                    // Payload is a string, parse it
                    try {
                        const parsed = JSON.parse(request.payload);
                        userId = parsed.userId;
                        items = parsed.items;
                    } catch (parseError) {
                        console.error('Failed to parse payload as JSON:', parseError);
                        return h.response({
                            success: false,
                            message: 'Invalid JSON payload'
                        }).code(400);
                    }
                } else if (typeof request.payload === 'object') {
                    // Payload is already an object
                    userId = request.payload.userId;
                    items = request.payload.items;
                } else {
                    return h.response({
                        success: false,
                        message: 'Invalid payload format'
                    }).code(400);
                }

                console.log('Extracted values:', { userId, items });

                if (!userId || !items || !Array.isArray(items)) {
                    return h.response({
                        success: false,
                        message: 'Missing required parameters'
                    }).code(400);
                }

                // Build queries for all items
                const queries = items.map(item => {
                    let query;
                    switch (item.type) {
                        case 'bible':
                            query = { userId, type: 'bible', bibleId: item.targetId };
                            break;
                        case 'chapter':
                            query = { userId, type: 'chapter', chapterId: item.targetId };
                            break;
                        case 'verse':
                            query = { userId, type: 'verse', verseId: item.targetId };
                            break;
                        default:
                            return null;
                    }
                    return query;
                }).filter(q => q !== null);

                // Execute all queries in parallel
                const results = await Promise.all(
                    queries.map(query => Bookmark.findOne(query))
                );

                // Create response map
                const statusMap = {};
                items.forEach((item, index) => {
                    statusMap[item.targetId] = !!results[index];
                });

                return {
                    success: true,
                    data: statusMap
                };
            } catch (error) {
                console.error('Error checking bookmark status:', error);
                return h.response({
                    success: false,
                    message: 'Failed to check bookmark status',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 3. GET: Get user's bookmarks with filters
    {
        method: 'GET',
        path: '/api/bookmarks/user/{userId}',
        handler: async (request, h) => {
            const { userId } = request.params;
            const {
                type,
                limit = 50,
                page = 1,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = request.query;

            try {
                if (!userId) {
                    return h.response({
                        success: false,
                        message: 'User ID is required'
                    }).code(400);
                }

                // Build query
                const query = { userId };
                if (type && ['bible', 'chapter', 'verse'].includes(type)) {
                    query.type = type;
                }

                // Calculate pagination
                const skip = (page - 1) * limit;
                const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

                // Execute query
                const bookmarks = await Bookmark.find(query)
                    .sort(sort)
                    .skip(parseInt(skip))
                    .limit(parseInt(limit));

                const total = await Bookmark.countDocuments(query);

                return {
                    success: true,
                    data: bookmarks,
                    meta: {
                        total,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(total / limit),
                        hasMore: (page * limit) < total
                    }
                };
            } catch (error) {
                console.error('Error fetching bookmarks:', error);
                return h.response({
                    success: false,
                    message: 'Failed to fetch bookmarks',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 4. GET: Get bookmark by ID
    {
        method: 'GET',
        path: '/api/bookmarks/{bookmarkId}',
        handler: async (request, h) => {
            const { bookmarkId } = request.params;

            try {
                const bookmark = await Bookmark.findById(bookmarkId);

                if (!bookmark) {
                    return h.response({
                        success: false,
                        message: 'Bookmark not found'
                    }).code(404);
                }

                return {
                    success: true,
                    data: bookmark
                };
            } catch (error) {
                console.error('Error fetching bookmark:', error);
                return h.response({
                    success: false,
                    message: 'Failed to fetch bookmark',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 5. UPDATE: Update bookmark (mainly for notes)
    {
        method: 'PUT',
        path: '/api/bookmarks/{bookmarkId}',
        handler: async (request, h) => {
            const { bookmarkId } = request.params;
            const { note, tags, title } = request.payload;
            const { userId } = request.query; // User ID from query for security

            try {
                if (!userId) {
                    return h.response({
                        success: false,
                        message: 'User ID is required'
                    }).code(400);
                }

                const bookmark = await Bookmark.findOne({
                    _id: bookmarkId,
                    userId
                });

                if (!bookmark) {
                    return h.response({
                        success: false,
                        message: 'Bookmark not found or unauthorized'
                    }).code(404);
                }

                // Update allowed fields
                const updates = {};
                if (note !== undefined) updates.note = note;
                if (tags !== undefined) updates.tags = tags;
                if (title !== undefined) updates.title = title;

                const updatedBookmark = await Bookmark.findByIdAndUpdate(
                    bookmarkId,
                    { $set: updates },
                    { new: true, runValidators: true }
                );

                return {
                    success: true,
                    message: 'Bookmark updated',
                    data: updatedBookmark
                };
            } catch (error) {
                console.error('Error updating bookmark:', error);
                return h.response({
                    success: false,
                    message: 'Failed to update bookmark',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 6. DELETE: Remove a bookmark
    {
        method: 'DELETE',
        path: '/api/bookmarks/{bookmarkId}',
        handler: async (request, h) => {
            const { bookmarkId } = request.params;
            const { userId } = request.query;

            try {
                if (!userId) {
                    return h.response({
                        success: false,
                        message: 'User ID is required'
                    }).code(400);
                }

                const bookmark = await Bookmark.findOneAndDelete({
                    _id: bookmarkId,
                    userId
                });

                if (!bookmark) {
                    return h.response({
                        success: false,
                        message: 'Bookmark not found or unauthorized'
                    }).code(404);
                }

                return {
                    success: true,
                    message: 'Bookmark deleted successfully'
                };
            } catch (error) {
                console.error('Error deleting bookmark:', error);
                return h.response({
                    success: false,
                    message: 'Failed to delete bookmark',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 7. GET: Get bookmark counts by type
    {
        method: 'GET',
        path: '/api/bookmarks/stats/{userId}',
        handler: async (request, h) => {
            const { userId } = request.params;

            try {
                if (!userId) {
                    return h.response({
                        success: false,
                        message: 'User ID is required'
                    }).code(400);
                }

                // Get counts by type
                const [bibles, chapters, verses, total] = await Promise.all([
                    Bookmark.countDocuments({ userId, type: 'bible' }),
                    Bookmark.countDocuments({ userId, type: 'chapter' }),
                    Bookmark.countDocuments({ userId, type: 'verse' }),
                    Bookmark.countDocuments({ userId })
                ]);

                // Get recent bookmarks
                const recent = await Bookmark.find({ userId })
                    .sort({ createdAt: -1 })
                    .limit(5);

                return {
                    success: true,
                    data: {
                        counts: {
                            bibles,
                            chapters,
                            verses,
                            total
                        },
                        recent,
                        lastUpdated: recent.length > 0 ? recent[0].createdAt : null
                    }
                };
            } catch (error) {
                console.error('Error fetching bookmark stats:', error);
                return h.response({
                    success: false,
                    message: 'Failed to fetch bookmark statistics',
                    error: error.message
                }).code(500);
            }
        }
    },

    // 8. GET: Search bookmarks
    {
        method: 'GET',
        path: '/api/bookmarks/search/{userId}',
        handler: async (request, h) => {
            const { userId } = request.params;
            const { q, type, limit = 20 } = request.query;

            try {
                if (!userId || !q) {
                    return h.response({
                        success: false,
                        message: 'User ID and search query are required'
                    }).code(400);
                }

                // Build search query
                const query = {
                    userId,
                    $or: [
                        { title: { $regex: q, $options: 'i' } },
                        { reference: { $regex: q, $options: 'i' } },
                        { note: { $regex: q, $options: 'i' } },
                        { verseText: { $regex: q, $options: 'i' } }
                    ]
                };

                if (type && ['bible', 'chapter', 'verse'].includes(type)) {
                    query.type = type;
                }

                const results = await Bookmark.find(query)
                    .sort({ createdAt: -1 })
                    .limit(parseInt(limit));

                return {
                    success: true,
                    data: results,
                    meta: {
                        count: results.length,
                        query: q
                    }
                };
            } catch (error) {
                console.error('Error searching bookmarks:', error);
                return h.response({
                    success: false,
                    message: 'Failed to search bookmarks',
                    error: error.message
                }).code(500);
            }
        }
    }
];