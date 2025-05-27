require('dotenv').config();
const db = require('./models');
const fs = require('fs');
const csv = require('csv-parser');

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function parseJSONField(field) {
  if (!field || typeof field !== 'string') return null;
  try {
    const sanitized = field.replace(/\\"/g, '"');
    return JSON.parse(sanitized);
  } catch (e) {
    console.error('JSON parse error:', e.message, 'for value:', field);
    return null;
  }
}

async function main() {
  try {
    await db.sequelize.authenticate();
    console.log('Database connected');

    // Sync all models
    await db.sequelize.sync({ force: false });
    await db.User.sync();
    await db.Post.sync();
    await db.Comment.sync();
    await db.PostLike.sync();
    await db.CommentLike.sync();
    await db.VisualContent.sync();
    console.log('Database synced');

  // Import Users
  console.log('Importing users...');
  const profiles = await readCSV('data/profiles.csv');
  for (const row of profiles) {

    await db.User.create({
      id: parseInt(row.id), 
      displayName: row.displayName, 
      username: row.username,     
      email: row.Email,               
      bio: row.Bio || null,           
      profilePicture: row['Profile Picture'] || 'default-profile.png', 
      age: row.age ? parseInt(row.age) : null, 
      location: row.Place || null,    
      country: row.Country || '',
      favPokemon: null,     
      isEmailVerified: false,         
      emailVerificationToken: null,   
      emailVerificationTokenExpires: null, 
      passwordResetToken: null,     
      passwordResetTokenExpires: null, 
      password: null,                 
      failedLoginAttempts: 0,       
      accountLockedUntil: null,     
      role: 'user',                   
      isBanned: false,                
      bannedUntil: null,              
      twoFactorSecret: '',            
      is2FAEnabled: false,            
    });
  }

    // Import Posts
    console.log('Importing posts...');
    const posts = await readCSV('data/posts.csv');
    for (const row of posts) {
      const post = await db.Post.create({
        id: parseInt(row.ID),
        content: row.Content,
        media: parseJSONField(row.Media) || {},
        AuthorID: parseInt(row.AuthorID)
      });

      // Process Comments
      const comments = parseJSONField(row.Comments) || [];
      for (const commentData of comments) {
        if (!commentData?.authorID || !commentData?.text) {
          console.warn('Skipping invalid comment:', commentData);
          continue;
        }

        const comment = await db.Comment.create({
          content: commentData.text,
          media: parseJSONField(commentData.media) || null,
          userId: parseInt(commentData.authorID),
          postId: post.id,
          createdAt: new Date(commentData.createdAt)
        });

        // Process Comment Likes
        try {
          const commentLikes = parseJSONField(commentData.likedBy) || [];
          if (commentLikes && Array.isArray(commentLikes)) {
            for (const userId of commentLikes) {
              await db.CommentLike.create({
                userId: parseInt(userId),
                commentId: comment.id
              });
            }
          }
        } catch (e) {
          console.error('Error processing comment likes:', e);
        }
      }

      // Process Post Likes
      const postLikes = parseJSONField(row.likedBy) || [];
      for (const userId of postLikes) {
        await db.PostLike.create({
          userId: parseInt(userId),
          postId: post.id
        });
      }
    }

    // Import Visual Content
    console.log('Importing visual content...');
    const visualContents = await readCSV('data/visualcontent.csv');
    for (const row of visualContents) {
      await db.VisualContent.create({
        name: row.Name,
        description: row.Description,
        shortName: row['Short Name'],
        fileType: row['File Type'],
        cssClass: row['CSS Class'],
        postId: parseInt(row['Post ID'])
      });
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await db.sequelize.close();
  }
}

main();