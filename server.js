// Main application server configuration
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const path = require('path');

// Import routes
const driveRoutes = require('./routes/drive');
// Temporarily disabled due to lame package issues
// const broadcastRoutes = require('./routes/broadcast');
const authRoutes = require('./routes/auth');

// Import authentication configuration
require('./config/google-auth');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: parseInt(process.env.SESSION_DURATION) || 86400000
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/drive', driveRoutes);
// Temporarily disabled due to lame package issues
// app.use('/api/broadcast', broadcastRoutes);
app.use('/auth', authRoutes);

// Serve callback.html for the OAuth callback
app.get('/callback.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'callback.html'));
});

// Default route - serve the main application
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'turntables.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Create and start the server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Kirk Radio DJ running at http://localhost:${PORT}`);
});

// WebSocket server
const WebSocketService = require('./services/websocket');
const webSocketService = new WebSocketService(server);

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

