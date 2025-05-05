const { google } = require('googleapis');
const sheets = google.sheets('v4');
const { initializeAuthClient } = require('./auth');
const { shouldRefreshCache, getCachedData, setCachedData } = require('./cache');
const { CACHE_REFRESH_INTERVAL } = require('../config/constants');
const WORKBOOKS = require('../config/workbooks');

const extractData = async (workbookId, sheetName, forceRefresh = false) => {
  const cacheKey = `${workbookId}_${sheetName}`;
  if (!forceRefresh && getCachedData(cacheKey) && !shouldRefreshCache(CACHE_REFRESH_INTERVAL)) {
    return getCachedData(cacheKey);
  }
  
  try {
    const authClient = await initializeAuthClient();
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: workbookId,
      range: sheetName,
    });
    setCachedData(cacheKey, response.data.values);

    return response.data.values;
  } catch (error) {
    console.error(`Error fetching data from ${workbookId} - ${sheetName}`);
    
    if (getCachedData(cacheKey)) {
      return getCachedData(cacheKey);
    }
    
    return [];
  }
};

const preloadAllData = async (terms, sections) => {
  try {
    for (const term of terms) {
      await extractData(WORKBOOKS.TERM_TIMETABLE, term, true);
    }
    for (const section of sections) {
      await extractData(WORKBOOKS.CLASS_INFO, section, true);
    }
    for (const term of terms) {
      await extractData(WORKBOOKS.PROF_INFO, term, true);
    }
  } catch (error) {
    console.error("Error preloading data:", error);
  }
};

module.exports = {
  extractData,
  preloadAllData
};