// /utils/csvParser.js
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.resolve(filePath))
      .pipe(csv())
      .on('data', (data) => {
        // Parse Media field if it exists and is not empty
        if (data.Media && data.Media.trim() !== '') {
          try {
            data.Media = JSON.parse(data.Media);
          } catch (error) {
            console.error('Error parsing Media field:', error);
            data.Media = {}; // Default to an empty object if parsing fails
          }
        } else {
          data.Media = {}; // Default to an empty object if Media is undefined or empty
        }

        // Parse Comments field if it exists and is not empty
        if (data.Comments && data.Comments.trim() !== '') {
          try {
            data.Comments = JSON.parse(data.Comments);
          } catch (error) {
            console.error('Error parsing Comments field:', error);
            data.Comments = []; // Default to an empty array if parsing fails
          }
        } else {
          data.Comments = []; // Default to an empty array if Comments is undefined or empty
        }

        results.push(data);
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

module.exports = { parseCSV };