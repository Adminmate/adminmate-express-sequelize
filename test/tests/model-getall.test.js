const httpMocks = require('node-mocks-http');
const { getAll } = require('../../src/controllers/model-getall');

const makeUsersReq = data => {
  return httpMocks.createRequest({
    method: 'POST',
    params: {
      model: 'users'
    },
    body: data
  });
};

const makeCarsReq = data => {
  return httpMocks.createRequest({
    method: 'POST',
    params: {
      model: 'cars'
    },
    body: data
  });
};

describe('Users request', () => {
  it('- No parameter', async () => {
    const request = makeUsersReq({});

    const response = httpMocks.createResponse();
    await getAll(request, response, (err) => expect(err).toBeFalsy());

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    expect(responseData).toMatchSpecificSnapshot('./__snapshots__/model-getall.shot');
  });
});

describe('Cars request', () => {
  it('- No parameter', async () => {
    const request = makeCarsReq({});

    const response = httpMocks.createResponse();
    await getAll(request, response, (err) => expect(err).toBeFalsy());

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    expect(responseData).toMatchSpecificSnapshot('./__snapshots__/model-getall.shot');
  });

  it('- With refFields params', async () => {
    const request = makeCarsReq({
      refFields: {
        users: 'firstname lastname'
      }
    });

    const response = httpMocks.createResponse();
    await getAll(request, response, (err) => expect(err).toBeFalsy());

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    expect(responseData).toMatchSpecificSnapshot('./__snapshots__/model-getall.shot');
  });
});