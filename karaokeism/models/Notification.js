module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: DataTypes.STRING,
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'notifications'
  });

  return Notification;
};