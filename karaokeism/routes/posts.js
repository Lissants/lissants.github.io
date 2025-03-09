// /routes/posts.js
const express = require('express');
const { parseCSV } = require('../utils/csvParser');
const Post = require('../models/Post');
const path = require('path');
const { getProfiles } = require('./profiles'); 

module.exports = (posts) => {
  const router = express.Router();

  // Route to display a single post by ID
  router.get('/', (req, res) => {
    const postId = req.query.id; // Use req.query.id instead of req.params.id
    console.log('Post ID:', postId); // Debugging statement
    console.log('Posts in router:', posts); // Debugging statement

    const post = posts.find(p => p.getId() === postId);

    if (!post) {
      console.log('Post not found'); // Debugging statement
      return res.status(404).render('404');
    }

    // Debugging: Log the post object and its Comments property
    console.log('Post:', post);
    console.log('Post Comments:', post.getComments());

    // Fetch the author's profile data
    const profiles = getProfiles(); // Use the getProfiles function
    const authorProfile = profiles.find(profile => profile.getId() === post.getAuthorID());

    if (!authorProfile) {
      console.log('Author profile not found'); // Debugging statement
      return res.status(404).render('404');
    }

    // Render the post template with post and author data
    res.render('post', { post, profile: authorProfile });
  });

  return router;
};