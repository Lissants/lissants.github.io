const express = require('express');
const path = require('path');
const fs = require('fs');
const { sequelize, User, Post, Comment, PostLike, CommentLike, SavedPost, Friendship } = require('./models');
const multer = require('multer');
const app = express();
const searchRouter = require('./routes/search');
const { Op } = require('sequelize');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const authRouter = require('./routes/auth');
const authorizeDelete = require('./middleware/authorizeDelete');
const { 
  requireAssignPermission, 
  requireBanPermission, 
  requireUnbanPermission 
} = require('./middleware/authorizeBan');
const { ROLE_LEVEL } = require('./utils/roles');
console.log('>>> Imported ROLE_LEVEL:', ROLE_LEVEL);


require('dotenv').config();

app.use(session({
  secret: process.env.SESSION_SECRET,
  store: new SequelizeStore({ db: sequelize }),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets/uploads', express.static(path.join(__dirname, 'public', 'assets', 'uploads')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/auth', authRouter);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'assets', 'uploads');
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    
    fs.access(path.join(__dirname, 'public', 'assets', 'uploads', filename), fs.constants.F_OK, (err) => {
      if (!err) console.log('File verified:', filename);
    });
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || 
      file.mimetype.startsWith('video/') || 
      file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, videos, and audio are allowed.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

const requireAuth = async (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  const user = await User.findByPk(req.session.user.id);
  if (!user) return res.redirect('/auth/login');

  if (user.isBanned && user.bannedUntil > new Date()) {
    return res.status(403).send('Your account is banned');
  }

  res.locals.currentUser = user;
  next();
};

app.use(requireAuth);

sequelize.authenticate()
  .then(() => console.log('Database connected'))
  .catch(err => console.error('Database connection error:', err));

sequelize.sync({ force: false })
  .then(() => console.log('Database synced'))
  .catch(err => console.error('Database sync error:', err));

  // Assign role (only admin)
  app.patch(
    '/api/users/:userId/role',
    requireAuth,
    requireAssignPermission,
    async (req, res) => {
      const target = await User.findByPk(req.params.userId);
      target.role = req.body.role;
      await target.save();
      res.json({ message: 'Role updated.' });
    }
  );

  // Ban user
  app.post(
    '/api/users/:userId/ban',
    requireAuth,
    requireBanPermission,
    async (req, res) => {
      const target = await User.findByPk(req.params.userId);
      target.isBanned    = true;
      target.bannedUntil = req.body.bannedUntil || null;  
      await target.save();
      res.json({ message: 'User banned.' });
    }
  );

  // Unban user
  app.post(
    '/api/users/:userId/unban',
    requireAuth,
    requireUnbanPermission,
    async (req, res) => {
      const target = await User.findByPk(req.params.userId);
      target.isBanned    = false;
      target.bannedUntil = null;
      await target.save();
      res.json({ message: 'User unbanned.' });
    }
  );
  
  app.use('/', searchRouter);

  app.use(async (req, res, next) => {
    if (req.session.user) {
      res.locals.currentUser = await User.findByPk(req.session.user.id);
    } else {
      res.locals.currentUser = null;
    }
    next();
  });

  app.get('/', requireAuth, async (req, res) => {
    const posts = await Post.findAll({
      include: [
        { model: User, as: 'author' },
        {
          model: Comment,
          as: 'comments',
          include: [
            { 
              model: User, 
              as: 'author',
              attributes: ['id', 'username', 'displayName', 'profilePicture'] 
            },
            { 
              model: CommentLike, 
              as: 'commentLikes'  
            },
            { model: Comment,
              as: 'replies',
              include: [
              { model: User, as: 'author', attributes: ['id','username','displayName','profilePicture'] }
                ]
              }
          ]
        },
        { model: PostLike, as: 'likes' },
        {
          model: SavedPost,
          as: 'savers',
          where: { userId: res.locals.currentUser?.id || null },
          required: false,
          attributes: []
        }
      ],
      attributes: {
        include: [
          [sequelize.literal(`
            EXISTS(
              SELECT 1 FROM saved_posts 
              WHERE saved_posts.postId = Post.id 
              AND saved_posts.userId = ${res.locals.currentUser?.id || 0}
            )
          `), 'isSaved']
        ]
      },
      order: [['createdAt', 'DESC']]
    });
  
    const parsedPosts = posts.map(post => {
      const plainPost = post.toJSON();
      
      plainPost.content = post.content;
      
      if (plainPost.media && typeof plainPost.media === 'string') {
        try {
          plainPost.media = JSON.parse(plainPost.media);
        } catch (e) {
          console.error('Error parsing post media:', e);
          plainPost.media = null;
        }
      }
  
      plainPost.comments = plainPost.comments.map(comment => {
        if (comment.media && typeof comment.media === 'string') {
          try {
            comment.media = JSON.parse(comment.media);
          } catch (e) {
            console.error('Error parsing comment media:', e);
            comment.media = null;
          }
        }
        return comment;
      });

      const parseComments = (comments) => {
        return comments.map(comment => {
          if (comment.media && typeof comment.media === 'string') {
            try {
              comment.media = JSON.parse(comment.media);
            } catch (e) {
              console.error('Error parsing comment media:', e);
              comment.media = null;
            }
          }
          
          if (comment.replies) {
            comment.replies = parseComments(comment.replies);
          }
          
          return comment;
        });
      };
    
      plainPost.comments = parseComments(plainPost.comments);
      
      return plainPost;
    });
  
    res.render('index', { posts: parsedPosts });
  });

  app.get('/posts', requireAuth, async (req, res) => {
    const postId = req.query.id;
    if (!postId) return res.status(400).send('Missing post ID');
  
    const post = await Post.findByPk(postId, {
      include: [
        { model: User, as: 'author' },
        {
          model: Comment,
          as: 'comments',
          include: [
            { model: User, as: 'author' },
            { 
              model: CommentLike,
              as: 'commentLikes'
            }
          ]
        },
        { model: PostLike, as: 'likes' }
      ]
    });
  
    if (!post) return res.status(404).render('404');
    
    const plainPost = post.get({ plain: true });
    if (typeof plainPost.media === 'string') {
      try {
        plainPost.media = JSON.parse(plainPost.media);
      } catch (e) {
        console.error('Error parsing post media:', e);
        plainPost.media = null;
      }
    }
  
    res.render('post', { 
      post: plainPost,
      currentUser: res.locals.currentUser
    });
  });

  app.get('/api/posts', requireAuth, async (req, res) => {
    try {
      const posts = await Post.findAll({
        include: [
          { model: Comment,
            as: 'comments',
            include: [
              { model: User },
              { model: CommentLike },
              { 
                model: Comment,
              as: 'replies',
              include: [
              { model: User, as: 'author', attributes: ['id','username','displayName','profilePicture'] }
                ]
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });
  
      const safePosts = posts.map(post => {
        const plainPost = post.get({ plain: true });
        plainPost.comments = plainPost.comments.map(comment => ({
          ...comment,
          media: typeof comment.media === 'string' ? JSON.parse(comment.media) : comment.media
        }));
        return plainPost;
      });
  
      res.json(safePosts);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Delete Post
  app.delete('/api/posts/:id', authorizeDelete('post'), async (req, res) => {
    try {
      const post = await Post.findByPk(req.params.id, {
        include: [{
          model: Comment,  
          as: 'comments'   
        }]
      });
  
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
  
      if (post.userId !== res.locals.currentUser.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
  
      await post.destroy();
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to delete post',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  });

  // Delete Reply
  app.delete('/api/posts/:id/comments/:parentCommentId/reply/:replyId',
    authorizeDelete('reply'),
    async (req, res) => {
      await Comment.destroy({ where: { id: req.params.replyId } });
      res.json({ success: true });
    }
  );

  // Update Post
  app.put('/api/posts/:id', upload.single('media'), async (req, res) => {
    try {
      const post = await Post.findByPk(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });

      if (post.AuthorID !== res.locals.currentUser.id) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      let media = post.media;
      if (req.file) {
        media = {
          type: req.file.mimetype.split('/')[0] === 'image' ? 'image' :
              req.file.mimetype.split('/')[0] === 'video' ? 'video' : 'audio',
          url: `/assets/uploads/${req.file.filename}`
        };
      }

    await post.update({
      content: req.body.content || post.content,
      media: media
    });

    const updatedPost = await Post.findByPk(post.id, {
      include: [{ model: User, as: 'author' }]
    });

    res.json(updatedPost.toJSON());
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

  app.post('/api/posts/:id/like', async (req, res) => {
    try {
      const post = await Post.findByPk(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found' });
  
      const existingLike = await PostLike.findOne({
        where: { postId: post.id, userId: res.locals.currentUser.id }
      });
  
      if (existingLike) {
        await existingLike.destroy();
      } else {
        await PostLike.create({
          postId: post.id,
          userId: res.locals.currentUser.id
        });
      }
  
      const likesCount = await PostLike.count({
        where: { postId: post.id }
      });
  
      res.json({
        likes: likesCount,
        liked: !existingLike
      });
  
    } catch (error) {
      console.error('Error liking post:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

app.post('/api/posts', upload.single('media'), async (req, res) => {
  try {
    if (!res.locals.currentUser?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const media = req.file ? {
      type: req.file.mimetype.split('/')[0] === 'image' ? 'image' :
           req.file.mimetype.split('/')[0] === 'video' ? 'video' : 'audio',
      url: `/assets/uploads/${req.file.filename}`
    } : null;

    const newPost = await Post.create({
      content: req.body.content,
      media: media,
      AuthorID: res.locals.currentUser.id
    });

    const postWithAuthor = await Post.findByPk(newPost.id, {
      include: [
        { 
          model: User, 
          as: 'author' 
        },
        {
          model: Comment,
          as: 'comments',
          include: [{
            model: CommentLike,
            as: 'commentLikes'
          }]
        }
      ]
    });

    const responseData = postWithAuthor.toJSON();
    if (responseData.media && typeof responseData.media === 'string') {
      responseData.media = JSON.parse(responseData.media);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/posts/:postId/comments', upload.single('media'), async (req, res) => {
  try {
    let media = null;

    if (req.file) {
      const type = req.file.mimetype.split('/')[0];
      media = {
        type: type === 'image' ? 'image' :
              type === 'video' ? 'video' : 'audio',
        url: `/assets/uploads/${req.file.filename}`
      };
    }

    const comment = await Comment.create({
      content: req.body.text,
      media: media,
      postId: req.params.postId,
      userId: res.locals.currentUser.id
    });

    const commentWithAuthor = await Comment.findByPk(comment.id, {
      include: [
        { 
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'profilePicture']
        },
        {
          model: CommentLike,
          as: 'commentLikes'
        }
      ]
    });

    const responseData = commentWithAuthor.toJSON();
    
    if (responseData.media && typeof responseData.media === 'string') {
      responseData.media = JSON.parse(responseData.media);
    }

    res.json(responseData);

  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Toggle save post
app.post('/api/posts/:id/save', async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existingSave = await SavedPost.findOne({
      where: { 
        postId: post.id,
        userId: res.locals.currentUser.id
      }
    });

    if (existingSave) {
      await existingSave.destroy();
      res.json({ 
        saved: false,
        message: 'Post unsaved successfully'
      });
    } else {
      await SavedPost.create({
        postId: post.id,
        userId: res.locals.currentUser.id
      });
      res.json({ 
        saved: true,
        message: 'Post saved successfully'
      });
    }
  } catch (error) {
    console.error('Error saving post:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
});

// Get saved posts
app.get('/api/users/:userId/saved-posts', requireAuth, async (req, res) => {
  try {
    const savedPosts = await SavedPost.findAll({
      where: { userId: req.params.userId },
      include: [{
        model: Post,
        as: 'post',
        include: [
          { model: User, as: 'author' },
          { 
            model: PostLike,
            as: 'likes'  
          },
          { 
            model: Comment,
            as: 'comments',  
            include: [{
              model: User,
              as: 'author'
            }]
          }
        ]
      }],
      order: [['createdAt', 'DESC']]
    });

    const posts = savedPosts.map(sp => {
      const post = sp.post.get({ plain: true });
      
      if (post.media && typeof post.media === 'string') {
        try {
          post.media = JSON.parse(post.media);
        } catch (e) {
          console.error('Error parsing media:', e);
          post.media = null;
        }
      }
      
      return post;
    });

    res.json(posts);
  } catch (error) {
    console.error('Error fetching saved posts:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete Comment
app.delete('/api/posts/:postId/comments/:commentId', authorizeDelete('comment'), async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.userId !== res.locals.currentUser.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await comment.destroy();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Comment
app.put('/api/posts/:postId/comments/:commentId', upload.single('media'), async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    if (comment.userId !== res.locals.currentUser.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    let media = comment.media;
    if (req.file) {
      media = {
        type: req.file.mimetype.split('/')[0] === 'image' ? 'image' :
             req.file.mimetype.split('/')[0] === 'video' ? 'video' : 'audio',
        url: `/assets/uploads/${req.file.filename}`
      };
    }

    await comment.update({
      content: req.body.text || comment.content,
      media: media
    });

    const updatedComment = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author' }]
    });

    res.json(updatedComment.toJSON());
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/posts/:postId/comments/:commentId/like', async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.commentId, {
      include: [{
        model: CommentLike,
        as: 'commentLikes'
      }]
    });

    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const existingLike = await CommentLike.findOne({
      where: { 
        commentId: comment.id,
        userId: res.locals.currentUser.id
      }
    });

    if (existingLike) {
      await existingLike.destroy();
    } else {
      await CommentLike.create({
        commentId: comment.id,
        userId: res.locals.currentUser.id
      });
    }

    const updatedComment = await Comment.findByPk(req.params.commentId, {
      include: [{
        model: CommentLike,
        as: 'commentLikes'
      }]
    });

    res.json({
      likes: updatedComment.commentLikes.length,
      liked: !existingLike
    });
    
  } catch (error) {
    console.error('Error liking comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/posts/:postId/comments/:parentCommentId/reply', requireAuth, upload.single('media'), async (req, res) => {
  try {
    const userId = res.locals.currentUser.id;
    const { parentCommentId } = req.params;
    const { text } = req.body;

    const reply = await Comment.create({
      content: text,
      media: req.file ? {
        type: req.file.mimetype.split('/')[0],
        url: `/assets/uploads/${req.file.filename}`
      } : null,
      postId: req.params.postId,
      userId,
      parentCommentId
    });

    const replyWithAuthor = await Comment.findByPk(reply.id, {
      include: [
        { model: User, as: 'author' },
        { model: CommentLike, as: 'commentLikes' }
      ]
    });

    res.json(replyWithAuthor.toJSON());
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/profiles', requireAuth, async (req, res) => {
  const userId = req.query.id;
  if (!userId) return res.status(400).send('Missing user ID');

  const user = await User.findByPk(userId, {
    include: [{
      model: Post,
      as: 'posts',
      include: [
        { model: User, as: 'author' },
        {
          model: Comment,
          as: 'comments',
          include: [
            { model: User, as: 'author' },
            { model: Comment,
              as: 'replies',
                include: [
              { model: User, as: 'author', attributes: ['id','username','displayName','profilePicture'] }
                ] }
          ],
        },
        { model: PostLike, as: 'likes' }
      ]
    }]
  });

  if (!user) return res.status(404).render('404');

  // Add media parsing for profile page posts
  const parsedUser = user.get({ plain: true });
  parsedUser.posts = parsedUser.posts.map(post => {
    if (post.media && typeof post.media === 'string') {
      try {
        post.media = JSON.parse(post.media);
      } catch (e) {
        console.error('Error parsing post media:', e);
        post.media = null;
      }
    }
    
    post.comments = post.comments.map(comment => {
      if (comment.media && typeof comment.media === 'string') {
        try {
          comment.media = JSON.parse(comment.media);
        } catch (e) {
          console.error('Error parsing comment media:', e);
          comment.media = null;
        }
      }
      return comment;
    });
    
    return post;
  });

  const actor = res.locals.currentUser;
  const target = parsedUser;

  const actorLevel = ROLE_LEVEL[actor?.role] || 0;
  const targetLevel = ROLE_LEVEL[target?.role] || 0;

  const countries = await fetch('https://restcountries.com/v3.1/all')
  .then(r => r.json())
  .then(data => data
    .map(c => ({ name: c.name.common, code: c.cca2 }))
    .sort((a, b) => a.name.localeCompare(b.name))
  );

  const created = new Date(user.createdAt);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  parsedUser.memberSince = `${monthNames[created.getMonth()]} ${created.getFullYear()}`;

  const canShowBanButton = !!(
    actor &&                              
    actorLevel >= ROLE_LEVEL.moderator && 
    actorLevel > targetLevel &&           
    actor.id !== target.id                
  );

  let friendshipStatus = 'none';
  if (actor && actor.id !== target.id) {
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId1: actor.id, userId2: target.id },
          { userId1: target.id, userId2: actor.id }
        ]
      }
    });

    if (friendship) {
      if (friendship.status === 'accepted') {
        friendshipStatus = 'friends';
      } else {
        friendshipStatus = friendship.userId1 === actor.id ? 
          'pending_sent' : 'pending_received';
      }
    }
  }

  // Fetch Weather Data
  let weatherData = null;
  if (parsedUser.location) {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(parsedUser.location)}&appid=${apiKey}&units=metric`;
      const weatherResponse = await fetch(weatherUrl);
      if (weatherResponse.ok) weatherData = await weatherResponse.json();
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  }

  // Fetch Pokémon Data
  console.log('Favorite Pokémon:', parsedUser.favPokemon);

  let pokemonData = null;
  if (parsedUser.favPokemon) {
    try {
      const pokemonName = parsedUser.favPokemon.toLowerCase();
      const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
      if (pokemonResponse.ok) pokemonData = await pokemonResponse.json();
    } catch (error) {
      console.error('Error fetching Pokémon:', error);
    }
  }

  res.render('profile', {
    profile: parsedUser,
    posts: parsedUser.posts,
    currentUser: actor,
    users: parsedUser,
    countries,
    ROLE_LEVEL,
    canShowBanButton,
    friendshipStatus,
    weatherData,
    pokemonData
  });
});

app.get('/api/profiles', requireAuth, async (req, res) => {
  try {
    const profiles = await Profile.findAll();
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/search', requireAuth, (req, res) => {
  res.render('search', {
    query: req.query.q || '',
    currentUser: res.locals.currentUser
  });
});

app.get('/api/debug/posts', requireAuth, async (req, res) => {
  const posts = await Post.findAll({
    include: [{ model: User, as: 'author' }]
  });
  res.json(posts.map(p => p.get({ plain: true })));
});

// Update Profile
app.put('/api/profiles/:id', upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (userId !== res.locals.currentUser.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {
      displayName: req.body.displayName,
      bio: req.body.bio,
      age: req.body.age,
      country: req.body.country
    };

    if (req.file) {
      updates.profilePicture = `uploads/${req.file.filename}`;
    }

    await user.update(updates);

    const updatedUser = user.toJSON();
    delete updatedUser.password;
    delete updatedUser.email;

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Send friend request
app.post('/api/friends/:friendId/request', requireAuth, async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    const friendId = parseInt(req.params.friendId);
    
    if (currentUser.id === friendId) {
      return res.status(400).json({ error: "Cannot add yourself" });
    }

    // Check for existing requests in either direction
    const existing = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId1: currentUser.id, userId2: friendId },
          { userId1: friendId, userId2: currentUser.id }
        ]
      }
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: "Already friends" });
      }
      if (existing.userId1 === currentUser.id) {
        return res.status(400).json({ error: "Request already sent" });
      }
      return res.status(400).json({ error: "This user already has a pending request from you" });
    }

    // Create new pending request
    const friendship = await Friendship.create({
      userId1: currentUser.id,
      userId2: friendId,
      status: 'pending'
    });

    res.json({ message: "Friend request sent", friendship });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Accept friend request
app.post('/api/friends/:friendId/accept', requireAuth, async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    const friendId = parseInt(req.params.friendId);

    const friendship = await Friendship.findOne({
      where: {
        userId1: friendId,
        userId2: currentUser.id,
        status: 'pending'
      }
    });

    if (!friendship) return res.status(404).json({ error: "No pending request found" });

    friendship.status = 'accepted';
    await friendship.save();

    res.json({ message: "Friend request accepted", friendship });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reject friend request
app.post('/api/friends/:friendId/reject', requireAuth, async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    const friendId = parseInt(req.params.friendId);

    const friendship = await Friendship.findOne({
      where: {
        userId1: friendId,
        userId2: currentUser.id,
        status: 'pending'
      }
    });

    if (!friendship) return res.status(404).json({ error: "No pending request found" });

    await friendship.destroy();
    res.json({ message: "Friend request rejected" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Remove friend relationship
app.delete('/api/friends/:friendId', requireAuth, async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    const friendId = parseInt(req.params.friendId);

    const userId1 = Math.min(currentUser.id, friendId);
    const userId2 = Math.max(currentUser.id, friendId);

    const friendship = await Friendship.findOne({
      where: { userId1, userId2 }
    });

    if (!friendship) {
      return res.status(404).json({ error: "Friendship not found" });
    }

    await friendship.destroy();
    res.json({ message: "Friendship removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get friends list
app.get('/api/friends', requireAuth, async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;

    const friendships = await Friendship.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { userId1: currentUser.id },
          { userId2: currentUser.id }
        ]
      },
      include: [
        {
          model: User,
          as: 'friend1',
          where: { id: { [Op.ne]: currentUser.id } },
          required: false
        },
        {
          model: User,
          as: 'friend2',
          where: { id: { [Op.ne]: currentUser.id } },
          required: false
        }
      ]
    });

    const friends = friendships.map(f => 
      f.userId1 === currentUser.id ? f.friend2 : f.friend1
    ).filter(f => f); 

    res.json(friends);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get Pokemon
app.get('/api/user/:id/fav-pokemon', async (req, res) => {
  const userId = req.params.id;

  try {
    const [rows] = await pool.execute('SELECT favPokemon FROM users WHERE id = ?', [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favPokemon = rows[0].favPokemon.toLowerCase();

    const pokemonData = await P.getPokemonByName(favPokemon);

    res.json(pokemonData);
  } catch (error) {
    console.error('Error fetching Pokémon data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

sequelize.sync({ force: false });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});