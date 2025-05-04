const { makeWASocket, useMultiFileAuthState, downloadContentFromMessage } = require('baileys');
const { google } = require('googleapis');
const pino = require('pino');
const sheets = google.sheets('v4');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const conversationStates = new Map();

const dataCache = {
  lastUpdated: null,
  data: {},
  imageCache: {}
};

const CACHE_REFRESH_INTERVAL = 30 * 60 * 1000;

const WORKBOOKS = {
  CLASS_INFO: '1YH9Zc3icnhKW5Iw4_q3jBXoNUJXOzNG8S1cO4I92_Yk',
  TERM_TIMETABLE: '1wLLVfZKq5NpTwsE8uRMVZ5nDeqSvk17_N-9eia0zuVE',
  PROF_INFO: '1it-S3MCyBVCSvdocHD9tGHclFG9pkcy0zjDYxnwHFmE',
};

const SECTIONS = ['Gladiators', 'Heralds', 'Imperials', 'Jedis', 'Knights', 'Legends'];
const TERMS = ['Term 1'];

const DEFAULT_SUBJECTS = ['WACM', 'FADM', 'LSAT', 'SMDM', 'MGEC'];

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

const shouldRefreshCache = () => {
  return !dataCache.lastUpdated || 
         (Date.now() - dataCache.lastUpdated > CACHE_REFRESH_INTERVAL);
};

const extractData = async (workbookId, sheetName, forceRefresh = false) => {
  const cacheKey = `${workbookId}_${sheetName}`;
  
  if (!forceRefresh && dataCache.data[cacheKey] && !shouldRefreshCache()) {
    console.log(`Using cached data for ${sheetName}`);
    return dataCache.data[cacheKey];
  }
  
  try {
    await initializeAuthClient();
    
    console.log(`Fetching fresh data for ${sheetName}`);
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: workbookId,
      range: sheetName,
    });
    dataCache.data[cacheKey] = response.data.values;
    dataCache.lastUpdated = Date.now();
    
    return response.data.values;
  } catch (error) {
    console.error(`Error extracting data from ${sheetName}:`, error);
    
    if (dataCache.data[cacheKey]) {
      console.log(`Using stale cached data for ${sheetName} due to error`);
      return dataCache.data[cacheKey];
    }
    
    return [];
  }
};

const preloadAllData = async () => {
  console.log("Preloading all data...");
  try {
    // Preload term timetable data
    for (const term of TERMS) {
      await extractData(WORKBOOKS.TERM_TIMETABLE, term, true);
    }
    
    // Preload class info data
    for (const section of SECTIONS) {
      await extractData(WORKBOOKS.CLASS_INFO, section, true);
    }
    
    // Preload prof info data
    for (const subject of DEFAULT_SUBJECTS) {
      await extractData(WORKBOOKS.PROF_INFO, subject, true);
    }
    
    console.log("All data preloaded successfully!");
  } catch (error) {
    console.error("Error preloading data:", error);
  }
};

const setupCacheRefreshTimer = () => {
  setInterval(async () => {
    console.log("Refreshing data cache...");
    await preloadAllData();
  }, CACHE_REFRESH_INTERVAL);
};

const downloadImage = async (url, filePath) => {
  if (dataCache.imageCache[url]) {
    return dataCache.imageCache[url];
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
        dataCache.imageCache[url] = filePath;
        resolve(filePath);
      });
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

const sendMainMenu = async (sock, from) => {
  let messageContent = "Hey Buddy! 😎 How can I help you today?\n\n";
  messageContent += "1. Where is my class\n";
  messageContent += "2. When is my class\n";
  messageContent += "3. Seating Plan for Class\n";
  messageContent += "4. Term Timetable\n";
  messageContent += "5. Office Hours of my prof\n";
  messageContent += "6. Tut timings of my subject\n\n";
  messageContent += "Please Insert Number as input: Example 1 or 2 or 3 so on..";

  await sock.sendMessage(from, { text: messageContent });
  conversationStates.set(from, { state: 'main_menu' });
};

const sendSectionMenu = async (sock, from, nextState,contextData = {}) => {
  let messageContent = "Select your section buddy:\n\n";
  
  for (let i = 0; i < SECTIONS.length; i++) {
    messageContent += `${i + 1}. ${SECTIONS[i]}\n`;
  }
  messageContent += "\nNumeric input like above: 1 or 2 or 3 so on..";

  await sock.sendMessage(from, { text: messageContent });
  conversationStates.set(from, { state: nextState,...contextData});
};

