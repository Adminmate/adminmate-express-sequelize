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
describe('Testing POST /api/check_connection endpoint', () => {
  it('should return a 403 http response', async () => {
    // Make POST Request
    const response = await supertest(app)
      .post(prefix + '/check_connection')
      .send({
        // title: 'How to write a shot'
      });

    // Check response
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Invalid request');
  });
});

// login
describe('Testing POST /api/login endpoint', () => {
  it('should return a 403 http response', async () => {
    // Make POST Request
    const response = await supertest(app)
      .post(prefix + '/login')
      .send({
        title: 'How to write a shot',
        body: "Access the Edpresso tutorial"
      });

    // Compare response with expectations
    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Invalid request');
  });
});