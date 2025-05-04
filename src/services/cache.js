const dataCache = {
  lastUpdated: null,
  data: {},
  imageCache: {}
};

const shouldRefreshCache = (cacheRefreshInterval) => {
  return !dataCache.lastUpdated || 
         (Date.now() - dataCache.lastUpdated > cacheRefreshInterval);
};

const getCachedData = (key) => {
  return dataCache.data[key];
};

const setCachedData = (key, data) => {
  dataCache.data[key] = data;
  dataCache.lastUpdated = Date.now();
};

const getCachedImage = (url) => {
  return dataCache.imageCache[url];
};

const setCachedImage = (url, path) => {
  dataCache.imageCache[url] = path;
};

const updateLastRefreshed = () => {
  dataCache.lastUpdated = Date.now();
};

module.exports = {
  dataCache,
  shouldRefreshCache,
  getCachedData,
  setCachedData,
  getCachedImage,
  setCachedImage,
  updateLastRefreshed
};