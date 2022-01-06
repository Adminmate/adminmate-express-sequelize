const { getModelPrimaryKeys } = require('../../../src/helpers/functions');

// Simple -------------------------------------------------------------------------------

it('User schema primary keys', async () => {
  const pks = getModelPrimaryKeys('users');
  expect(pks).toMatchSpecificSnapshot('./postgres/__snapshots__/model-pk.shot');
});