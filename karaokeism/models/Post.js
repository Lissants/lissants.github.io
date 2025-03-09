class Post {
  constructor(id, authorID, authorName, authorProfilePic, content, media, comments) {
    this.id = id;
    this.authorID = authorID
    this.authorName = authorName;
    this.authorProfilePic = authorProfilePic;
    this.content = content || '';
    this.media = media || {};
    this.comments = comments || [];
  }

  // Getters
  getId() {
    return this.id;
  }

  getAuthorID() {
    return this.authorID;
  }

  getAuthorName() {
    return this.authorName;
  }

  getAuthorProfilePic() {
    return this.authorProfilePic;
  }

  getContent() {
    return this.content;
  }

  getMedia() {
    return this.media;
  }

  getComments() {
    return this.comments;
  }

  // Setters
  setContent(content) {
    this.content = content;
  }
}

module.exports = Post;