module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.TEXT,
      collate: 'utf8_general_ci'
    },
    media: {
      type: DataTypes.JSON,
      get() {
        const raw = this.getDataValue('media');
        try {
          return raw && typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch (e) {
          console.error('Media parse error:', raw);
          return null;
        }
      },
      set(value) {
        if (value === null || value === undefined || (typeof value === 'object' && Object.keys(value).length === 0)) {
          this.setDataValue('media', null);
        } else {
          this.setDataValue('media', typeof value === 'string' ? value : JSON.stringify(value));
        }
      }
    }
  }, {
    tableName: 'post',
    freezeTableName: true,
    engine: 'InnoDB',
    timestamps: true,
    toJSON: { 
      getters: true,
      virtuals: true
  }, 
    indexes: [
      {
        name: 'search_index',
        fields: ['content']
      }
    ]
  });

  Post.associate = (models) => {
    Post.belongsTo(models.User, {
      foreignKey: 'AuthorID',
      as: 'author'
    });

    Post.hasMany(models.Comment, {
      foreignKey: 'postId',
      as: 'comments',
      onDelete: 'CASCADE',
      hooks: true
    });

    Post.hasMany(models.PostLike, {
      foreignKey: 'postId',
      as: 'likes',
      onDelete: 'CASCADE'
    });

    Post.hasMany(models.SavedPost, {
      foreignKey: 'postId',
      as: 'savers'
    });
  };

  return Post;
};