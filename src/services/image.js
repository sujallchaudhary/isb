const fs = require('fs');
const axios = require('axios');
const { getCachedImage, setCachedImage } = require('./cache');

const downloadImage = async (url, filePath) => {
  if (getCachedImage(url)) {
    return getCachedImage(url);
  }
  
  try {
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });
    
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on('finish', () => {
        setCachedImage(url, filePath);
        resolve(filePath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

module.exports = { downloadImage };