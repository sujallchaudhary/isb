const { SECTIONS, TERMS, DEFAULT_SUBJECTS } = require('../config/constants');
const { setConversationState } = require('../models/conversation');
const { extractData } = require('../services/sheets');
const WORKBOOKS = require('../config/workbooks');

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
  setConversationState(from, { state: 'main_menu' });
};

const sendSectionMenu = async (sock, from, nextState, contextData = {}) => {
  let messageContent = "Select your section buddy:\n\n";
  
  for (let i = 0; i < SECTIONS.length; i++) {
    messageContent += `${i + 1}. ${SECTIONS[i]}\n`;
  }
  messageContent += "\nNumeric input like above: 1 or 2 or 3 so on..";

  await sock.sendMessage(from, { text: messageContent });
  setConversationState(from, { state: nextState, ...contextData });
};

const sendTermMenu = async (sock, from) => {
  let messageContent = "Select your term buddy:\n\n";
  
  for (let i = 0; i < TERMS.length; i++) {
    messageContent += `${i + 1}. ${TERMS[i]}\n`;
  }
  messageContent += "\nNumeric input like above: 1 or 2 or 3 so on..";

  await sock.sendMessage(from, { text: messageContent });
  setConversationState(from, { state: 'term_menu' });
};

const sendSubjectMenu = async (sock, from, section, nextState) => {
  try {
    const data = await extractData(WORKBOOKS.CLASS_INFO, section);
    if(data.length === 0) {
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
    setConversationState(from, { 
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
    setConversationState(from, { 
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

module.exports = {
  sendMainMenu,
  sendSectionMenu,
  sendTermMenu,
  sendSubjectMenu,
  sendProfMenu
};