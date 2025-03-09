const express = require('express');
const router = express.Router();
const Profile = require('../models/Profile');
const Post = require('../models/Post');
const { parseCSV } = require('../utils/csvParser');

let profiles = [];
let posts = [];

const getProfiles = () => {
  return profiles;
};

// Load profiles and posts from CSV
const loadProfiles = async () => {
  try {
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

    return profiles; // Ensure this returns the profiles array
  } catch (error) {
    console.error('Error loading CSV data:', error);
    throw error; // Propagate the error
  }
};

// GET profile by ID
router.get('/', (req, res) => {
  const profileId = req.query.id;
  const profile = profiles.find(p => p.getId() === profileId);

  if (!profile) {
    return res.status(404).render('404');
  }

  // Filter posts by AuthorID
  const userPosts = posts.filter(post => post.getAuthorID() === profileId);

  res.render('profile', { profile, posts: userPosts });
});

// Export the router and loadProfiles function
module.exports = { router, loadProfiles, getProfiles };