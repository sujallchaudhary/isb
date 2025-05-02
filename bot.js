const { makeWASocket, useMultiFileAuthState } = require('baileys');
const { google } = require('googleapis');
const pino = require('pino');
const sheets = google.sheets('v4');

const conversationStates = new Map();

const extractData= async ()=> {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'cred.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  try {
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: '1it-S3MCyBVCSvdocHD9tGHclFG9pkcy0zjDYxnwHFmE',
      range: 'Sheet1',
    });
    return response.data.values;
  } catch (error) {
    console.error('Error:', error);
  }
}

const handleMessage = async (sock, from, messageText) => {
    const command = messageText.toLowerCase().trim();
    const state = conversationStates.get(from) || { state: 'initial' };
    if (state.state === 'awaitingSection') {
        const data = await extractData();
        if(data.length>0){
            const sections = data.slice(1).map(row => row[0]);
            const Class = data.slice(1).map(row => row[1]);
            const sectionIndex = parseInt(command) - 1;
            if (sectionIndex >= 0 && sectionIndex < sections.length) {
                await sock.sendMessage(from,{text:`Class: ${Class[sectionIndex]}`});
                conversationStates.set(from, { state: 'initial' });
            } else {
                await sock.sendMessage(from, { text: 'Invalid selection. Please choose a valid section number.' });
            }
        }
        else {
            await sock.sendMessage(from, { text: 'No data found.' });
        }
    }
    else if(state.state === 'initial'){
    if (command === 'hello' || command === 'hi') {
        const data = await extractData();
        if(data.length>0){
            const sections = data.slice(1).map(row => row[0]);
            let messageContent = 'Choose a section from the list below:\n';
            for (let i = 0; i < sections.length; i++) {
                messageContent += `${i + 1}. ${sections[i]}\n`;
            }
            messageContent += 'reply the index number.';
            await sock.sendMessage(from, { text: messageContent });
            conversationStates.set(from, { state: 'awaitingSection'});
        }
        else {
            await sock.sendMessage(from, { text: 'No data found.' });
        }
    }
    else{
        await sock.sendMessage(from, { text: 'Invalid Command.' });
    }
}
};

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
    });

    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update;
        if (qr) console.log('Scan this QR:', qr);
        if (connection === 'open') console.log('Connected!');
        if (connection === 'close') startBot();
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (m) => {
        for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;
            const from = msg.key.remoteJid;
            const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            await handleMessage(sock, from, messageText);
        }
    });
}

startBot().catch((err) => {
    console.error('Error starting bot:', err);
});
