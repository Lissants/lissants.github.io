module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;
  const Friendship = sequelize.define('Friendship', {
    userId1: {
      type: DataTypes.INTEGER, 
      references: { model: 'users', key: 'id' },
      allowNull: false
    },
    userId2: {
      type: DataTypes.INTEGER,
      references: { model: 'users', key: 'id' },
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted'),
      defaultValue: 'pending'
    }
  }, {
    tableName: 'friendships',
    timestamps: true,
    indexes: [
      {
        name: 'unique_friendship_pair',
        unique: true,
        fields: ['userId1', 'userId2']
      }
    ]
  });

  return Friendship;
};