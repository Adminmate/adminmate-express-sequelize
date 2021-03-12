const Sequelize = require('sequelize');
const { serializeError } = require('serialize-error');

const Op = Sequelize.Op;

const sequelizeDatatypes = {
  'STRING': 'String',
  'TEXT': 'String',
  'INTEGER': 'Number',
  'FLOAT': 'Number',
  'DATE': 'Date',
  'BOOLEAN': 'Boolean'
};

module.exports.getModelProperties = model => {
  let modelFields = [];
  const modelProps = model.rawAttributes;
  console.log('===model', model, modelProps)

  for (let key in modelProps) {
    console.log('Field: ', key); // this is name of the field
    console.log('TypeField: ', modelProps[key].type.key); // Sequelize type of field
    console.log('TypeField: ', modelProps[key].type, modelProps[key].type.options);
    console.log('=======================');

    const type = modelProps[key].type.key;

    let property = {
      path: key,
      type: sequelizeDatatypes[type] ? sequelizeDatatypes[type] : type
    };

    // Ref option
    if (modelProps[key].references && modelProps[key].references.model) {
      property.ref = modelProps[key].references.model;
    }

    if (key === 'id') {
      modelFields.unshift(property);
    } else {
      modelFields.push(property);
    }
  }

  return modelFields;
};

// To be used in this file
const permutations = list => {
  if (list.length <= 1) {
    return list.slice();
  }

  let result = [],
    i = 0,
    j,
    current,
    rest;

  for(; i < list.length; i++) {
    rest = list.slice(); // make a copy of list
    current = rest.splice(i, 1);
    permutationsRest = permutations(rest);
    for(j = 0; j < permutationsRest.length; j++) {
      result.push(current.concat(permutationsRest[j]));
    }
  }
  return result;
};

module.exports.permutations = permutations;

// To be used in this file
const cleanString = string => {
  return string.toLowerCase().replace(/\W/g, '');
};

module.exports.cleanString = cleanString;

module.exports.constructQuery = (criterias, operator = 'and') => {
  if (!['and', 'or'].includes(operator)) {
    return {};
  }

  const query = [];
  criterias.forEach(criteria => {
    let q = {};
    if (criteria.operator === 'is') {
      q[criteria.field] = { $eq: criteria.value };
    }
    else if (criteria.operator === 'is_not') {
      q[criteria.field] = { $neq: criteria.value };
    }
    else if (criteria.operator === 'is_true') {
      q[criteria.field] = { $eq: true };
    }
    else if (criteria.operator === 'is_false') {
      q[criteria.field] = { $eq: false };
    }
    else if (criteria.operator === 'is_present') {
      q[criteria.field] = { $exists: true };
    }
    else if (criteria.operator === 'is_blank') {
      q[criteria.field] = { $exists: false };
    }
    else if (criteria.operator === 'start_with') {
      const regexp = new RegExp(`^${criteria.value}`);
      q[criteria.field] = { $regex: regexp, $options: 'i' };
    }
    else if (criteria.operator === 'end_with') {
      const regexp = new RegExp(`${criteria.value}$`);
      q[criteria.field] = { $regex: regexp, $options: 'i' };
    }
    else if (criteria.operator === 'contains') {
      const regexp = new RegExp(`${criteria.value}`);
      q[criteria.field] = { $regex: regexp, $options: 'i' };
    }
    else if (criteria.operator === 'not_contains') {
      const regexp = new RegExp(`^((?!${criteria.value}).)*$`);
      q[criteria.field] = { $regex: regexp, $options: 'i' };
    }
    query.push(q);
  });
  return query.length ? { [`$${operator}`]: query } : {};
};

module.exports.refFields = (item, fieldsToPopulate) => {
  const attributes = Object.keys(item);
  attributes.forEach(attr => {

    // Set to empty instead of undefined
    item[attr] = typeof item[attr] === 'undefined' ? '' : item[attr];

    // Manage populate fields
    const matchingField = fieldsToPopulate.find(field => field.path === attr);

    if (matchingField) {
      let label = '';
      if (matchingField.attributes.join(' ') === 'id') {
        label = item.id;
      }
      else {
        label = matchingField.attributes.join(' ').replace(/[a-z._]+/gi, word => {
          return item[attr][word];
        });
      }

      if (item[attr]) {
        console.log('====item[attr]', item[attr])
        item[attr] = {
          type: 'ref',
          id: item[attr].id,
          label
        };
      }
      else {
        item[attr] = '(deleted)';
      }
    }
  });
  return item;
};

module.exports.getFieldsToPopulate = (keys, fieldsToFetch, refFields = {}) => {
  console.log('===!!!!!!!!', keys, fieldsToFetch, refFields)
  // Build ref fields for the model (for sequelize include purpose)
  const refFieldsForModel = {};
  keys.forEach(prop => {
    if (prop.ref) {
      const currentRefModelName = prop.ref.toLowerCase();
      if (refFields[currentRefModelName]) {
        refFieldsForModel[prop.path] = refFields[currentRefModelName];
      }
    }
  });

  // Create query populate config
  let fieldsToPopulate = [];
  fieldsToFetch.forEach(field => {
    const matchingField = keys.find(k => k.path === field);
    if (matchingField && matchingField.ref) {
      const modelObject = global._amConfig.models.find(m => m.slug === matchingField.ref);
      if (modelObject) {
        fieldsToPopulate.push({
          path: field,
          // as: 'test',
          model: modelObject.model,
          attributes: refFieldsForModel[field] ? refFieldsForModel[field].split(' ') : ['id']
        });
      }
    }
  });

  return fieldsToPopulate;
};

const isPositiveInteger = n => {
  return n >>> 0 === parseFloat(n);
};

module.exports.constructSearch = (search, fieldsToSearchIn, fieldsToPopulate = []) => {
  params = { [Op.or]: [] };

  fieldsToSearchIn.map(field => {
    params[Op.or].push({ [field]: { [Op.like]: '%' + search + '%' } });
  });

  // If the search is a valid sql id
  if (isPositiveInteger(search)) {
    params[Op.or].push({ id: search });
  }

  return params;
};

const getModel = modelCode => {
  if (!modelCode) {
    return null;
  }

  const currentModel = global._amConfig.models.find(m => m.slug === modelCode);

  return currentModel;
};

module.exports.getModelObject = modelCode => {
  const currentModel = getModel(modelCode);
  if (!currentModel) {
    return null;
  }

  return currentModel.model;
};

module.exports.getModelOptions = modelCode => {
  const currentModel = getModel(modelCode);
  if (!currentModel) {
    return null;
  }

  return currentModel.options;
};

module.exports.getModelSmartActions = modelCode => {
  const currentModel = getModel(modelCode);
  if (!currentModel) {
    return null;
  }

  return currentModel.smartActions;
};

module.exports.getModelSegments = modelCode => {
  const currentModel = getModel(modelCode);
  if (!currentModel) {
    return null;
  }

  return currentModel.segments;
};

module.exports.buildError = (e, defaultMessage) => {
  if (e && e.errors) {
    let arr = [];
    Object.entries(e.errors).forEach(value => {
      arr.push({ field: value[0], message: value[1].message });
    });
    return { message: defaultMessage, error_details: arr };
  }
  else if (e && e.message) {
    const errorObject = serializeError(e);
    const arr = [{
      message: errorObject.stack
    }];
    return { message: defaultMessage, error_details: arr };
  }
  return { message: defaultMessage };
};