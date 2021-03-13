const supertest = require('supertest');

// Include the app
const app = require('./app.js');

// Endpoint prefix
const prefix = '/adminmate/api';

// expect(response.body.status).toBe('success');
// expect(response).toMatchSnapshot();
//  expect.objectContaining({
//   x: expect.any(Number),
//   y: expect.any(Number),
// })

// check_connection
describe('Testing POST /api/check_connection', () => {
  it('should return a 403 http response', async () => {
    // Make request
    const response = await supertest(app)
      .post(prefix + '/check_connection')
      .send({
        // data: ''
      });

    // Check response
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Invalid request');
  });
});

// login
describe('Testing POST /api/login', () => {
  it('should return a 403 http response', async () => {
    // Make request
    const response = await supertest(app)
      .post(prefix + '/login')
      .send({
        // data: ''
      });

    // Check response
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Invalid request');
  });
});

// Models
describe('Testing GET /api/models', () => {
  it('should return a 403 http response', async () => {
    // Make request
    const response = await supertest(app)
      .get(prefix + '/models');

    // Check response
    expect(response.status).toBe(403);
    expect(response.body.code).toBe('not_authorized');
  });
});