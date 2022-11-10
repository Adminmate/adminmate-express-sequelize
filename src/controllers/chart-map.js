const { Op } = require('sequelize');
const Joi = require('joi');
const geocluster = require("geocluster");
const { uniq } = require('lodash');

module.exports = _conf => {
  const fnHelper = require('../helpers/functions')(_conf);

  const chartMap = async (currentModel, data) => {
    const sequelizeInstance = currentModel.sequelize;

    const paramsSchema = Joi.object({
      type: Joi.string().required(),
      model: Joi.string().required(),
      map_zone: Joi.string().required(),
      map_lat_field: Joi.string().required(),
      map_lng_field: Joi.string().required(),
      map_clustering_rate: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
      filters: Joi.object({
        operator: Joi.string().valid('and', 'or').required(),
        list: Joi.array().required()
      })
    });

    // Validate params
    const { error } = paramsSchema.validate(data);
    if (error) {
      return {
        success: false,
        message: error.details[0].message
      };
    }

    // Filters
    let findParams = {};
    if (data.filters && data.filters.operator && data.filters.list && data.filters.list.length > 0) {
      // Get model real name for some requests
      const modelRealName = fnHelper.getModelRealname(currentModel);
      const filtersQuery = fnHelper.constructQuery(modelRealName, data.filters.list, data.filters.operator, sequelizeInstance);
      if (filtersQuery) {
        findParams = { [Op.and]: filtersQuery };
      }
    }

    try {
      const attributes = uniq([data.map_lat_field, data.map_lng_field]);

      // Query database
      const repartitionData = await currentModel.findAll({
        attributes,
        where: findParams,
        limit: data.limit || undefined,
        raw: true
      });

      const clusteringRate = data.map_clustering_rate ? parseFloat(data.map_clustering_rate) : 0.5;
      const cleanCoordsData = repartitionData.map(d => {
        // If this is already a coord array use it, else build it with the 2 differents given fields
        return data.map_lat_field === data.map_lng_field ? d[data.map_lat_field] : [d[data.map_lat_field], d[data.map_lng_field]];
      });
      const clusteredData = geocluster(cleanCoordsData, clusteringRate);

      const finalData = clusteredData.map(d => {
        return {
          coords: d.centroid,
          count: d.elements.length
        }
      });

      return {
        success: true,
        data: {
          config: null,
          data: finalData
        }
      };
    }
    catch(e) {
      return {
        success: false,
        message: e.message
      };
    }
  };

  return chartMap;
};
