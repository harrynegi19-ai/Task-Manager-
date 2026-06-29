const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'super_secret_token_key_123'; // Used to sign authentication passes

// Allow both your specific custom production domain AND Vercel automatic preview URLs
const allowedOrigins = [
    'https://task-manager-lovat-eight-15.vercel.app',
    'https://task-manager-82vr39wyk-harrynegi19-ais-projects.vercel.app'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server or tools like Postman (no origin)
        if (!origin) return callback(null, true);
        
        // Dynamically approve your exact domain or any Vercel deployment URL
        if (origin.endsWith('.vercel.app') || origin === 'https://task-manager-lovat-eight-15.vercel.app') {
            return callback(null, true);
        } else {
            return callback(new Error('Blocked by CORS policy configuration'));
        }
    },
    credentials: true
}));
app.use(express.json());

// 1. MYSQL DATABASE CONNECTION POOL
require('dotenv').config(); // Loads variables from a local .env file

// UPDATE YOUR DATABASE CONNECTION POOL CONFIG:
const db = mysql.createPool({
    host: process.env.TIDB_HOST || 'localhost',
    port: process.env.TIDB_PORT || 4000,
    user: process.env.TIDB_USER || 'root',
    password: process.env.TIDB_PASSWORD || '',
    database: process.env.TIDB_DATABASE || 'task_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true // Node.js handles built-in certificates automatically for TiDB Cloud
    }
}).promise();

// Validate Connection Status
db.getConnection()
    .then(() => console.log(" Connected securely to MySQL relational database."))
    .catch(err => console.error("MySQL connection failure:", err));

// 2. SECURITY MIDDLEWARE (Validates the user token on every request)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Access denied. Log in first." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Session expired. Log in again." });
        req.user = user;
        next();
    });
};

// 3. AUTHENTICATION ENDPOINTS
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: "Registration successful!" });
    } catch (err) {
        res.status(400).json({ error: "Username is already registered." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(400).json({ error: "Invalid credentials" });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Server login error" });
    }
});

// 4. SECURE CRUD TASK ENDPOINTS
app.get('/api/tasks', authenticateToken, async (req, res) => {
    const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ?', [req.user.userId]);
    res.json(tasks);
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    const { title } = req.body;
    const [result] = await db.query('INSERT INTO tasks (user_id, title) VALUES (?, ?)', [req.user.userId, title]);
    res.status(201).json({ id: result.insertId, title, completed: false });
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    const { completed } = req.body;
    await db.query('UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?', [completed, req.params.id, req.user.userId]);
    res.json({ message: "Task updated status successfully" });
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.userId]);
    res.json({ message: "Task wiped successfully" });
});

app.listen(PORT, () => console.log(`🚀 SQL Production Server running on http://localhost:${PORT}`));