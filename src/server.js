require('dotenv').config();
const Hapi = require('@hapi/hapi');
const mongoose = require('mongoose');
const bibleRoutes = require('./routes/bibleRoutes');
const moodRoutes = require('./routes/moods');
const bookmarkRoutes = require('./routes/bookmark');

const logger = require('./config/logger'); // Your Winston logger

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 3001,
        host: '0.0.0.0',
        routes: {
            cors: { origin: ['*'] },
        }
    });

    // Connect to MongoDB
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Database connected successfully');
    } catch (error) {
        console.error('❌ Database connection error:', error);
        process.exit(1);
    }

    // Global error handler
    server.ext('onPreResponse', (request, h) => {
        const response = request.response;

        if (response.isBoom) {
            // Log errors with Winston
            logger.error({
                message: response.message,
                stack: response.stack,
                statusCode: response.output.statusCode,
                path: request.path,
                method: request.method,
                params: request.params,
                query: request.query,
                payload: request.payload,
                userAgent: request.headers['user-agent'],
                ip: request.info.remoteAddress
            });
        }

        return h.continue;
    });

    // Log server events
    server.events.on('log', (event, tags) => {
        if (tags.error) {
            logger.error('Server error', {
                error: event.error,
                tags: Object.keys(tags)
            });
        } else {
            logger.info('Server event', {
                data: event.data,
                tags: Object.keys(tags)
            });
        }
    });

    // Route logging middleware
    server.ext('onPostAuth', (request, h) => {
        logger.info('Request received', {
            method: request.method,
            path: request.path,
            query: request.query,
            params: request.params,
            auth: request.auth,
            userAgent: request.headers['user-agent'],
            ip: request.info.remoteAddress
        });
        return h.continue;
    });

    server.route(bibleRoutes);
    server.route(moodRoutes);
    server.route(bookmarkRoutes);

    await server.start();

    logger.info(`🚀 Server running on ${server.info.uri}`, {
        port: server.info.port,
        host: server.info.host,
        protocol: server.info.protocol,
        uri: server.info.uri,
        environment: process.env.NODE_ENV || 'development'
    });

    return server;
};

// Handle uncaught exceptions
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection', {
        error: err.message,
        stack: err.stack
    });
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
        error: err.message,
        stack: err.stack
    });
    process.exit(1);
});

module.exports = init;