const request = require("supertest");
const app = require("../app");

describe('Auth endpoints', () => {
    it('GET /auth/github should redirect to github', async () => {
        const res = await request(app).get('/auth/github');
        expect(res.statusCode).toBe(302); 
        expect(res.headers.location).toContain('github.com');
    });

    it('POST /auth/refresh should return 401 without token', async () => {
        const res = await request(app).post('/auth/refresh').send({});
        expect(res.statusCode).toBe(401);
        expect(res.body.status).toBe('error');
    });

    it('POST /auth/logout should return 400 without token', async () => {
        const res = await request(app).post('/auth/logout').send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.status).toBe('error');
    });
});