module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const Comment = sequelize.define('Comment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    content: DataTypes.TEXT,
    media: {
      type: DataTypes.JSON,
      allowNull: true,
      get() {
        const raw = this.getDataValue('media');
        try {
          return raw ? JSON.parse(raw) : null;
        } catch (e) {
          return null;
        }
      },
      set(value) {
        this.setDataValue('media', value ? JSON.stringify(value) : null);
      }
    }
  }, {
    timestamps: true,
    toJSON: { 
      getters: true,
      virtuals: true
    }
  });

  Comment.associate = (models) => {
    Comment.belongsTo(models.Post, { 
      foreignKey: 'postId',
      as: 'post',
      onDelete: 'CASCADE'
    });
    
    Comment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'author'
    });

    Comment.belongsTo(models.Comment, {
      foreignKey: 'parentCommentId',
      as: 'parentComment'
    });
    
    Comment.hasMany(models.Comment, { 
      foreignKey: 'parentCommentId', 
      as: 'replies' 
    });
    
    Comment.hasMany(models.CommentLike, {
      foreignKey: 'commentId',
      as: 'commentLikes'
    });
  };

  return Comment;
};