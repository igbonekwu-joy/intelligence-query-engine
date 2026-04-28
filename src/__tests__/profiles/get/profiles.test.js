const request = require('supertest');
const server = require('../../../app');
const config = require('../../../config/env');
const { uuidv7 } = require('uuidv7');
const pool = require('../../../config/database');

let token;
let authHeaders;

jest.setTimeout(15000);

beforeEach(async () => {
    const jwt = require('jsonwebtoken');
    token = jwt.sign(
        { id: uuidv7(), username: 'test_user', role: 'analyst', is_active: true },
        config.JWT_SECRET,
        { expiresIn: '3m' }
    );

    authHeaders = {
        'Authorization': `Bearer ${token}`,
        'X-API-Version': '1'
    };
});

// afterAll(async () => {
//     await pool.end(); // close DB connection after all tests
// });

describe('Profiles API', () => {
    describe('GET /api/profiles', () => {
        let testProfileId;

        beforeAll(async () => {
            const id = uuidv7();
            testProfileId = id;
            await pool.query(
                `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (name) DO NOTHING`,
                [id, `filter_test_${Date.now()}`, 'female', 0.95, 100, 25, 'adult', 'US', 0.90]
            );
        });

        afterAll(async () => {
            await pool.query(`DELETE FROM profiles WHERE id = $1`, [testProfileId]);
        });

        it('should reject invalid query parameters', async () => {
            const res = await request(server).get('/api/profiles?page=one&gender=sheorhe')
                .set(authHeaders);

            expect(res.statusCode).toEqual(400);
            expect(res.body.status).toEqual('error');
            expect(res.body).toHaveProperty('message');
        });

        it('should filter profiles based on query parameters', async () => {
            const res = await request(server).get('/api/profiles?gender=female&country_id=US&age_group=adult&min_age=20&max_age=59&min_gender_probability=0.8&min_country_probability=0.5')
                .set(authHeaders);

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
                .set(authHeaders);

            expect(res.statusCode).toEqual(200);
            expect(res.body.limit).toBe(50);
        });

        it('should return 200 with a success status', async () => {
            const res = await request(server).get('/api/profiles')
                .set(authHeaders);

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
            const res = await request(server).get('/api/profiles/search?q=males from nigeria')
                .set(authHeaders);

            expect([200, 404]).toContain(res.statusCode);

            if(res.statusCode === 200) {
                expect(res.body.status).toBe('success');
                expect(res.body).toHaveProperty('data');

                for (const profile of res.body.data) {
                    expect(profile.gender).toBe('male');
                    expect(profile.country_id).toBe('NG');
                }
            }
        });

        it('should return 400 for missing q', async () => {
            const res = await request(server).get('/api/profiles/search')
                .set(authHeaders);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe('error');
        });

        it('should return 422 for uninterpretable query', async () => {
            const res = await request(server).get('/api/profiles/search?q=shemales from mars')
                .set(authHeaders);

            expect(res.statusCode).toBe(422);
            expect(res.body).toHaveProperty('message');
        });
    });

    describe('GET /api/profiles/export', () => {
        let exportTestProfileId; // 👈 separate variable for export test

        beforeAll(async () => {
            const id = uuidv7();
            exportTestProfileId = id;
            await pool.query(
                `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (name) DO NOTHING`,
                [id, `export_test_${Date.now()}`, 'male', 0.99, 100, 25, 'adult', 'NG', 0.85]
            );
        });

        afterAll(async () => {
            await pool.query(`DELETE FROM profiles WHERE id = $1`, [exportTestProfileId]);
        });

        it('should return a CSV file', async () => {
            const res = await request(server).get('/api/profiles/export?format=csv')
                .set(authHeaders);

            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toMatch(/text\/csv/); 
            expect(res.headers['content-disposition']).toMatch(/attachment; filename="profiles_/);
        });

        it('should return 400 for missing format', async () => {
            const res = await request(server).get('/api/profiles/export')
                .set(authHeaders);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe('error');
            expect(res.body).toHaveProperty('message');
        });

        it('should return 400 for unsupported format', async () => {
            const res = await request(server).get('/api/profiles/export?format=json')
                .set(authHeaders);

            expect(res.statusCode).toBe(400);
            expect(res.body.status).toBe('error');
            expect(res.body).toHaveProperty('message');
        });
    });
});