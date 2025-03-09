class Profile {
  constructor(id, displayName, userName, email, bio, profilePic, age, place) {
    this.id = id;
    this.displayName = displayName;
    this.userName = userName;
    this.email = email;
    this.bio = bio;
    this.profilePic = profilePic;
    this.age = age;
    this.place = place;
  }

  // Getters
  getId() {
    return this.id;
  }

  getDisplayName() {
    return this.displayName;
  }

  getUserName() {
    return this.userName;
  }

  getEmail() {
    return this.email;
  }

  getBio() {
    return this.bio;
  }

  getProfilePic() {
    return this.profilePic;
  }

  getAge() {
    return this.age;
  }

  getPlace() {
    return this.place;
  }
  // Setters
  setDisplayName(displayName) {
    this.displayName = displayName;
  }

  setUserName(userName) {
    this.userName = userName;
  }

  setEmail(email) {
    this.email = email;
  }

  setBio(bio) {
    this.bio = bio;
  }

  setProfilePic(profilePic) {
    this.profilePic = profilePic;
  }

  setAge(age) {
    this.age = age;
  }

  setPlace(place) {
    this.place = place;
  }
}

module.exports = Profile;