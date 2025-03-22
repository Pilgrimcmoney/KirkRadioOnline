const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Serve callback.html for the OAuth callback
app.get('/callback.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'callback.html'));
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'turntables.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Kirk Radio DJ running at http://localhost:${port}`);
});

