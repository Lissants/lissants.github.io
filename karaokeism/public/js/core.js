class KaraokeApp {
  constructor() {
    this.posts = [];
    this.profiles = [];
    this.visualContent = [];
    this.currentUser = null;
    this.recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    this.theme = localStorage.getItem('theme') || 'light';

    if (document.readyState === 'complete') {
      this.init();
    }  else {
      document.addEventListener('DOMContentLoaded', () => this.init());
    }
  }

  async init() {
    try {
      await this.loadData();
      this.applyTheme();
      this.setupEventListeners();

      window.app = this;
      console.log('App initialised successfully');
    } catch (error) {
      console.error('Error initialising app:', error);
    }
  }

  async loadData() {
    try {
      const [postsResponse, profilesResponse] = await Promise.all([
        fetch('/api/posts'),
        fetch('/api/profiles')
      ]);
      
      if (!postsResponse.ok || !profilesResponse.ok) {
        throw new Error('Failed to load data from server');
      }
  
      this.posts = await postsResponse.json();
      this.profiles = await profilesResponse.json();
      this.currentUser = this.profiles[0];
      
      console.log('Data loaded from API');
    } catch (error) {
      console.error('Error loading data:', error);
      this.posts = [];
      this.profiles = [];
    }
  }

  parseCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      Papa.parse(filePath, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('Parsing warnings:', results.errors);
          }
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  transformPostData(row) {
    let media = {};
    if (row.Media && row.Media.trim() !== '{}') {
      try {
        media = JSON.parse(row.Media);
      } catch (error) {
        console.error('Error parsing Media field:', error);
      }
    }

    let comments = [];
    if (row.Comments && row.Comments.trim() !== '[]') {
      try {
        comments = JSON.parse(row.Comments);
      } catch (error) {
        console.error('Error parsing Comments field:', error);
      }
    }

    return {
      ID: row.ID,
      AuthorID: row.AuthorID,
      AuthorName: row.AuthorName,
      AuthorProfilePic: row.AuthorProfilePic,
      Content: row.Content,
      Media: media,
      Comments: comments,
      Likes: 0,
      createdAt: new Date().toISOString()
    };
  }

  applyTheme() {
    document.documentElement.setAttribute('data-theme', this.theme);
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.theme);
    this.applyTheme();
  }

  setupEventListeners() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }
  }
  search(query) {
    if(!query) return [];

    this.addRecentSearch(query);
    const lowerQuery = query.toLowerCase();

    const postResults = this.posts.filter(post =>
      post.Content.toLowerCase().includes(lowerQuery)
    );

    const profileResults = this.profiles.filter(profile =>
      profile['Display Name'].toLowerCase().includes(lowerQuery) ||
      profile['User Name'].toLowerCase().includes(lowerQuery)
    );

    return [...postResults, ...profileResults];
  }

  addRecentSearch(query) {
    this.recentSearches = this.recentSearches.filter(q => q !== query);

    this.recentSearches.unshift(query);

    this.recentSearches = this.recentSearches.slice(0, 3);

    localStorage.setItem('recentSearches', JSON.stringify(this.recentSearches));
  }

  createPost(content, media = {}) {
    const newPost = {
      ID: this.posts.length + 1,
      AuthorID: this.currentUser.ID,
      AuthorName: this.currentUser['Display Name'],
      AuthorProfilePic: this.currentUser['Profile Picture'],
      Content: content,
      Media: media,
      Comments: [],
      Likes: 0,
      createdAt: new Date(). toISOString()
    };

    this.posts.unshift(newPost);
    return newPost;
  }

  addComment(postId, text) {
    const post = this.posts.find(p => p.ID == postId);
    if (!post) return null;

    const newComment = {
      authorID: this.currentUser.ID,
      authorName: this.currentUser['Display Name'],
      text: text,
      profilePic: this.currentUser['Profile Picture'],
      createdAt: new Date().toISOString()
    };

    if (!post.Comments) post.Comments = [];
    post.Comments.push(newComment);
    return newComment;
  }

  toggleLike(postId) {
    const post = this.posts.find(p => p.ID == postId);
    if (!post) return null;

    if (!post.Likes) post.Likes = 0;

    if (!post.likedBy) post.likedBy = [];

    const userIndex = post.likedBy.indexOf(this.currentUser.ID);
    if (userIndex === -1) {
      post.likedBy.push(this.currentUser.ID);
      post.Likes++;
    } else {
      post.likedBy.splice(userIndex, 1);
      post.Likes--;
    }

    return post.Likes;
  }
}

new KaraokeApp();