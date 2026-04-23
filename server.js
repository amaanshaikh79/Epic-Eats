const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Load env vars
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? false
            : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
        methods: ['GET', 'POST']
    }
});

// Store io instance on app for use in controllers
app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('📍 Tracking client connected:', socket.id);

    socket.on('join-tracking', (partnerId) => {
        socket.join(`track-${partnerId}`);
        console.log(`📍 Client joined tracking room: track-${partnerId}`);
    });

    socket.on('disconnect', () => {
        console.log('📍 Tracking client disconnected:', socket.id);
    });
});

// Trust first proxy (fixes express-rate-limit X-Forwarded-For warning)
app.set('trust proxy', 1);

// ---------------------
// Security Middleware
// ---------------------
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});
app.use('/api/', limiter);

// ---------------------
// Core Middleware
// ---------------------
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? false
        : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure req.body is always an object to prevent destructuring crashes
app.use((req, res, next) => {
    if (!req.body) req.body = {};
    next();
});

// NoSQL Injection Sanitization (Express 5 compatible — req.query is read-only)
const sanitizeObj = (obj) => {
    if (obj && typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            if (key.startsWith('$') || key.includes('.')) {
                delete obj[key];
            } else if (typeof obj[key] === 'object') {
                sanitizeObj(obj[key]);
            }
        }
    }
};
app.use((req, res, next) => {
    sanitizeObj(req.body);
    sanitizeObj(req.params);
    next();
});

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ---------------------
// API Routes
// ---------------------
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/delivery', deliveryRoutes);

// Base API endpoint
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the Epic Eats API. Please use a specific endpoint.'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Epic Eats API is running!',
        timestamp: new Date().toISOString()
    });
});

// ---------------------
// Production: Serve React Build
// ---------------------
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '..', 'Foodie-Heaven', 'build');
    app.use(express.static(buildPath));

    app.get('*', (req, res) => {
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// ---------------------
// Error Handler (must be last middleware)
// ---------------------
app.use(errorHandler);

// ---------------------
// Database Connection & Server Start
// ---------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');

        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
            console.log(`📍 Socket.IO enabled for live tracking`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

            // Periodic stale partner check (every 60 seconds)
            const { checkStalePartners } = require('./utils/assignmentService');
            setInterval(() => {
                checkStalePartners(io).catch(err =>
                    console.error('Stale partner check error:', err.message)
                );
            }, 60 * 1000);
            console.log('🔄 Stale partner monitor started (60s interval)');
        });
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
};

startServer();
