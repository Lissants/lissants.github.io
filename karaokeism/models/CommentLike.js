module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const CommentLike = sequelize.define('CommentLike', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    commentId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, { 
    tableName: 'commentlikes',
    timestamps: true,
    indexes: [
      {
        name: 'unique_user_comment_like',
        unique: true,
        fields: ['userId', 'commentId']
      }
    ]
  });

  CommentLike.associate = (models) => {
    CommentLike.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });

    CommentLike.belongsTo(models.Comment, {
      foreignKey: 'commentId',
      as: 'comment'
    });
  };

  return CommentLike;
};