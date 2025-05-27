module.exports = (sequelize) => {
  const { DataTypes } = sequelize.Sequelize;

  const Profile = sequelize.define('Profile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    displayName: DataTypes.STRING,
    userName: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    profilePic: DataTypes.STRING,
    bio: DataTypes.TEXT,
    age: DataTypes.INTEGER,
    place: DataTypes.STRING
  }, {
    freezeTableName: true
  });

  return Profile;
};