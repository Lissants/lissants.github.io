module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const SavedPost = sequelize.define('SavedPost', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    }
  }, {
    timestamps: true,
    tableName: 'saved_posts'
  });

  SavedPost.associate = (models) => {
    SavedPost.belongsTo(models.User, { 
      foreignKey: 'userId',
      as: 'user'
    });
    
    SavedPost.belongsTo(models.Post, { 
      foreignKey: 'postId',
      as: 'post'
    });
  };

  return SavedPost;
};