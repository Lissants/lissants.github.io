const express = require('express');
const router = express.Router();

module.exports = function(posts) {
  router.get('/', (req, res) => {
    res.json(posts);
  });

  router.get('/:id', (req, res) => {
    const post = posts.find(p => p.ID == req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(post);
  });

  return router;
};