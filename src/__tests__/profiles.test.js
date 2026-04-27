const request = require('supertest');
const server = require('../app');
const config = require('../config');

let token;

describe('GET /api/profiles', () => {
    beforeEach(() => {
        const jwt = require('jsonwebtoken');
        token = jwt.sign(
            { id: 'user_test_id', username: 'test_user', role: 'analyst', is_active: true },
            config.JWT_SECRET,
            { expiresIn: '3m' }
        );
    });

    it('should return 200 with a success status', async () => {
        const res = await request(server).get('/api/profiles')
            .set('Authorization', `Bearer ${token}`)
            .set('X-API-Version', '1');
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('success');
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('limit');
    });
});