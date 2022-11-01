const httpMocks = require('node-mocks-http');

const makeChartReq = data => {
  return httpMocks.createRequest({
    method: 'POST',
    body: {
      data
    }
  });
};

module.exports = api => {
  it('Pie chart - Count', async () => {
    const request = makeChartReq({
      type: 'pie',
      model: 'users_slug',
      group_by: 'rating',
      operation: 'count'
    });

    const response = httpMocks.createResponse();
    await api.modelCustomQuery(request, response, (err) => expect(err).toBeFalsy());

    const responseData = response._getJSONData();
    expect(response.statusCode).toBe(200);
    expect(responseData).toMatchSpecificSnapshot('./common/__snapshots__/chart-pie.shot');
  });

  ['year', 'week', 'month', 'day'].forEach(timeframe => {
    it(`Bar/Lines chart - Simple ${timeframe}`, async () => {
      const request = makeChartReq({
        type: 'bar',
        model: 'users_slug',
        field: 'signup_date',
        group_by: 'signup_date',
        timeframe: timeframe,
        operation: 'count'
      });

      const response = httpMocks.createResponse();
      await api.modelCustomQuery(request, response, (err) => expect(err).toBeFalsy());

      const responseData = response._getJSONData();
      expect(response.statusCode).toBe(200);
      expect(responseData).toMatchSpecificSnapshot(`./common/__snapshots__/chart-bar.shot`);
    });
  });
};
