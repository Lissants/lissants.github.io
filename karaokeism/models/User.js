const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      unique: {
        args: true,
        msg: 'Username already exists',
        fields: [sequelize.fn('lower', sequelize.col('username'))]
      },
      allowNull: false,
      collate: 'utf8_general_ci'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING,
      collate: 'utf8_general_ci'
    },
    profilePicture: {
      type: DataTypes.STRING,
      defaultValue: 'default-profile.png'
    },
    bio: DataTypes.TEXT,
    age: DataTypes.INTEGER,
    location: DataTypes.STRING,
    country: {
      type:DataTypes.STRING,
    },
    favPokemon: { 
      type: DataTypes.STRING,
      field: 'favPokemon'
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    emailVerificationTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    passwordResetToken: {
        type: DataTypes.STRING,
        allowNull: true
    },
    passwordResetTokenExpires: {
        type: DataTypes.DATE,
        allowNull: true
    },
    failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    accountLockedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    role: {
        type: DataTypes.ENUM('user', 'moderator', 'supermoderator', 'admin'),
        defaultValue: 'user'
    },
    isBanned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    bannedUntil: {
        type: DataTypes.DATE,
        allowNull: true
    },
    twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true
    },
    is2FAEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
  }, {
    tableName: 'users',
    engine: 'InnoDB',
    timestamps: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    defaultScope: {
      attributes: { 
        exclude: [
          'passwordResetToken', 
          'passwordResetTokenExpires'
        ] 
      }
    },
    indexes: [
      {
        name: 'ft_profile_search',
        type: 'FULLTEXT',
        fields: ['username', 'displayName', 'bio'],
        unique: false
      }
    ],
    getterMethods: {
      getProfilePic() {
        return this.profilePicture;
      },
      getDisplayName() {
        return this.displayName || this.username || 'User';
      }
    }
  });

  User.associate = (models) => {
    User.hasMany(models.Post, { foreignKey: 'AuthorID', as: 'posts' });
    User.hasMany(models.Comment, { foreignKey: 'userId', as: 'comments' });
    User.hasMany(models.PostLike, { foreignKey: 'userId', as: 'postLikes' });
    User.hasMany(models.CommentLike, { foreignKey: 'userId', as: 'commentLikes' });
    User.hasMany(models.SavedPost, {
      foreignKey: 'userId',
      as: 'savedPosts'
    });
    User.belongsToMany(models.User, {
      through: models.Friendship,
      as: 'Friends',
      foreignKey: 'userId1', 
      otherKey: 'userId2' 
    });
    User.belongsToMany(models.User, {
        through: models.Friendship,
        as: 'friends',
        foreignKey: 'userId2',
        otherKey: 'userId1'
    });

    User.hasMany(models.Notification, { foreignKey: 'userId', as: 'notifications' });
    User.hasMany(models.Message, { foreignKey: 'senderId', as: 'sentMessages' });
    User.hasMany(models.Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
  };

    // Hash password before saving
    User.beforeCreate(async (user) => {
      if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
      }

      if (user.username) {
          user.username = user.username.toLowerCase();
      }
      if (user.email) {
          user.email = user.email.toLowerCase();
      }
    });

    User.beforeUpdate(async (user) => {
        if (user.changed('password') && user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
        if (user.changed('username') && user.username) {
            user.username = user.username.toLowerCase();
        }
         if (user.changed('email') && user.email) {
            user.email = user.email.toLowerCase();
        }
    });

    User.prototype.validPassword = async function(password) {
        return await bcrypt.compare(password, this.password);
    };

  return User;
};