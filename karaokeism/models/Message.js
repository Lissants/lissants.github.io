module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    content: DataTypes.TEXT,
    senderId: DataTypes.INTEGER,
    receiverId: DataTypes.INTEGER
  }, {
    tableName: 'messages'
  });

  return Message;
};