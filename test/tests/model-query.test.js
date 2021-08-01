const httpMocks = require('node-mocks-http');

const { customQuery } = require('../../src/controllers/model-query');

describe('Chart PIE', () => {
  it('- Count', async () => {
    const request = httpMocks.createRequest({
      method: 'POST',
      body: {
        data: {
          model: 'users',
          type: 'pie',
          field: '',
          group_by: 'rating',
          operation: 'count'
        }
      }
    });

    const response = httpMocks.createResponse();

    await customQuery(request, response, (err) => {
      expect(err).toBeFalsy();
    });

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    expect(responseData).toMatchSnapshot();
  });
});