const { getModelObject, getModelPrimaryKeys } = require('../../../src/helpers/functions');

// Simple -------------------------------------------------------------------------------

it('User schema primary keys', async () => {
  const model = getModelObject('users')
  const pks = getModelPrimaryKeys(model);
  expect(pks).toMatchSpecificSnapshot('./common/__snapshots__/model-pk.shot');
});
