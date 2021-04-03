module.exports.getIn = async ids => {
  // Get corresponding items
  const items = await currentModel
    .findAll({ id: ids });
    // .catch(e => {
    //   res.status(403).json({ message: e.message });
    // });

  return items;
};