const { uuidv7 } = require("uuidv7");
const pool = require("../../../config/database");
const jwt = require("jsonwebtoken");
const config = require("../../../config/env");
const server = require("../../../app");
const request = require("supertest");

jest.setTimeout(15000);

//for external api
jest.mock('../../../modules/profile/user-data.service.js', () => ({
    fetchGender: jest.fn(),
    fetchAge: jest.fn(),
    fetchCountryList: jest.fn(),
    findUserByName: jest.fn(),
    edgeCases: jest.fn().mockReturnValue(null),
    getAgeGroup: jest.fn().mockReturnValue('adult'),
}));

const { fetchGender, fetchAge, fetchCountryList, findUserByName } = require("../../../modules/profile/user-data.service");

const token = jwt.sign(
    { id: uuidv7(), username: 'test_user', role: 'admin', is_active: true },
    config.JWT_SECRET,
    { expiresIn: '3m' }
);

const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'X-API-Version': '1'
};

// insert a test profile directly into the DB
const insertTestProfile = async (overrides = {}) => {
    const id = uuidv7();
    const profile = {
        id,
        name: 'testuser',
        gender: 'male',
        gender_probability: 0.99,
        sample_size: 100,
        age: 30,
        age_group: 'adult',
        country_id: 'NG',
        country_probability: 0.85,
        ...overrides
    };

    await pool.query(
        `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [profile.id, profile.name, profile.gender, profile.gender_probability, profile.sample_size, profile.age, profile.age_group, profile.country_id, profile.country_probability]
    );

    return profile;
};

 // clean up test data after each test
afterEach(async () => {
    await pool.query(`DELETE FROM profiles WHERE name IN ('testuser', 'jonathan')`);
    jest.clearAllMocks();
});

// afterAll(async () => {
//     await pool.end();
// });

describe('POST /api/profiles', () => {
    beforeEach(async () => {
        await pool.query(`DELETE FROM profiles WHERE name IN ('testuser', 'jonathan')`);

        findUserByName.mockResolvedValue(null);
        // mock responses for external APIs
        fetchGender.mockResolvedValue({
            data: { gender: 'male', probability: 0.99, count: 100 }
        });
        fetchAge.mockResolvedValue({
            data: { age: 30 }
        });
        fetchCountryList.mockResolvedValue({
            data: { country: [{ country_id: 'NG', probability: 0.85 }] }
        });
    });

    it('should return 401 if no token is provided', async () => {
        const res = await request(server)
            .post('/api/profiles')
            .set('X-API-Version', '1')
            .send({ name: 'jonathan' });

        expect(res.statusCode).toBe(401);
        expect(res.body.status).toBe('error');
    });

    it('should create a new profile and return 201', async () => {
        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: 'jonathan' });

        expect(res.statusCode).toBe(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('jonathan');
        expect(res.body.data).toHaveProperty('gender');
        expect(res.body.data).toHaveProperty('age');
        expect(res.body.data).toHaveProperty('country_id');
        expect(res.body.data).toHaveProperty('created_at');
    });

    it('should return 200 with existing profile if name already exists', async () => {
        const existing = await insertTestProfile({ name: 'jonathan' });
        findUserByName.mockResolvedValue(existing);

        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: 'jonathan' });

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBe('Profile already exists');
        expect(res.body.data.name).toBe('jonathan');
    });

    it('should return 400 if name is missing', async () => {
        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({});

        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('error');
    });

    it('should return 400 if name is empty string', async () => {
        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: '' });

        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('error');
    });

    it('should return 422 if name is not a string', async () => {
        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: 123 });

        expect(res.statusCode).toBe(422);
        expect(res.body.status).toBe('error');
    });

    it('should return 502 if gender API fails', async () => {
        fetchGender.mockResolvedValue({
            statusCode: 502,
            message: 'Gender returned an invalid response'
        });

        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: 'jonathan' });

        expect(res.statusCode).toBe(502);
        expect(res.body.status).toBe('502');
        expect(res.body.message).toBe('Gender returned an invalid response');
    });

    it('should return 502 if agify API fails', async () => {
        fetchAge.mockResolvedValue({
            statusCode: 502,
            message: 'Agify returned an invalid response'
        });

        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: 'jonathan' });

        expect(res.statusCode).toBe(502);
        expect(res.body.status).toBe('502');
        expect(res.body.message).toBe('Agify returned an invalid response');
    });

    it('should return 502 if nationalize API fails', async () => {
        fetchCountryList.mockResolvedValue({
            statusCode: 502,
            message: 'Nationalize returned an invalid response'
        });

        const res = await request(server)
            .post('/api/profiles')
            .set(authHeaders)
            .send({ name: 'jonathan' });

        expect(res.statusCode).toBe(502);
        expect(res.body.status).toBe('502');
        expect(res.body.message).toBe('Nationalize returned an invalid response');
    });
});

describe('GET /api/profiles/:id', () => {
    it('should return a profile by id', async () => {
        const profile = await insertTestProfile();

        const res = await request(server)
            .get(`/api/profiles/${profile.id}`)
            .set(authHeaders);

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data).toHaveProperty('id', profile.id);
        expect(res.body.data).toHaveProperty('name', profile.name);
        expect(res.body.data).toHaveProperty('gender');
        expect(res.body.data).toHaveProperty('age');
        expect(res.body.data).toHaveProperty('country_id');
    });

    it('should return 404 if profile not found', async () => {
        const nonExistentId = uuidv7();

        const res = await request(server)
            .get(`/api/profiles/${nonExistentId}`)
            .set(authHeaders);

        expect(res.statusCode).toBe(404);
        expect(res.body.status).toBe('error');
        expect(res.body.message).toBe('User not found');
    });

    it('should return 401 if no token is provided', async () => {
        const profile = await insertTestProfile();

        const res = await request(server)
            .get(`/api/profiles/${profile.id}`)
            .set('X-API-Version', '1');

        expect(res.statusCode).toBe(401);
        expect(res.body.status).toBe('error');
    });
});

describe('deleteUserData - DELETE /api/profiles/:id', () => {

    it('should delete a profile and return 204', async () => {
        const profile = await insertTestProfile();

        const res = await request(server)
            .delete(`/api/profiles/${profile.id}`)
            .set(authHeaders);

        expect(res.statusCode).toBe(204);

        // verify it's actually deleted from the DB
        const check = await pool.query(`SELECT * FROM profiles WHERE id = $1`, [profile.id]);
        expect(check.rows.length).toBe(0);
    });

    it('should return 404 if profile to delete does not exist', async () => {
        const nonExistentId = uuidv7();

        const res = await request(server)
            .delete(`/api/profiles/${nonExistentId}`)
            .set(authHeaders);

        expect(res.statusCode).toBe(404);
        expect(res.body.status).toBe('error');
        expect(res.body.message).toBe('User not found');
    });

    it('should return 401 if no token is provided', async () => {
        const profile = await insertTestProfile();

        const res = await request(server)
            .delete(`/api/profiles/${profile.id}`)
            .set('X-API-Version', '1');

        expect(res.statusCode).toBe(401);
        expect(res.body.status).toBe('error');
    });
});