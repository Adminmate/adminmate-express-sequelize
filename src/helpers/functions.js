const { Op } = require('sequelize');
const { serializeError } = require('serialize-error');
const _ = require('lodash');

const compositeHelper = require('./composite');
const pjson = require('../../package.json');

const sequelizeDatatypes = {
  'STRING': 'String',
  'CHAR': 'String',
  'TEXT': 'String',
  'INTEGER': 'Number',
  'BIGINT': 'Number',
  'FLOAT': 'Number',
  'REAL': 'Number',
  'DOUBLE': 'Number',
  'DECIMAL': 'Number',
  'SMALLINT': 'Number',
  'TIME': 'Time',
  'DATE': 'Date',
  'DATEONLY': 'DateOnly',
  'ENUM': 'String',
  'BOOLEAN': 'Boolean',
  'JSON': 'JSON'
};

module.exports = _conf => {
  const getModelProperties = model => {
    let modelFields = [];
    const modelProps = model.rawAttributes;

    for (let key in modelProps) {
      // Type can be a string or an object
      const type = typeof modelProps[key].type === 'string' ?
        modelProps[key].type :
        modelProps[key].type.key;

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
        if (typeof modelProps[key].references.model === 'object') {
          property.ref = modelProps[key].references.model.tableName;
        }
        else {
          property.ref = modelProps[key].references.model;
        }
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

  // Return real sequelize model name (/= table name)
  const getModelRealname = model => {
    return model.name;
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

  const toFixedIfNecessary = (value, dp) => {
    return +parseFloat(value).toFixed(dp);
  };

  // To be used in this file
  const cleanString = string => {
    return string.toLowerCase().replace(/\W/g, '');
  };

  const getSequelizeDialect = connection => {
    return connection.options.dialect;
  };

  const isMySQL = connection => {
    return ['mysql', 'mariadb'].includes(getSequelizeDialect(connection));
  };

  const isPostgres = connection => {
    return ['postgres'].includes(getSequelizeDialect(connection));
  };

  const isSQLite = connection => {
    return getSequelizeDialect(connection) === 'sqlite';
  };

  const constructQuery = (tableName, criterias, operator = 'and', sequelizeInstance) => {
    if (!['and', 'or'].includes(operator)) {
      return {};
    }

    const query = [];
    criterias.forEach(criteria => {
      let q = {};
      if (criteria.list) {
        q = constructQuery(tableName, criteria.list, criteria.operator, sequelizeInstance);
      }
      else {
        const accurateField = `${tableName}.${criteria.field}`;
        const returnField = `$${tableName}.${criteria.field}$`;
        if (criteria.operator === 'is') {
          q[returnField] = { [Op.eq]: criteria.value };
        }
        else if (criteria.operator === 'is_not') {
          q[returnField] = { [Op.ne]: criteria.value };
        }
        // Boolean
        else if (criteria.operator === 'is_true') {
          q[returnField] = { [Op.eq]: true };
        }
        else if (criteria.operator === 'is_false') {
          q[returnField] = { [Op.eq]: false };
        }
        // Exists
        else if (criteria.operator === 'is_present') {
          q[returnField] = { [Op.not]: null };
        }
        else if (criteria.operator === 'is_blank') {
          q[returnField] = { [Op.not]: null };
        }
        // String comparison
        else if (criteria.operator === 'starts_with') {
          q[returnField] = { [Op.startsWith]: criteria.value };
        }
        else if (criteria.operator === 'ends_with') {
          q[returnField] = { [Op.endsWith]: criteria.value };
        }
        else if (criteria.operator === 'contains') {
          const cond = getLikeRule(accurateField, criteria.value, sequelizeInstance);
          q[returnField] = cond[returnField];
        }
        else if (criteria.operator === 'not_contains') {
          const cond = getNotLikeRule(accurateField, criteria.value, sequelizeInstance);
          q[returnField] = cond[returnField];
        }
        // Number
        else if (criteria.operator === 'is_greater_than') {
          q[returnField] = { [Op.gt]: criteria.value };
        }
        else if (criteria.operator === 'is_less_than') {
          q[returnField] = { [Op.lt]: criteria.value };
        }
        // Date
        else if (criteria.operator === 'is_before') {
          q[returnField] = { [Op.lt]: criteria.value };
        }
        else if (criteria.operator === 'is_after') {
          q[returnField] = { [Op.gt]: criteria.value };
        }
        else if (criteria.operator === 'is_today') {
          q[returnField] = {
            [Op.gte]: moment().startOf('day'),
            [Op.lte]: moment().endOf('day')
          };
        }
        else if (criteria.operator === 'was_yesterday') {
          q[returnField] = {
            [Op.gte]: moment().startOf('day').subtract(1, 'day'),
            [Op.lte]: moment().endOf('day').subtract(1, 'day')
          };
        }
        else if (criteria.operator === 'was_in_previous_week') {
          q[returnField] = {
            [Op.gte]: moment().subtract(1, 'week').startOf('week'),
            [Op.lte]: moment().subtract(1, 'week').endOf('week')
          };
        }
        else if (criteria.operator === 'was_in_previous_month') {
          q[returnField] = {
            [Op.gte]: moment().subtract(1, 'month').startOf('month'),
            [Op.lte]: moment().subtract(1, 'month').endOf('month')
          };
        }
        else if (criteria.operator === 'was_in_previous_year') {
          q[returnField] = {
            [Op.gte]: moment().subtract(1, 'year').startOf('year'),
            [Op.lte]: moment().subtract(1, 'year').endOf('year')
          };
        }
      }
      query.push(q);
    });

    return query.length ? { [eval(`Op.${operator}`)]: query } : {};
  };

  const refFields = (item, fieldsToPopulate) => {
    const attributes = Object.keys(item);
    attributes.forEach(attr => {

      // Set to empty instead of undefined
      item[attr] = typeof item[attr] === 'undefined' ? '' : item[attr];

      // Manage populate fields
      const matchingField = fieldsToPopulate.find(field => field.path === attr);

      if (matchingField) {
        let label = '';
        if (matchingField.attributes.join(' ') === 'id') {
          label = item[attr].id;
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

  const toLowerKeys = (obj) => {
    return Object.keys(obj).reduce((accumulator, key) => {
      accumulator[key.toLowerCase()] = obj[key];
      return accumulator;
    }, {});
  };

  const getIncludeParams = (model, keys, fieldsToFetch, refFields = {}) => {
    // Lowercase all object keys
    const cleanRefs = toLowerKeys(refFields);
    // Build ref fields for the model (for sequelize include purpose)
    const refFieldsForModel = {};
    keys.forEach(prop => {
      if (prop.ref) {
        const currentRefModelName = prop.ref.toLowerCase();
        if (cleanRefs[currentRefModelName]) {
          refFieldsForModel[prop.path] = cleanRefs[currentRefModelName];
        }
      }
    });

    const associations = _.values(model.associations)
      .map(ass => getSchemaAssociationDetails(ass))
      .filter(ass => fieldsToFetch.includes(ass.identifierField) && ass.relationship === 'BelongsTo')
      .map(ass => {
        const modelPrimaryKeys = getModelPrimaryKeys(ass.model);
        const attributes = refFieldsForModel[ass.identifierField] ?
                          refFieldsForModel[ass.identifierField].split(' ') :
                          modelPrimaryKeys;

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

  const getLikeRule = (field, search, sequelizeInstance) => {
    // we use `$${field}$` this to tell sequelize it's an accurate field
    if (isPostgres(sequelizeInstance)) {
      return {
        [`$${field}$`]: sequelizeInstance.where(
          sequelizeInstance.cast(sequelizeInstance.col(field), 'text'),
          {[Op.iLike]: `%${search}%`}
        )
      };
    }
    return {
      [`$${field}$`]: sequelizeInstance.where(
        sequelizeInstance.fn('LOWER', sequelizeInstance.col(field)), 'LIKE', `%${search.toLowerCase()}%`
      )
    };
  };

  const getNotLikeRule = (field, search, sequelizeInstance) => {
    if (isPostgres(sequelizeInstance)) {
      return {
        [`$${field}$`]: sequelizeInstance.where(
          sequelizeInstance.cast(sequelizeInstance.col(field), 'text'),
          {[Op.notILike]: `%${search}%`}
        )
      };
    }
    return {
      [`$${field}$`]: sequelizeInstance.where(
        sequelizeInstance.fn('LOWER', sequelizeInstance.col(field)), 'NOT LIKE', `%${search.toLowerCase()}%`
      )
    };
  };

  const constructSearch = (tableName, search, fieldsToSearchIn, sequelizeInstance) => {
    params = { [Op.or]: [] };

    fieldsToSearchIn.map(field => {
      const accurateField = `${tableName}.${field}`;
      params[Op.or].push(getLikeRule(accurateField, search, sequelizeInstance));
    });

    // If the search is a valid sql id
    if (isPositiveInteger(search)) {
      params[Op.or].push({ id: search });
    }

    return params;
  };

  const getModelWhereClause = (model, idsArray) => {
    // Get model primary keys
    const primaryKeys = getModelPrimaryKeys(model);
    const whereClause = compositeHelper.getSequelizeWhereClause(primaryKeys, idsArray);

    return whereClause;
  };

  const fieldsToValues = (string, values) => {
    return string.replace(/[a-z._]+/gi, word => {
      return _.get(values, word);
    });
  };

  const getModelPrimaryKeys = model => {
    const modelObject = typeof model === 'string' ? getModelObject(model) : model;
    if (modelObject.primaryKeyAttributes) {
      return modelObject.primaryKeyAttributes;
    }
    else if (modelObject.rawAttributes && modelObject.rawAttributes.id) {
      return ['id'];
    }
    return [];
  };

  getModelIdField = model => {
    const primaryKeys = getModelPrimaryKeys(model);
    return primaryKeys.length > 1 ? 'amCompositeId' : primaryKeys[0];
  };

  const getModelAssociations = model => {
    // Get current model mongoose realname
    const currentModelRealName = getModelRealname(model);

    if (!currentModelRealName) {
      return [];
    }

    // List all the models that reference the current model
    const associationsList = [];
    _conf.models
      .filter(mc => !!mc.model && getModelRealname(mc.model) !== currentModelRealName)
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

    const currentModel = _conf.models.find(m => m.slug === modelCode);

    return currentModel;
  };

  const getModelObject = modelCode => {
    const currentModel = getModel(modelCode);
    if (!currentModel) {
      return null;
    }

    return currentModel.model;
  };

  const getModelActions = modelCode => {
    const currentModel = getModel(modelCode);
    if (!currentModel) {
      return null;
    }

    return currentModel.actions || [];
  };

  const getModelSegment = (modelCode, segmentCode) => {
    const currentModel = getModel(modelCode);
    if (!currentModel || !currentModel.segments || currentModel.segments.length === 0) {
      return null;
    }

    return currentModel.segments
      .find(s => s.code === segmentCode);
  };

  const validateOrderStructure = orderConfig => {
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

  const buildError = (e, defaultMessage) => {
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
      return { message: e.message, error_details: arr };
    }
    return { message: defaultMessage };
  };

  const getAppConfig = () => {
    return {
      package: pjson.name,
      version: pjson.version
    };
  };

  return {
    getAppConfig,
    buildError,
    validateOrderStructure,
    getModelSegment,
    getModelActions,
    getModelObject,
    getModelAssociations,
    getModelIdField,
    getModelPrimaryKeys,
    getModelRealname,
    getModelProperties,
    fieldsToValues,
    getModelWhereClause,
    constructSearch,
    getIncludeParams,
    refFields,
    constructQuery,
    isMySQL,
    isPostgres,
    isSQLite,
    cleanString,
    permutations,
    toFixedIfNecessary
  };
};
