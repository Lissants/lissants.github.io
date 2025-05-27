module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const VisualContent = sequelize.define('VisualContent', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    shortName: DataTypes.STRING,
    fileType: DataTypes.STRING,
    cssClass: DataTypes.STRING,
    postId: DataTypes.INTEGER
  });

  return VisualContent;
};