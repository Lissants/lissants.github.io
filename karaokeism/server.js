const express = require('express');
const path = require('path');
const app = express();
const { router: profilesRouter, loadProfiles } = require('./routes/profiles');
const Post = require('./models/Post');
const { parseCSV } = require('./utils/csvParser');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Load posts from CSV
let posts = []; 
(async () => {
  try {
    const postsData = await parseCSV(path.resolve(__dirname, './data/posts.csv'));
    posts = postsData.map(row => new Post(
      row.ID,
      row.AuthorID,
      row.AuthorName,
      row.AuthorProfilePic,
      row.Content,
      row.Media,
      row.Comments
    ));
    console.log('Posts loaded successfully:', posts);

    // Load profiles and start the server
    loadProfiles()
      .then((profiles) => {
        // Initialize routes after posts and profiles are loaded
        const postsRouter = require('./routes/posts')(posts);
        const searchRouter = require('./routes/search');

        app.use('/posts', postsRouter);
        app.use('/profiles', profilesRouter);
        app.use('/search', searchRouter);

        // Route handler for the home page
        app.get('/', (req, res) => {
          const profile = profiles[0]; 
          if (!profile) {
            return res.status(404).render('404');
          }
          res.render('index', { profile, posts });
        });

        app.use((req, res) => {
          res.status(404).render('404');
        });

        app.listen(3000, () => {
          console.log('Server is running on http://localhost:3000');
        });
      })
      .catch((error) => {
        console.error('Failed to load profiles:', error);
      });
  } catch (error) {
    console.error('Error loading posts:', error);
  }
})();
