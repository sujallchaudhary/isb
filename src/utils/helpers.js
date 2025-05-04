const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const extractSections = (data) => {
  if (!data || data.length <= 1) return [];
  return data.slice(1).map(row => row[0]).filter(Boolean);
};

module.exports = {
  ensureDirectoryExists,
  extractSections
};