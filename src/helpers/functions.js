const { Op } = require('sequelize');
const { serializeError } = require('serialize-error');
const _ = require('lodash');

const sequelizeDatatypes = {
  'STRING': 'String',
  'TEXT': 'String',
  'INTEGER': 'Number',
  'FLOAT': 'Number',
  'DATE': 'Date',
  'ENUM': 'String',
  'BOOLEAN': 'Boolean'
};

const getModelProperties = model => {
  let modelFields = [];
  const modelProps = model.rawAttributes;

  for (let key in modelProps) {
    const type = modelProps[key].type.key;

    let property = {
      path: key,
      type: sequelizeDatatypes[type] ? sequelizeDatatypes[type] : type
    };

    // Required option
    if (modelProps[key].allowNull === false) {
      property.required = true;
    }

    // Default value option
    if (typeof modelProps[key].defaultValue !== 'undefined') {
      property.default = modelProps[key].defaultValue;
    }

    // Ref option
    if (modelProps[key].references && modelProps[key].references.model) {
      property.ref = modelProps[key].references.model;
    }

    // Enum option
    if (type === 'ENUM') {
      property.enum = modelProps[key].values;
    }

    if (key === 'id') {
      modelFields.unshift(property);
    }
    else {
      modelFields.push(property);
    }
  }

  return modelFields;
};

module.exports.getModelProperties = getModelProperties;

// Return real sequelize model name (/= table name)
const getModelRealname = model => {
  return model.name;
};

module.exports.getModelRealname = getModelRealname;

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
      q[criteria.field] = { [Op.eq]: criteria.value };
    }
    else if (criteria.operator === 'is_not') {
      q[criteria.field] = { [Op.neq]: criteria.value };
    }
    else if (criteria.operator === 'is_true') {
      q[criteria.field] = { [Op.eq]: true };
    }
    else if (criteria.operator === 'is_false') {
      q[criteria.field] = { [Op.eq]: false };
    }
    else if (criteria.operator === 'is_present') {
      q[criteria.field] = { [Op.not]: null };
    }
    else if (criteria.operator === 'is_blank') {
      q[criteria.field] = { [Op.not]: null };
    }
    else if (criteria.operator === 'starts_with') {
      q[criteria.field] = { [Op.startsWith]: criteria.value };
    }
    else if (criteria.operator === 'ends_with') {
      q[criteria.field] = { [Op.endsWith]: criteria.value };
    }
    else if (criteria.operator === 'contains') {
      q[criteria.field] = { [Op.like]: `%${criteria.value}%` };
    }
    else if (criteria.operator === 'not_contains') {
      q[criteria.field] = { [Op.notLike]: `%${criteria.value}%` };
    }
    query.push(q);
  });
  return query.length ? { [eval(`Op.${operator}`)]: query } : {};
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

const getSchemaAssociationDetails = association => {
  const schema = {
    as: association.associationAccessor,
    relationship: association.associationType,
    // reference: `${association.target.name}.${association.foreignKey}`,
    foreignKey: association.foreignKey,
    identifierField: association.identifierField,
    model: association.target.unscoped()
  };

  return schema;
};

module.exports.getIncludeParams = (model, keys, fieldsToFetch, refFields = {}) => {
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

  const associations = _.values(model.associations)
    .map(ass => getSchemaAssociationDetails(ass))
    .filter(ass => fieldsToFetch.includes(ass.identifierField) && ass.relationship === 'BelongsTo')
    .map(ass => {
      const attributes = refFieldsForModel[ass.identifierField] ? refFieldsForModel[ass.identifierField].split(' ') : ['id'];
      return {
        path: ass.identifierField,
        as: ass.as,
        model: ass.model,
        attributes
      }
    });

  return associations;
};

const isPositiveInteger = n => {
  return n >>> 0 === parseFloat(n);
};

module.exports.constructSearch = (search, fieldsToSearchIn) => {
  params = { [Op.or]: [] };

  fieldsToSearchIn.map(field => {
    params[Op.or].push({
      [field]: {
        [Op.like]: `%${search}%`
      }
    });
  });

  // If the search is a valid sql id
  if (isPositiveInteger(search)) {
    params[Op.or].push({ id: search });
  }

  return params;
};

module.exports.getModelAssociations = model => {
  // Get current model mongoose realname
  const currentModelRealName = getModelRealname(model);

  if (!currentModelRealName) {
    return [];
  }

  // List all the models that reference the current model
  const associationsList = [];
  global._amConfig.models
    .filter(mc => getModelRealname(mc.model) !== currentModelRealName)
    .forEach(mc => {
      const modelProperties = getModelProperties(mc.model);
      if (modelProperties && modelProperties.length) {
        modelProperties.forEach(mp => {
          if (mp.ref === currentModelRealName) {
            associationsList.push({
              model: mc.model,
              model_slug: mc.slug,
              slug: `${mc.slug}_${mp.path}`,
              ref_field: mp.path
            });
          }
        })
      }
    });

  return associationsList;
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

module.exports.getModelSegment = (modelCode, segmentCode) => {
  const currentModel = getModel(modelCode);
  if (!currentModel || !currentModel.segments || currentModel.segments.length === 0) {
    return null;
  }

  return currentModel.segments
    .find(s => s.code === segmentCode);
};

module.exports.validateOrderStructure = orderConfig => {
  let bool = true;
  if (orderConfig && Array.isArray(orderConfig)) {
    orderConfig.forEach(oc => {
      if (!Array.isArray(oc) || oc.length !== 2 && !['ASC', 'DESC'].includes(oc[1])) {
        bool = false;
      }
    });
  }
  else {
    bool = false;
  }
  return bool;
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