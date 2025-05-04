const { google } = require('googleapis');

let authClient = null;

const initializeAuthClient = async () => {
  if (!authClient) {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'cred.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    authClient = await auth.getClient();
  }
  return authClient;
};

module.exports = { initializeAuthClient };