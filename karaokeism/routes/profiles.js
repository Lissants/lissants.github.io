const express = require('express');
const Profile = require('../models/Profile');
const { parseCSV } = require('../utils/csvParser');

module.exports = function(posts, getProfiles) { 
  const router = express.Router();

  router.get('/', (req, res) => {
    const profileId = req.query.id;
    const profiles = getProfiles();
    
    const profile = profiles.find(p => p.getId() === profileId);
    if (!profile) return res.status(404).render('404');

    const userPosts = posts.filter(post => post.getAuthorID() === profileId);
    res.render('profile', {
      profile,
      posts: userPosts,
      currentUser: res.locals.currentUser
    });
  });

  return router;
};