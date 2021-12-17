const httpMocks = require('node-mocks-http');
const { getAll } = require('../../../src/controllers/model-getall');

const makeReq = async (model, method, data, headers = {}) => {
  const request = httpMocks.createRequest({
    method,
    params: {
      model
    },
    headers,
    query: data,
    body: data
  });

  const response = httpMocks.createResponse();
  await getAll(request, response, (err) => expect(err).toBeFalsy());
  const responseData = response._getJSONData();

  // Response status 200
  expect(response.statusCode).toBe(200);

  return { response, responseData };
};

// Simple -------------------------------------------------------------------------------

it('Users simple request', async () => {
  const { responseData } = await makeReq('users', 'GET', {});
  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

// refFields ----------------------------------------------------------------------------

it('Cars with refFields params', async () => {
  const { responseData } = await makeReq('cars', 'GET', {}, {
    'am-ref-fields': {
      users: 'firstname lastname'
    }
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

// fields -------------------------------------------------------------------------------

it('Cars with "fields" parameter (name & manufacturer only)', async () => {
  const { responseData } = await makeReq('cars', 'GET', {}, {
    'am-model-fields': ['name', 'manufacturer']
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

// page ---------------------------------------------------------------------------------

it('Cars with "page" parameter set to 2', async () => {
  const { responseData } = await makeReq('cars', 'GET', {
    page: 2
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

it('Cars with a "search" parameter', async () => {
  const { responseData } = await makeReq('cars', 'GET', {
    search: 'Porsche 91'
  }, {
    'am-model-fields': ['name']
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

// order --------------------------------------------------------------------------------

it('Cars with a "order" parameter', async () => {
  const { responseData } = await makeReq('cars', 'GET', {
    search: 'Porsche 91',
    order: [['name', 'ASC']]
  }, {
    'am-model-fields': ['name']
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

// filters ------------------------------------------------------------------------------

it('Cars with a "filters" parameter', async () => {
  const { responseData } = await makeReq('cars', 'GET', {
    search: 'Porsche',
    filters: {
      operator: 'or',
      list: [
        { field: 'year', operator: 'is', value: 1968 },
        { field: 'year', operator: 'is', value: 1969 }
      ]
    }
  }, {
    'am-model-fields': ['name', 'year']
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});

// segment ------------------------------------------------------------------------------

it('Cars with a "segment" parameter', async () => {
  const { responseData } = await makeReq('cars', 'GET', {
    segment: {
      type: 'code',
      data: 'ferrari'
    }
  }, {
    'am-model-fields': ['name', 'year']
  });

  expect(responseData).toMatchSpecificSnapshot('./postgres/__snapshots__/model-getall.shot');
});