const express = require('express');
const router = express.Router();
const Post = require('../models/Post'); 
const Profile = require('../models/Profile');
const { parseCSV } = require('../utils/csvParser');

let posts = [];
let profiles = [];

// Load posts and profiles from CSV
(async () => {
  try {
    const postData = await parseCSV('./data/posts.csv');
    posts = postData.map(row => new Post(
      row.ID, 
      row.AuthorID,
      row.AuthorName,
      row.AuthorProfilePic, 
      row.Content, 
      row.Media, 
      row.Comments 
    ));

    console.log('Posts loaded in search.js: ', posts);

    const profileData = await parseCSV('./data/profiles.csv');
    profiles = profileData.map(row => new Profile(
      row.ID,
      row['Display Name'], 
      row['User Name'], 
      row.Email, 
      row.Bio, 
      row['Profile Picture'], 
      row.Age, 
      row.Place 
    ));

  } catch (error) {
    console.error('Error loading CSV data:', error);
  }
})();

// GET search results
router.get('/', (req, res) => {
  const query = req.query.query?.trim().toLowerCase(); 
  console.log('Search Query:', query);

  if (!query) {
    console.log('No query provided. Rendering empty results.');
    return res.render('search', { results: [], Post, Profile });
  }

// Search Results (Eliminates case-sensitiveness)
const postResults = posts.filter(p => {
  const content = p.getContent(); 
  if (typeof content === 'string') { 
    return content.toLowerCase().includes(query);
  }
  return false; 
});

const profileResults = profiles.filter(p => {
  const displayName = p.getDisplayName(); 
  if (typeof displayName === 'string') { 
    return displayName.toLowerCase().includes(query);
  }
  return false; 
});

  res.render('search', { results: [...postResults, ...profileResults], Post, Profile });
});

module.exports = router;