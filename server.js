const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Database connection
let pool;
let dbConnected = false;

if (process.env.NODE_ENV !== 'test') {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mydb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  // Test connection and create table
  pool.query('SELECT NOW()')
    .then(() => {
      console.log('✅ Connected to PostgreSQL database');
      dbConnected = true;
      
      // Create table if not exists
      return pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    })
    .then(() => {
      console.log('✅ Table users ready');
    })
    .catch(err => {
      console.error('❌ Database connection error:', err.message);
      console.log('⚠️  Server will run without database (test mode)');
      dbConnected = false;
    });
}

// In-memory storage for test mode
const testUsers = {};
let testIdCounter = 1;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe - vérifie si l'app peut recevoir du trafic
app.get('/ready', (req, res) => {
  if (!dbConnected) {
    return res.status(503).json({ 
      status: 'not ready',
      message: 'Database not connected'
    });
  }
  res.status(200).json({ 
    status: 'ready',
    database: 'connected'
  });
});

// GET - Retrieve all users
app.get('/api/users', async (req, res) => {
  if (!pool || !dbConnected) {
    return res.json(Object.values(testUsers));
  }
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET - Retrieve a specific user
app.get('/api/users/:id', async (req, res) => {
  if (!pool || !dbConnected) {
    const user = testUsers[req.params.id];
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  }
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST - Create a new user
app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!pool || !dbConnected) {
    const id = testIdCounter++;
    const newUser = { id, name, email };
    testUsers[id] = newUser;
    return res.status(201).json(newUser);
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update a user
app.put('/api/users/:id', async (req, res) => {
  const { name, email } = req.body;
  
  if (!pool || !dbConnected) {
    if (!testUsers[req.params.id]) {
      return res.status(404).json({ message: 'User not found' });
    }
    const updatedUser = { id: parseInt(req.params.id), name, email };
    testUsers[req.params.id] = updatedUser;
    return res.json(updatedUser);
  }
  
  try {
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});




app.get('/version', (req, res) => {
  res.json({ version: '2.0.0', message: 'CI/CD works!' });
});


app.get('/version2', (req, res) => {
  res.json({ version: '2.0.000000', message: 'CI/CD works000000!' });
});

app.get('/version3', (req, res) => {
  res.json({ version: '2.555', message: 'CI/CD works00555550!' });
});

app.get('/version4', (req, res) => {
  res.json({ version: '2.5544445', message: 'CI/CD w44orks00555550!' });
});




// DELETE - Remove a user
app.delete('/api/users/:id', async (req, res) => {
  if (!pool || !dbConnected) {
    if (!testUsers[req.params.id]) {
      return res.status(404).json({ message: 'User not found' });
    }
    delete testUsers[req.params.id];
    return res.status(204).send();
  }
  
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}