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

    it('should reject invalid query parameters', async () => {
        const res = await request(server).get('/api/profiles?page=one&gender=sheorhe')
            .set('Authorization', `Bearer ${token}`)
            .set('X-API-Version', '1');

        expect(res.statusCode).toEqual(400);
        expect(res.body.status).toEqual('error');
        expect(res.body).toHaveProperty('message');
    });

    it('should filter profiles based on query parameters', async () => {
        const res = await request(server).get('/api/profiles?gender=female&country_id=US&age_group=adult&min_age=20&max_age=59&min_gender_probability=0.8&min_country_probability=0.5')
            .set('Authorization', `Bearer ${token}`)
            .set('X-API-Version', '1');

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('success');
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page');
        expect(res.body).toHaveProperty('limit');

        for (const profile of res.body.data) {
            expect(profile.gender).toBe('female');
            expect(profile.country_id).toBe('US');
            expect(profile.age).toBeGreaterThanOrEqual(20);
            expect(profile.age).toBeLessThanOrEqual(59);
            expect(profile.age_group).toBe('adult');
            expect(profile.gender_probability).toBeGreaterThanOrEqual(0.8);
            expect(profile.country_probability).toBeGreaterThanOrEqual(0.5);
        }
    });

    it('should cap limit to 50', async () => {
        const res = await request(server).get('/api/profiles?limit=100')
            .set('Authorization', `Bearer ${token}`)
            .set('X-API-Version', '1');

        expect(res.statusCode).toEqual(200);
        expect(res.body.limit).toBe(50);
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

describe('GET /api/profiles/search', () => {
    it('should return results for a valid query', async () => {
        const res = await request(app).get('/api/profiles/search?q=males from nigeria');
        expect([200, 404]).toContain(res.statusCode);
    });

    it('should return 400 for missing q', async () => {
        const res = await request(app).get('/api/profiles/search');
        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('error');
    });

    it('should return 422 for uninterpretable query', async () => {
        const res = await request(app).get('/api/profiles/search?q=xyzabc123gibberish');
        expect(res.statusCode).toBe(422);
        expect(res.body.message).toBe('Unable to interpret query');
    });
});