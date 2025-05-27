module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const PostLike = sequelize.define('PostLike', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    postId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'postId']
      }
    ]
  });

  PostLike.associate = (models) => {
    PostLike.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    PostLike.belongsTo(models.Post, {
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return PostLike;
};