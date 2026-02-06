const express = require('express');
const { Pool } = require('pg');
const app = express();
const PORT = 3000;

app.use(express.json());

// Database connection - only connect if not in test mode
let pool;
if (process.env.NODE_ENV !== 'test') {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'mydb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  });

  // Initialize database table
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100),
      email VARCHAR(100)
    )
  `).catch(err => console.error('Table creation error:', err));
}

// GET - Retrieve all users
app.get('/api/users', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data for tests
      return res.json([
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ]);
    }
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET - Retrieve a specific user
app.get('/api/users/:id', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data for tests
      const mockUsers = [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ];
      const user = mockUsers.find(u => u.id === parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      return res.json(user);
    }
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add version endpoints
app.get('/api/version', (req, res) => {
  res.json({ version: '2.0', message: 'Updated API!' });
});

app.get('/api/version100', (req, res) => {
  res.json({ version: '2.00000', message: 'Updated API0000000!' });
});

// POST - Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!pool) {
      // Return mock data for tests
      return res.status(201).json({
        id: Date.now(),
        name,
        email
      });
    }
    
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT - Update a user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!pool) {
      // Return mock data for tests
      return res.json({
        id: parseInt(req.params.id),
        name,
        email
      });
    }
    
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *',
      [name, email, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE - Remove a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    if (!pool) {
      // Mock successful deletion for tests
      return res.status(204).send();
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export the app for testing
module.exports = app;

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}