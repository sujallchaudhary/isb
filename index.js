const { makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const path = require('path');
const pino = require('pino');

const { handleMessage } = require('./src/handlers/messageHandler');
const { preloadAllData } = require('./src/services/sheets');
const { CACHE_REFRESH_INTERVAL, SECTIONS, TERMS, DEFAULT_SUBJECTS } = require('./src/config/constants');
const { ensureDirectoryExists } = require('./src/utils/helpers');
const { removeIdleUsers, IDLE_TIMEOUT } = require('./src/models/conversation');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info'));
 
  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, qr } = update;
    if (qr) console.log('Scan this QR:', qr);
    if (connection === 'open') {
      console.log('Connected!');
      preloadAllData(TERMS, SECTIONS, DEFAULT_SUBJECTS);
      setupCacheRefreshTimer();
      setupIdleUserCleanupTimer();
    }
    if (connection === 'close') startBot();
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const from = msg.key.remoteJid;
      const messageText = msg.message.conversation || 
                         (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || 
                         '';
      
      await handleMessage(sock, from, messageText);
    }
  });
}

const setupCacheRefreshTimer = () => {
  setInterval(async () => {
    console.log("Refreshing data cache...");
    await preloadAllData(TERMS, SECTIONS, DEFAULT_SUBJECTS);
  }, CACHE_REFRESH_INTERVAL);
};

const setupIdleUserCleanupTimer = () => {
  const checkInterval = Math.min(IDLE_TIMEOUT / 2, 60000);
  setInterval(() => {
    removeIdleUsers();
  }, checkInterval);
};

// Create directories if they don't exist
ensureDirectoryExists(path.join(__dirname, 'temp'));
ensureDirectoryExists(path.join(__dirname, 'auth_info'));

startBot().catch((err) => {
  console.error('Error starting bot:', err);
});