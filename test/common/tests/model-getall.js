const httpMocks = require('node-mocks-http');

module.exports = api => {

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
    await api.modelGetAll(request, response, (err) => expect(err).toBeFalsy());
    const responseData = response._getJSONData();

    // Response status 200
    expect(response.statusCode).toBe(200);

    return { response, responseData };
  };

  // Simple -------------------------------------------------------------------------------

  it('Users simple request', async () => {
    const { responseData } = await makeReq('users', 'GET', {});
    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  // refFields ----------------------------------------------------------------------------

  it('Cars with refFields params', async () => {
    const { responseData } = await makeReq('cars', 'GET', {}, {
      'am-ref-fields': {
        users: 'firstname lastname'
      }
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  // fields -------------------------------------------------------------------------------

  it('Cars with "fields" parameter (name & manufacturer only)', async () => {
    const { responseData } = await makeReq('cars', 'GET', {}, {
      'am-model-fields': ['name', 'manufacturer']
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  // page ---------------------------------------------------------------------------------

  it('Cars with "page" parameter set to 2', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      page: 2
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  // Try a request where the field "type" is ambigious (present in cars & users table)
  // As the search is looking to find the "Ferrari" word in all field
  // SQL does not know which field we are talking about (the one in cars or users?)
  it('Cars with a "search" parameter in all fields', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      search: 'Ferrari'
    }, {
      'am-model-fields': ['name', 'userId'],
      'am-ref-fields': {
        users: 'firstname'
      }
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  it('Cars with a "search" parameter', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      search: 'Ferrari'
    }, {
      'am-model-fields': ['name']
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  // order --------------------------------------------------------------------------------

  it('Cars with a "order" parameter', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      search: 'Ferrari',
      order: [['name', 'ASC']]
    }, {
      'am-model-fields': ['name']
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  // filters ------------------------------------------------------------------------------

  it('Cars with a "filters" parameter', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      search: 'Ferrari',
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

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  it('Cars with a "filters" and "contains" parameter', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      filters: {
        operator: 'and',
        list: [
          { field: 'name', operator: 'contains', value: 'ferrari 212' },
          { field: 'manufacturer', operator: 'is', value: 'Ferrari' }
        ]
      }
    }, {
      'am-model-fields': ['name', 'manufacturer']
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });

  it('Cars with a "filters" and NOT "contains" parameter', async () => {
    const { responseData } = await makeReq('cars', 'GET', {
      filters: {
        operator: 'and',
        list: [
          { field: 'name', operator: 'contains', value: 'ferrari 250' },
          { field: 'name', operator: 'not_contains', value: 'gt' }
        ]
      }
    }, {
      'am-model-fields': ['name']
    });

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
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

    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/model-getall.shot');
  });
};
