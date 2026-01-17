const initServer = require('./server');

const start = async () => {
    try {
        console.log('🚀 Starting Bible Backend API...');
        const server = await initServer();
        
        // Graceful shutdown handlers
        ['SIGINT', 'SIGTERM'].forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n📴 Received ${signal}, shutting down...`);
                await server.stop({ timeout: 10000 });
                console.log('✅ Server stopped gracefully');
                process.exit(0);
            });
        });
        
        console.log(`✅ Server running on ${server.info.uri}`);
        console.log('📝 Environment:', process.env.NODE_ENV || 'development');
        console.log('🔧 Press Ctrl+C to stop\n');
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
start();