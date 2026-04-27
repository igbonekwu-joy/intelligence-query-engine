const request = require('supertest');
const server = require('../app');
const config = require('../config');
const jwt = require('jsonwebtoken');

describe('Authentication Middleware', () => {
    it('should return 401 if no token is provided', async () => {
        const res = await request(server).get('/api/profiles');
        expect(res.statusCode).toEqual(401);
        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Access token is required');
    });

    it('should return 401 if token is expired', async () => {
        const token = jwt.sign(
           { id: 'user_test_id', username: 'test_user', role: 'analyst', is_active: true },
           config.JWT_SECRET,
           { expiresIn: '0s' }
        );
        const res = await request(server).get('/api/profiles')
            .set('Authorization', `Bearer ${token}`)
            .set('X-API-Version', '1');
        expect(res.statusCode).toEqual(401);
        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('Access token has expired');
    });

    it('should return 400 if API version header is missing', async () => {
        const res = await request(server).get('/api/profiles')
            .set('Authorization', 'Bearer access_token');
        expect(res.statusCode).toEqual(400);
        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('API version header required');
    });

    it('should return 403 if user account is not active', async () => {
        const token = jwt.sign(
           { id: 'user_test_id', username: 'test_user', role: 'analyst', is_active: false },
           config.JWT_SECRET,
           { expiresIn: '3m' }
        );

        const res = await request(server).get('/api/profiles')
            .set('Authorization', `Bearer ${token}`)
            .set('X-API-Version', '1');
        expect(res.statusCode).toEqual(403);
        expect(res.body.status).toEqual('error');
        expect(res.body.message).toEqual('User account is not active');
    });
});