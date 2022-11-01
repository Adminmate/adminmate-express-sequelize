module.exports = api => {

  // Simple -------------------------------------------------------------------------------

  it('User schema primary keys', async () => {
    const pks = api.getModelPrimaryKeys('users_slug');
    expect(pks).toMatchSpecificSnapshot('./common/__snapshots__/model-pk.shot');
  });
};
