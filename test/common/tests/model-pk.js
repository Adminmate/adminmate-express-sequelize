module.exports = api => {

  // Simple -------------------------------------------------------------------------------

  it('User schema primary keys', async () => {
    const pks = api.getModelPrimaryKeys('users');
    expect(pks).toMatchSpecificSnapshot('./common/__snapshots__/model-pk.shot');
  });
};
