const express = require('express');
const { Sequelize, Op } = require('sequelize');
const router = express.Router();
const { Post, User } = require('../models');

router.get('/api/search', async (req, res) => {
  try {
    const { q: query, filter = 'all', hasMedia } = req.query;
    if (!query) return res.json({ results: [] });

    const searchPattern = `%${query.toLowerCase()}%`;

    // Search conditions configuration
    const searchConfig = {
      post: {
        where: {
          [Op.and]: []
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'profilePicture']
        }]
      },
      user: {
        where: {
          [Op.or]: [
            { username: { [Op.like]: searchPattern } },
            { displayName: { [Op.like]: searchPattern } },
            { bio: { [Op.like]: searchPattern } }
          ]
        }
      }
    };

    // Add content search condition for posts
    searchConfig.post.where[Op.and].push(
      Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('content')),
        'LIKE',
        searchPattern
      )
    );

    // Handle media filter for posts
    if (hasMedia === 'true') {
      searchConfig.post.where[Op.and].push({
        media: { [Op.ne]: null }
      });
    }

    let results = [];
    
    // Search posts
    if (filter === 'all' || filter === 'post') {
      const posts = await Post.findAll(searchConfig.post);
      results.push(...posts.map(p => ({
        type: 'post',
        ...p.get({ plain: true }),
        author: p.author.get({ plain: true })
      })));
    }

    // Search users and their posts
    if (filter === 'all' || filter === 'user') {
      const users = await User.findAll(searchConfig.user);
      const userIds = users.map(u => u.id);
    
      // Get posts from matching users
      const userPosts = await Post.findAll({
        where: {
          [Op.or]: [
            { AuthorID: { [Op.in]: userIds } },
            Sequelize.where(
              Sequelize.fn('LOWER', Sequelize.col('content')),
              'LIKE',
              searchPattern
            )
          ]
        },
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'displayName', 'profilePicture']
        }]
      });
    
      results.push(
        ...users.map(u => ({
          type: 'profile',
          ...u.get({ plain: true })
        })),
        ...userPosts.map(p => ({
          type: 'post',
          ...p.get({ plain: true }),
          author: p.author.get({ plain: true })
        }))
      );
    }

    // Deduplicate results
    const uniqueResults = results.filter((v, i, a) => 
      a.findIndex(t => (
        t.type === v.type && 
        t.id === v.id &&
        t.content === v.content 
      )) === i
    );

    console.log('Final results count:', uniqueResults.length);
    console.log('Posts in results:', uniqueResults.filter(r => r.type === 'post').length);
    console.log('Profiles in results:', uniqueResults.filter(r => r.type === 'profile').length);

    res.json({ results: uniqueResults });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

module.exports = router;