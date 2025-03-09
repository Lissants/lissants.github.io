class VisualContent {
  constructor(id, name, description, shortName, fileType, cssClass, postId) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.shortName = shortName;
    this.fileType = fileType;
    this.cssClass = cssClass;
    this.postId = postId;
  }

  // Getters
  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

  getDescription() {
    return this.description;
  }

  getShortName() {
    return this.shortName;
  }

  getFileType() {
    return this.fileType;
  }

  getCssClass() {
    return this.cssClass;
  }

  getPostId() {
    return this.postId;
  }

  // Setters
  setCssClass(cssClass) {
    this.cssClass = cssClass;
  }

  getHTML(cssClassOverride) {
    const cssClass = cssClassOverride || this.cssClass;
    if (this.fileType === 'mp4') {
      return `<video class="${cssClass}" controls><source src="/assets/${this.shortName}.${this.fileType}" type="video/mp4">Your browser does not support the video tag.</video>`;
    } else {
      return `<img class="${cssClass}" alt="${this.description}" src="/assets/${this.shortName}.${this.fileType}">`;
    }
  }
}

module.exports = VisualContent;