const sendTermMenu = async (sock, from) => {
  let messageContent = "Select your term buddy:\n\n";
  
  for (let i = 0; i < TERMS.length; i++) {
    messageContent += `${i + 1}. ${TERMS[i]}\n`;
  }
  messageContent += "\nNumeric input like above: 1 or 2 or 3 so on..";

  await sock.sendMessage(from, { text: messageContent });
  conversationStates.set(from, { state: 'term_menu' });
};

const sendSubjectMenu = async (sock, from, section, nextState) => {
  try {
    const data = await extractData(WORKBOOKS.CLASS_INFO, section);
    if(data.length==0){
        await sock.sendMessage(from, { text: 'No data found for this section.' });
        return sendMainMenu(sock, from);
    }
    const headerRow = data[0];
    const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
    if (subjectIndex === -1) {
      await sock.sendMessage(from, { text: 'Subject information not found in the sheet.' });
      return sendMainMenu(sock, from);
    }

    const allSubjects = data.slice(1).map(row => row[subjectIndex]).filter(Boolean);
    const subjects = [...new Set(allSubjects)];
    
    let messageContent = "Select your subject:\n\n";
    for (let i = 0; i < subjects.length; i++) {
      messageContent += `${i + 1}. ${subjects[i]}\n`;
    }
    messageContent += "\nNumeric input like above: 1 or 2 or 3 so on..";
    messageContent += "\n\n0. Back to Main Menu";

    await sock.sendMessage(from, { text: messageContent });
    conversationStates.set(from, { 
      state: nextState, 
      section: section,
      subjects: subjects
    });
  } catch (error) {
    console.error('Error sending subject menu:', error);
    await sock.sendMessage(from, { text: 'Error loading subjects. Please try again.' });
    sendMainMenu(sock, from);
  }
};

const sendProfMenu = async (sock, from, subject, nextState) => {
  try {
    const data = await extractData(WORKBOOKS.PROF_INFO, subject);
    
    if (!data || data.length <= 1) {
      await sock.sendMessage(from, { text: 'No professors found for this subject.' });
      return sendMainMenu(sock, from);
    }

    const headerRow = data[0];
    const profIndex = headerRow.findIndex(col => col.toLowerCase() === 'prof');
    
    if (profIndex === -1) {
      await sock.sendMessage(from, { text: 'Professor information not found in the sheet.' });
      return sendMainMenu(sock, from);
    }

    const professors = data.slice(1).map(row => row[profIndex]).filter(Boolean);
    
    let messageContent = "Select your prof:\n\n";
    for (let i = 0; i < professors.length; i++) {
      messageContent += `${i + 1}. ${professors[i]}\n`;
    }
    messageContent += "\nNumeric input like above: 1 or 2 or 3 so on..";
    messageContent += "\n\n0. Back to Main Menu";

    await sock.sendMessage(from, { text: messageContent });
    conversationStates.set(from, { 
      state: nextState, 
      subject: subject,
      professors: professors
    });
  } catch (error) {
    console.error('Error sending professor menu:', error);
    await sock.sendMessage(from, { text: 'Error loading professors. Please try again.' });
    sendMainMenu(sock, from);
  }
};

