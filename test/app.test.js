// see https://stackoverflow.com/questions/46227783/encoding-not-recognized-in-jest-js
require('mysql2/node_modules/iconv-lite').encodingExists('foo');

const supertest = require('supertest');
const jwt = require('jwt-simple');

// Include the app
const app = require('./app.js');

// Endpoint prefix
const prefix = '/adminmate/api';

// Generate the admin token
const adminToken = jwt.encode({
  exp_date: Date.now() + 1000
}, 'authkey_secret');

// expect(response.body.status).toBe('success');
// expect(response).toMatchSnapshot();
//  expect.objectContaining({
//   x: expect.any(Number),
//   y: expect.any(Number),
// })

// check_connection
describe('Testing POST /api/check_connection', () => {
  it('should return a 403 http response', async () => {
    // Add a little delay
    await new Promise((r) => setTimeout(r, 5000));

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

  it('should return a 200 http response', async () => {
    // Make request
    const response = await supertest(app)
      .get(prefix + '/models')
      .set('x-access-token', adminToken);

    // Check response
    expect(response.status).toBe(200);
    expect(response.body.models).toMatchSnapshot();
  });
});