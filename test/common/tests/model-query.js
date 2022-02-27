const httpMocks = require('node-mocks-http');
const { customQuery } = require('../../../src/controllers/model-query');

const makeChartReq = data => {
  return httpMocks.createRequest({
    method: 'POST',
    body: {
      data
    }
  });
};

it('Pie chart - Count', async () => {
  const request = makeChartReq({
    type: 'pie',
    model: 'users',
    group_by: 'rating',
    operation: 'count'
  });

  const response = httpMocks.createResponse();
  await customQuery(request, response, (err) => expect(err).toBeFalsy());

  const responseData = response._getJSONData();
  expect(response.statusCode).toBe(200);
  expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/chart-pie.shot');
});

['year', 'week', 'month', 'day'].forEach(timeframe => {
  it(`Bar/Lines chart - Simple ${timeframe}`, async () => {
    const request = makeChartReq({
      type: 'bar',
      model: 'users',
      field: 'signup_date',
      group_by: 'signup_date',
      timeframe: timeframe,
      operation: 'count'
    });

    const response = httpMocks.createResponse();
    await customQuery(request, response, (err) => expect(err).toBeFalsy());

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    expect(responseData).toMatchSpecificSnapshot(`./common/__snapshots__/chart-bar.shot`);
  });
});