const _ = require('lodash');
const { Op } = require('sequelize');

const _SEP = '|';

const composite = {
  annotateItems: (keys, items) => {
    if (keys.length > 1) {
      items.forEach(item => {
        item.amCompositeId = composite._compositeKey(keys, item);
      });
    }
  },

  getSequelizeWhereClause: (keys, ids) => {
    if (keys.length === 1) {
      return { [keys[0]]: ids };
    }

    if (ids.length === 1) {
      return _.zipObject(keys, composite._getKeyValues(keys, ids[0]));
    }

    return {
      [Op.or]: ids.map(id => _.zipObject(keys, composite._getKeyValues(keys, id)))
    };
  },

  _getKeyValues: (keys, id) => {
    const unpacked = id
      .split(_SEP)
      .map(key => key === 'null' ? null : key);

    if (keys.length !== unpacked.length) {
      throw new Error('Invalid composite key');
    }

    return unpacked;
  },

  _compositeKey: (keys, item) => {
    return keys
      .map(field => encodeURIComponent(item[field] === null ? 'null' : item[field]))
      .join(_SEP);
  }
};

module.exports = composite;