const handleMessage = async (sock, from, messageText) => {
  const command = messageText.toLowerCase().trim();
  const state = conversationStates.get(from) || { state: 'initial' };

  const handleInvalidInput = async () => {
    await sock.sendMessage(from, { 
      text: "Hmm.. I am not quite sure I understand, could you please provide a numeric output like 1 or 2 and so on..?" 
    });
  };

  if (command === '0' || command === 'back' || command === 'main menu') {
    return sendMainMenu(sock, from);
  }

  switch (state.state) {
    case 'initial':
      if (command === 'hello' || command === 'hi' || command === 'start' || command === 'menu') {
        await sendMainMenu(sock, from);
      } else {
        await sock.sendMessage(from, { 
          text: "Hello! I'm your class information assistant. Type 'hi' or 'menu' to get started!" 
        });
      }
      break;

    case 'main_menu':
      if (command === '1') {
        await sendSectionMenu(sock, from, 'where_section');
      } else if (command === '2') {
        await sendSectionMenu(sock, from, 'when_section');
      } else if (command === '3') {
        await sendSectionMenu(sock, from, 'seating_section');
      } else if (command === '4') {
        // For term timetable, first show term menu
        await sendTermMenu(sock, from);
      } else if (command === '5') {
        await sock.sendMessage(from, { text: "Select your subject buddy:\n\n1. WACM\n2. FADM\n3. LSAT\n4. SMDM\n5. MGEC\n\nNumeric input like above: 1 or 2 or 3 so on.." });
        conversationStates.set(from, { state: 'office_subject' });
      } else if (command === '6') {
        await sock.sendMessage(from, { text: "Select your subject buddy:\n\n1. WACM\n2. FADM\n3. LSAT\n4. SMDM\n5. MGEC\n\nNumeric input like above: 1 or 2 or 3 so on.." });
        conversationStates.set(from, { state: 'tut_subject' });
      } else {
        await handleInvalidInput();
      }
      break;

    case 'term_menu':
      const termIndex = parseInt(command) - 1;
      if (termIndex >= 0 && termIndex < TERMS.length) {
        const selectedTerm = TERMS[termIndex];
        await sendSectionMenu(sock, from, 'term_section',{ selectedTerm });
      } else {
        await handleInvalidInput();
      }
      break;

    case 'where_section':
    case 'when_section':
    case 'seating_section':
    case 'term_section':
      const sectionIndex = parseInt(command) - 1;
      if (sectionIndex >= 0 && sectionIndex < SECTIONS.length) {
        const selectedSection = SECTIONS[sectionIndex];
        
        if (state.state === 'term_section') {
          if (!state.selectedTerm) {
            console.error('Term is not defined in state:', state);
            await sock.sendMessage(from, { text: 'Error: Term selection not found. Please try again.' });
            return sendTermMenu(sock, from);
          }
          try {
            const data = await extractData(WORKBOOKS.TERM_TIMETABLE, state.selectedTerm);
            if (data.length === 0) {
              await sock.sendMessage(from, { text: `No timetable data found for ${state.selectedTerm}.` });
              return sendMainMenu(sock, from);
            }
            const headerRow = data[0];
            const sectionIndex = headerRow.findIndex(col => col.toLowerCase() === 'section');
            const timetableIndex = headerRow.findIndex(col => col.toLowerCase() === 'timetable');
            if (sectionIndex === -1 || timetableIndex === -1) {
              await sock.sendMessage(from, { text: 'Timetable data not properly formatted in the sheet.' });
              return sendMainMenu(sock, from);
            }
            const sectionRow = data.slice(1).find(row => 
              row[sectionIndex] && row[sectionIndex].toLowerCase() === selectedSection.toLowerCase()
            );
            
            if (sectionRow && sectionRow[timetableIndex]) {
              const imageUrl = sectionRow[timetableIndex];
              const imagePath = path.join(__dirname, 'temp', `timetable_${state.selectedTerm}_${selectedSection}.jpg`);
              
              if (!fs.existsSync(imagePath)) {
                fs.mkdirSync(path.dirname(imagePath), { recursive: true });
                await downloadImage(imageUrl, imagePath);
              }
              
              await sock.sendMessage(from, { 
                image: { url: imagePath },
                caption: `${state.selectedTerm} Timetable for ${selectedSection}` 
              });
              setTimeout(() => {
                sock.sendMessage(from, { text: "0. Back to Main Menu" });
              }, 500);
            } else {
              await sock.sendMessage(from, { 
                text: `Timetable image not found for ${selectedSection} in ${state.selectedTerm}.`
              });
              setTimeout(() => sendMainMenu(sock, from), 1000);
            }
          } catch (error) {
            console.error('Error fetching timetable:', error);
            await sock.sendMessage(from, { text: 'Error retrieving timetable. Please try again.' });
            setTimeout(() => sendMainMenu(sock, from), 1000);
          }
        } else {
          const nextState = state.state.replace('section', 'subject');
          await sendSubjectMenu(sock, from, selectedSection, nextState);
        }
      } else {
        await handleInvalidInput();
      }
      break;

    case 'where_subject':
      const whereSubjectIndex = parseInt(command) - 1;
      if (whereSubjectIndex >= 0 && whereSubjectIndex < state.subjects.length) {
        const selectedSubject = state.subjects[whereSubjectIndex];
        console.log('Selected Subject:', selectedSubject);
        try {
          const data = await extractData(WORKBOOKS.CLASS_INFO, state.section);
          if (data.length==0) {
            await sock.sendMessage(from, { text: 'Venue information not found.' });
            return sendMainMenu(sock, from);
          }
          const headerRow = data[0];
          const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
          const venueIndex = headerRow.findIndex(col => col.toLowerCase() === 'venue');
          
          if (subjectIndex === -1 || venueIndex === -1) {
            await sock.sendMessage(from, { text: 'Venue information not properly formatted in the sheet.' });
            return sendMainMenu(sock, from);
          }
          
          const subjectRow = data.slice(1).find(row => row[subjectIndex] === selectedSubject);
          if (subjectRow && subjectRow[venueIndex]) {
            await sock.sendMessage(from, { 
              text: `Venue for ${selectedSubject}: ${subjectRow[venueIndex]}\n\n0. Back to Main Menu` 
            });
          } else {
            await sock.sendMessage(from, { text: `Venue not found for ${selectedSubject}.` });
          }
        } catch (error) {
          console.error('Error fetching venue:', error);
          await sock.sendMessage(from, { text: 'Error retrieving venue information. Please try again.' });
        }
      } else if (command === '0') {
        return sendMainMenu(sock, from);
      } else {
        await handleInvalidInput();
      }
      break;

    case 'when_subject':
      const whenSubjectIndex = parseInt(command) - 1;
      if (whenSubjectIndex >= 0 && whenSubjectIndex < state.subjects.length) {
        const selectedSubject = state.subjects[whenSubjectIndex];

        try {
          const data = await extractData(WORKBOOKS.CLASS_INFO, state.section);
          if (!data || data.length <= 1) {
            await sock.sendMessage(from, { text: 'Class time information not found.' });
            return sendMainMenu(sock, from);
          }

          const headerRow = data[0];
          const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
          const timeIndex = headerRow.findIndex(col => col.toLowerCase() === 'time');
          const dayIndex = headerRow.findIndex(col => col.toLowerCase() === 'day');

          if (subjectIndex === -1 || timeIndex === -1 || dayIndex === -1) {
            await sock.sendMessage(from, { text: 'Class time information not properly formatted in the sheet. Missing "Code", "Day", or "Time" column.' });
            return sendMainMenu(sock, from);
          }

          const subjectRows = data.slice(1).filter(row => row[subjectIndex] === selectedSubject);

          if (subjectRows.length > 0) {
            let messageContent = `Class times for ${selectedSubject}:\n\n`;
            subjectRows.forEach(row => {
              const day = row[dayIndex];
              const time = row[timeIndex];
              if (day && time) {
                messageContent += `- ${day} ${time}\n`;
              }
            });
            messageContent += "\n0. Back to Main Menu";
            await sock.sendMessage(from, { text: messageContent });
          } else {
            await sock.sendMessage(from, { text: `Class time not found for ${selectedSubject}.` });
             setTimeout(() => sendMainMenu(sock, from), 1000);
          }
        } catch (error) {
          console.error('Error fetching class time:', error);
          await sock.sendMessage(from, { text: 'Error retrieving class time information. Please try again.' });
           setTimeout(() => sendMainMenu(sock, from), 1000);
        }
      } else if (command === '0') {
        return sendMainMenu(sock, from);
      } else {
        await handleInvalidInput();
      }
      break;

    case 'seating_subject':
      const seatingSubjectIndex = parseInt(command) - 1;
      if (seatingSubjectIndex >= 0 && seatingSubjectIndex < state.subjects.length) {
        const selectedSubject = state.subjects[seatingSubjectIndex];
        
        try {
          const data = await extractData(WORKBOOKS.CLASS_INFO, state.section);
          if (data.length==0) {
            await sock.sendMessage(from, { text: 'Seating plan information not found.' });
            return sendMainMenu(sock, from);
          }
          
          const headerRow = data[0];
          const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
          const seatingPlanIndex = headerRow.findIndex(col => col.toLowerCase() === 'seating_plan');
          if (subjectIndex === -1 || seatingPlanIndex === -1) {
            await sock.sendMessage(from, { text: 'Seating plan information not properly formatted in the sheet.' });
            return sendMainMenu(sock, from);
          }
          
          const subjectRow = data.slice(1).find(row => row[subjectIndex] === selectedSubject);
          if (subjectRow && subjectRow[seatingPlanIndex]) {
            const imageUrl = subjectRow[seatingPlanIndex];
            const imagePath = path.join(__dirname, 'temp', `seating_${selectedSubject}.jpg`);
            
            if (!fs.existsSync(imagePath)) {
              fs.mkdirSync(path.dirname(imagePath), { recursive: true });
              await downloadImage(imageUrl, imagePath);
            }
            
            await sock.sendMessage(from, { 
              image: { url: imagePath },
              caption: `Seating Plan for ${selectedSubject}` 
            });
            setTimeout(() => {
              sock.sendMessage(from, { text: "0. Back to Main Menu" });
            }, 500);
          } else {
            await sock.sendMessage(from, { text: `Seating plan not found for ${selectedSubject}.` });
          }
        } catch (error) {
          console.error('Error fetching seating plan:', error);
          await sock.sendMessage(from, { text: 'Error retrieving seating plan. Please try again.' });
        }
      } else if (command === '0') {
        return sendMainMenu(sock, from);
      } else {
        await handleInvalidInput();
      }
      break;
    case 'office_subject':
    case 'tut_subject':
      const subjectIndex = parseInt(command) - 1;
      if (subjectIndex >= 0 && subjectIndex < DEFAULT_SUBJECTS.length) {
        const selectedSubject = DEFAULT_SUBJECTS[subjectIndex];
        const nextState = state.state === 'office_subject' ? 'office_prof' : 'tut_prof';
        await sendProfMenu(sock, from, selectedSubject, nextState);
      } else {
        await handleInvalidInput();
      }
      break;

    case 'office_prof':
      const officeProfIndex = parseInt(command) - 1;
      if (officeProfIndex >= 0 && officeProfIndex < state.professors.length) {
        const selectedProf = state.professors[officeProfIndex];
        
        try {
          const data = await extractData(WORKBOOKS.PROF_INFO, state.subject);
          if (!data || data.length <= 1) {
            await sock.sendMessage(from, { text: 'Office hours information not found.' });
            return sendMainMenu(sock, from);
          }
          
          const headerRow = data[0];
          const profIndex = headerRow.findIndex(col => col.toLowerCase() === 'prof');
          const officeHoursIndex = headerRow.findIndex(col => 
            col.toLowerCase() === 'office hours' ||
            col.toLowerCase() === 'officehours'
          );
          
          if (profIndex === -1 || officeHoursIndex === -1) {
            await sock.sendMessage(from, { text: 'Office hours information not properly formatted in the sheet.' });
            return sendMainMenu(sock, from);
          }
          
          const profRow = data.slice(1).find(row => row[profIndex] === selectedProf);
          if (profRow && profRow[officeHoursIndex]) {
            await sock.sendMessage(from, { 
              text: `Office Hours for ${selectedProf}: ${profRow[officeHoursIndex]}\n\n0. Back to Main Menu` 
            });
          } else {
            await sock.sendMessage(from, { text: `Office hours not found for ${selectedProf}.` });
          }
        } catch (error) {
          console.error('Error fetching office hours:', error);
          await sock.sendMessage(from, { text: 'Error retrieving office hours information. Please try again.' });
        }
      } else if (command === '0') {
        return sendMainMenu(sock, from);
      } else {
        await handleInvalidInput();
      }
      break;

    case 'tut_prof':
      const tutProfIndex = parseInt(command) - 1;
      if (tutProfIndex >= 0 && tutProfIndex < state.professors.length) {
        const selectedProf = state.professors[tutProfIndex];
        
        try {
          const data = await extractData(WORKBOOKS.PROF_INFO, state.subject);
          if (!data || data.length <= 1) {
            await sock.sendMessage(from, { text: 'Tutorial timing information not found.' });
            return sendMainMenu(sock, from);
          }
          
          const headerRow = data[0];
          const profIndex = headerRow.findIndex(col => col.toLowerCase() === 'prof');
          const tutTimingsIndex = headerRow.findIndex(col => 
            col.toLowerCase() === 'tut timings' ||
            col.toLowerCase() === 'tuttimings'
          );
          
          if (profIndex === -1 || tutTimingsIndex === -1) {
            await sock.sendMessage(from, { text: 'Tutorial timing information not properly formatted in the sheet.' });
            return sendMainMenu(sock, from);
          }
          
          const profRow = data.slice(1).find(row => row[profIndex] === selectedProf);
          if (profRow && profRow[tutTimingsIndex]) {
            await sock.sendMessage(from, { 
              text: `Tutorial Timings for ${selectedProf}: ${profRow[tutTimingsIndex]}\n\n0. Back to Main Menu` 
            });
          } else {
            await sock.sendMessage(from, { text: `Tutorial timings not found for ${selectedProf}.` });
          }
        } catch (error) {
          console.error('Error fetching tutorial timings:', error);
          await sock.sendMessage(from, { text: 'Error retrieving tutorial timing information. Please try again.' });
        }
      } else if (command === '0') {
        return sendMainMenu(sock, from);
      } else {
        await handleInvalidInput();
      }
      break;

    default:
      await sendMainMenu(sock, from);
      break;
  }
};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
 
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
      preloadAllData();
      setupCacheRefreshTimer();
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

fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });

startBot().catch((err) => {
  console.error('Error starting bot:', err);
});