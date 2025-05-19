const { SECTIONS, TERMS, DEFAULT_SUBJECTS } = require('../config/constants');
const { setConversationState } = require('../models/conversation');
const { extractData } = require('../services/sheets');
const WORKBOOKS = require('../config/workbooks');

const sendMainMenu = async (sock, from) => {
  let messageContent = "Hey Buddy! 😎🎓 How can I help you today?\n\n";
  messageContent += "1. Where is my class\n";
  messageContent += "2. When is my class\n";
  messageContent += "3. Seating Plan for Class\n";
  messageContent += "4. Term Timetable\n";
  messageContent += "5. Exam Schedule\n";
  messageContent += "6. Exam Venue\n";
  messageContent += "7. Prof Office Location\n";
  messageContent += "8. Tut Timings\n\n";
  messageContent += "Numeric input like above: 1 or 2 or 3 and so on..🔢\n\n";
  messageContent += "0 to go back to main menu";


  await sock.sendMessage(from, { text: messageContent });
  setConversationState(from, { state: 'main_menu' });
};

const sendSectionMenu = async (sock, from, nextState, contextData = {}) => {
  let messageContent = "Select your section buddy 🏫\n\n";
  
  for (let i = 0; i < SECTIONS.length; i++) {
    messageContent += `${i + 1}. ${SECTIONS[i]}\n`;
  }
  messageContent += "\nNumeric input like above: 1 or 2 or 3 and so on..🔢\n\n0 to go back to main menu";

  await sock.sendMessage(from, { text: messageContent });
  setConversationState(from, { state: nextState, ...contextData });
};

const sendTermMenu = async (sock, from,next) => {
  let messageContent = "Select your term buddy: 📆\n\n";
  
  for (let i = 0; i < TERMS.length; i++) {
    messageContent += `${i + 1}. ${TERMS[i]}\n`;
  }
  messageContent += "\nNumeric input like above: 1 or 2 or 3 and so on..🔢\n\n0 to go back to main menu";

  await sock.sendMessage(from, { text: messageContent });
  setConversationState(from, { state: next });
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
    
    let messageContent = "Select your subject: 📚\n\n";
    for (let i = 0; i < subjects.length; i++) {
      messageContent += `${i + 1}. ${subjects[i]}\n`;
    }
    messageContent += "\nNumeric input like above: 1 or 2 or 3 and so on..🔢";
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
    
    if (data.length === 0) {
      await sock.sendMessage(from, { text: 'No professors found for this subject.' });
      return sendMainMenu(sock, from);
    }

    const headerRow = data[0];
    const profIndex = headerRow.findIndex(col => col.toLowerCase() === 'professor');
    
    if (profIndex === -1) {
      await sock.sendMessage(from, { text: 'Professor information not found in the sheet.' });
      return sendMainMenu(sock, from);
    }

    const professors = data.slice(1).map(row => row[profIndex]).filter(Boolean);
    
    let messageContent = "Select your prof: 👩‍🏫\n\n";
    for (let i = 0; i < professors.length; i++) {
      messageContent += `${i + 1}. ${professors[i]}\n`;
    }
    messageContent += "\nNumeric input like above: 1 or 2 or 3 and so on..🔢";
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

const sendExamSubjectMenu = async (sock, from) => {
  let messageContent = "When exam venue clicked, enter the exam subject buddy:\n\n";
  messageContent += "1. MGEC\n";
  messageContent += "2. SMDM3(G,H,I,J)\n";
  messageContent += "3. SMDM4(K,L)\n";
  messageContent += "4. LSAT3(G,I,K,L)\n";
  messageContent += "5. LSAT4(H,J)\n";
  messageContent += "6. FADM\n\n";
  messageContent += "Numeric input like above: 1 or 2 or 3 and so on..🔢\n\n";
  messageContent += "0. Back to Main Menu";

  await sock.sendMessage(from, { text: messageContent });
  setConversationState(from, { 
    state: 'exam_subject',
    examSubjects: ['MGEC', 'SMDM3(G,H,I,J)', 'SMDM4(K,L)', 'LSAT3(G,I,K,L)','LSAT4(H,J)','FADM']
  });
};

module.exports = {
  sendMainMenu,
  sendSectionMenu,
  sendTermMenu,
  sendSubjectMenu,
  sendProfMenu,
  sendExamSubjectMenu
};