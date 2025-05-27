const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.resolve(filePath))
      .pipe(csv())
      .on('data', (data) => {
        const parsedData = {
          ID: data.ID,
          AuthorID: data.AuthorID,
          AuthorName: data.AuthorName,
          AuthorProfilePic: data.AuthorProfilePic,
          Content: data.Content,
          Media: {},
          Comments: [],
          Likes: parseInt(data.Likes) || 0,
          likedBy: []
        };

        if (data.Media && data.Media.trim() !== '{}') {
          try {
            parsedData.Media = JSON.parse(data.Media);
          } catch (e) {
            console.error('Error parsing Media:', e);
          }
        }

        if (data.Comments && data.Comments.trim() !== '[]') {
          try {
            parsedData.Comments = JSON.parse(data.Comments);
          } catch (e) {
            console.error('Error parsing Comments:', e);
          }
        }

        if (data.likedBy && data.likedBy.trim() !== '[]') {
          try {
            parsedData.likedBy = JSON.parse(data.likedBy);
          } catch (e) {
            console.error('Error parsing likedBy:', e);
          }
        }

        results.push(parsedData);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

function parseProfilesCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.resolve(filePath))
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          ID: data.ID,
          displayName: data['Display Name'],
          userName: data['User Name'],
          email: data.Email,
          bio: data.Bio,
          profilePic: data['Profile Picture'],
          age: data.Age,
          place: data.Place
        });
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

module.exports = { parseCSV, parseProfilesCSV };