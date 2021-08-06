const httpMocks = require('node-mocks-http');
const jestCustomSnapshot = require('jest-specific-snapshot');

const { customQuery } = require('../../src/controllers/model-query');

const makeChartReq = data => {
  return httpMocks.createRequest({
    method: 'POST',
    body: {
      data
    }
  });
};

describe('Pie chart', () => {
  it('- Count', async () => {
    const request = makeChartReq({
      type: 'pie',
      model: 'users',
      field: '',
      group_by: 'rating',
      operation: 'count'
    });

    const response = httpMocks.createResponse();
    await customQuery(request, response, (err) => expect(err).toBeFalsy());

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    // expect(responseData).toMatchSnapshot();
    expect(responseData).toMatchSpecificSnapshot('./__snapshots__/chart-pie-count.snap');
  });
});

describe('Bar/Lines chart', () => {
  ['year', 'week', 'month', 'day'].forEach(timeframe => {
    it(`- Simple ${timeframe}`, async () => {
      const request = makeChartReq({
        type: 'bar',
        model: 'users',
        field: 'createdAt',
        group_by: 'createdAt',
        timeframe: timeframe,
        operation: 'count'
      });

      const response = httpMocks.createResponse();
      await customQuery(request, response, (err) => expect(err).toBeFalsy());

      const responseData = response._getJSONData();
      expect(response.statusCode).toBe(200);
      // expect(responseData).toMatchSnapshot();
      expect(responseData).toMatchSpecificSnapshot(`./__snapshots__/chart-bar-simple-${timeframe}.snap`);
    });
  })
});