const request = require('supertest');
const app = require('../server');

// Configuration pour éviter les timeouts avec la DB
jest.setTimeout(10000);

describe('🧪 REST API Tests - CI/CD Demo', () => {
  
  // Test de base : l'app démarre
  describe('📡 Server Health', () => {
    it('should respond to health check', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status');
    });

    it('should respond to ready check', async () => {
      const res = await request(app).get('/ready');
      expect([200, 503]).toContain(res.statusCode); // 503 si DB pas connectée en test
      expect(res.body).toHaveProperty('status');
    });
  });

  // Test des endpoints principaux (structure)
  describe('🔌 API Endpoints Structure', () => {
    it('GET /api/users should return array', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBeTruthy();
    });

    it('POST /api/users should require name and email', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('POST /api/users should create user with valid data', async () => {
      const newUser = {
        name: 'CI Test User',
        email: `ci-test-${Date.now()}@example.com`
      };
      const res = await request(app)
        .post('/api/users')
        .send(newUser);
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(newUser.name);
    });

    it('GET /api/users/:id should return 404 for non-existent user', async () => {
      const res = await request(app).get('/api/users/99999');
      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('message');
    });
  });

  // Test de la logique métier
  describe('📋 Business Logic', () => {
    it('should validate email format in request', async () => {
      const invalidUser = {
        name: 'Test',
        email: '' // Email vide
      };
      const res = await request(app)
        .post('/api/users')
        .send(invalidUser);
      expect(res.statusCode).toBe(400);
    });

    it('PUT /api/users/:id should update existing user', async () => {
      // Créer un user d'abord
      const createRes = await request(app)
        .post('/api/users')
        .send({
          name: 'Original Name',
          email: `update-test-${Date.now()}@example.com`
        });
      
      const userId = createRes.body.id;
      
      // Mettre à jour
      const updateRes = await request(app)
        .put(`/api/users/${userId}`)
        .send({
          name: 'Updated Name',
          email: `updated-${Date.now()}@example.com`
        });
      
      expect(updateRes.statusCode).toBe(200);
      expect(updateRes.body.name).toBe('Updated Name');
    });

    it('DELETE /api/users/:id should delete user', async () => {
      // Créer un user
      const createRes = await request(app)
        .post('/api/users')
        .send({
          name: 'To Delete',
          email: `delete-test-${Date.now()}@example.com`
        });
      
      const userId = createRes.body.id;
      
      // Supprimer
      const deleteRes = await request(app).delete(`/api/users/${userId}`);
      expect(deleteRes.statusCode).toBe(204);
      
      // Vérifier que le user n'existe plus
      const getRes = await request(app).get(`/api/users/${userId}`);
      expect(getRes.statusCode).toBe(404);
    });
  });
});
