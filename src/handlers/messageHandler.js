const fs = require('fs');
const path = require('path');
const { getConversationState, setConversationState } = require('../models/conversation');
const { SECTIONS, DEFAULT_SUBJECTS, TERMS } = require('../config/constants');
const {sendMainMenu,sendSectionMenu,sendTermMenu,sendSubjectMenu,sendProfMenu} = require('./menuHandler');
const {getVenueInfo,getClassTimeInfo,getSeatingPlan,getTermTimetable,getOfficeHours,getTutorialTimings} = require('./dataHandler');

const handleInvalidInput = async (sock, from) => {
  await sock.sendMessage(from, { 
    text: "Hmm.. I am not quite sure I understand, could you please provide a numeric output like 1 or 2 and so on..?" 
  });
};

const handleWhereSubject = async (sock, from, command, state) => {
  const whereSubjectIndex = parseInt(command) - 1;
  if (whereSubjectIndex >= 0 && whereSubjectIndex < state.subjects.length) {
    const selectedSubject = state.subjects[whereSubjectIndex];
    const result = await getVenueInfo(state.section, selectedSubject);
    
    if (result.success) {
      await sock.sendMessage(from, { 
        text: `Venue for ${selectedSubject}: ${result.data}\n\n0. Back to Main Menu` 
      });
    } else {
      await sock.sendMessage(from, { text: result.message });
      setTimeout(() => sendMainMenu(sock, from), 1000);
    }
  } else if (command === '0') {
    return sendMainMenu(sock, from);
  } else {
    await handleInvalidInput(sock, from);
  }
};

const handleWhenSubject = async (sock, from, command, state) => {
  const whenSubjectIndex = parseInt(command) - 1;
  if (whenSubjectIndex >= 0 && whenSubjectIndex < state.subjects.length) {
    const selectedSubject = state.subjects[whenSubjectIndex];
    const result = await getClassTimeInfo(state.section, selectedSubject);
    
    if (result.success) {
      let messageContent = `Class times for ${selectedSubject}:\n\n`;
      result.data.forEach(time => {
        messageContent += `- ${time}\n`;
      });
      messageContent += "\n0. Back to Main Menu";
      await sock.sendMessage(from, { text: messageContent });
    } else {
      await sock.sendMessage(from, { text: result.message });
      setTimeout(() => sendMainMenu(sock, from), 1000);
    }
  } else if (command === '0') {
    return sendMainMenu(sock, from);
  } else {
    await handleInvalidInput(sock, from);
  }
};

const handleSeatingSubject = async (sock, from, command, state) => {
  const seatingSubjectIndex = parseInt(command) - 1;
  if (seatingSubjectIndex >= 0 && seatingSubjectIndex < state.subjects.length) {
    const selectedSubject = state.subjects[seatingSubjectIndex];
    const result = await getSeatingPlan(state.section, selectedSubject);
    
    if (result.success) {
      await sock.sendMessage(from, { 
        image: { url: result.data },
        caption: `Seating Plan for ${selectedSubject}` 
      });
      setTimeout(() => {
        sock.sendMessage(from, { text: "0. Back to Main Menu" });
      }, 500);
    } else {
      await sock.sendMessage(from, { text: result.message });
      setTimeout(() => sendMainMenu(sock, from), 1000);
    }
  } else if (command === '0') {
    return sendMainMenu(sock, from);
  } else {
    await handleInvalidInput(sock, from);
  }
};

const handleOfficeProf = async (sock, from, command, state) => {
  // For direct selection from office_term state
  if (state.state === 'office_prof' && state.selectedTerm) {
    const officeProfIndex = parseInt(command) - 1;
    if (officeProfIndex >= 0 && officeProfIndex < state.professors.length) {
      const selectedProf = state.professors[officeProfIndex];
      const result = await getOfficeHours(state.selectedTerm, selectedProf);
      
      if (result.success) {
        await sock.sendMessage(from, { 
          text: `Office Hours for ${selectedProf}: ${result.data}\n\n0. Back to Main Menu` 
        });
      } else {
        await sock.sendMessage(from, { text: result.message });
        setTimeout(() => sendMainMenu(sock, from), 1000);
      }
    } else if (command === '0') {
      return sendMainMenu(sock, from);
    } else {
      await handleInvalidInput(sock, from);
    }
  } 
  // For the original flow (backward compatibility)
  else {
    const officeProfIndex = parseInt(command) - 1;
    if (officeProfIndex >= 0 && officeProfIndex < state.professors.length) {
      const selectedProf = state.professors[officeProfIndex];
      const result = await getOfficeHours(state.subject, selectedProf);
      
      if (result.success) {
        await sock.sendMessage(from, { 
          text: `Office Hours for ${selectedProf}: ${result.data}\n\n0. Back to Main Menu` 
        });
      } else {
        await sock.sendMessage(from, { text: result.message });
        setTimeout(() => sendMainMenu(sock, from), 1000);
      }
    } else if (command === '0') {
      return sendMainMenu(sock, from);
    } else {
      await handleInvalidInput(sock, from);
    }
  }
};

const handleTutProf = async (sock, from, command, state) => {
  const tutProfIndex = parseInt(command) - 1;
  if (tutProfIndex >= 0 && tutProfIndex < state.professors.length) {
    const selectedProf = state.professors[tutProfIndex];
    const result = await getTutorialTimings(state.subject, selectedProf);
    
    if (result.success) {
      await sock.sendMessage(from, { 
        text: `Tutorial Timings for ${selectedProf}: ${result.data}\n\n0. Back to Main Menu` 
      });
    } else {
      await sock.sendMessage(from, { text: result.message });
      setTimeout(() => sendMainMenu(sock, from), 1000);
    }
  } else if (command === '0') {
    return sendMainMenu(sock, from);
  } else {
    await handleInvalidInput(sock, from);
  }
};

const handleTermSection = async (sock, from, command, state) => {
  const sectionIndex = parseInt(command) - 1;
  if (sectionIndex >= 0 && sectionIndex < SECTIONS.length) {
    const selectedSection = SECTIONS[sectionIndex];
    
    if (!state.selectedTerm) {
      console.error('Term is not defined in state:', state);
      await sock.sendMessage(from, { text: 'Error: Term selection not found. Please try again.' });
      return sendTermMenu(sock, from);
    }
    
    const result = await getTermTimetable(state.selectedTerm, selectedSection);
    
    if (result.success) {
      await sock.sendMessage(from, { 
        image: { url: result.data },
        caption: `${state.selectedTerm} Timetable for ${selectedSection}` 
      });
      setTimeout(() => {
        sock.sendMessage(from, { text: "0. Back to Main Menu" });
      }, 500);
    } else {
      await sock.sendMessage(from, { text: result.message });
      setTimeout(() => sendMainMenu(sock, from), 1000);
    }
  } else {
    await handleInvalidInput(sock, from);
  }
};

const handleMessage = async (sock, from, messageText) => {
  const command = messageText.toLowerCase().trim();
  const state = getConversationState(from);

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
        await sendTermMenu(sock, from,'term_menu');
      } else if (command === '5') {
        await sendTermMenu(sock, from,'office_term');
      } else if (command === '6') {
        await sock.sendMessage(from, { text: "Select your subject buddy:\n\n1. WACM\n2. FADM\n3. LSAT\n4. SMDM\n5. MGEC\n\nNumeric input like above: 1 or 2 or 3 so on.." });
        setConversationState(from, { state: 'tut_subject' });
      } else {
        await handleInvalidInput(sock, from);
      }
      break;

    case 'term_menu':
      const termIndex = parseInt(command) - 1;
      if (termIndex >= 0 && termIndex < TERMS.length) {
        const selectedTerm = TERMS[termIndex];
        await sendSectionMenu(sock, from, 'term_section', { selectedTerm });
      } else {
        await handleInvalidInput(sock, from);
      }
      break;
      
    case 'office_term':
      const officeTermIndex = parseInt(command) - 1;
      if (officeTermIndex >= 0 && officeTermIndex < TERMS.length) {
        const selectedTerm = TERMS[officeTermIndex];
        await sendProfMenu(sock, from, selectedTerm, 'office_prof', { selectedTerm });
      } else {
        await handleInvalidInput(sock, from);
      }
      break;

    case 'where_section':
    case 'when_section':
    case 'seating_section':
    case 'term_section':
      if (state.state === 'term_section') {
        await handleTermSection(sock, from, command, state);
      } else {
        const sectionIndex = parseInt(command) - 1;
        if (sectionIndex >= 0 && sectionIndex < SECTIONS.length) {
          const selectedSection = SECTIONS[sectionIndex];
          const nextState = state.state.replace('section', 'subject');
          await sendSubjectMenu(sock, from, selectedSection, nextState);
        } else {
          await handleInvalidInput(sock, from);
        }
      }
      break;

    case 'where_subject':
      await handleWhereSubject(sock, from, command, state);
      break;

    case 'when_subject':
      await handleWhenSubject(sock, from, command, state);
      break;

    case 'seating_subject':
      await handleSeatingSubject(sock, from, command, state);
      break;

    case 'office_subject':
    case 'tut_subject':
      const subjectIndex = parseInt(command) - 1;
      if (subjectIndex >= 0 && subjectIndex < DEFAULT_SUBJECTS.length) {
        const selectedSubject = DEFAULT_SUBJECTS[subjectIndex];
        const nextState = state.state === 'office_subject' ? 'office_prof' : 'tut_prof';
        await sendProfMenu(sock, from, selectedSubject, nextState);
      } else {
        await handleInvalidInput(sock, from);
      }
      break;

    case 'office_prof':
      await handleOfficeProf(sock, from, command, state);
      break;

    case 'tut_prof':
      await handleTutProf(sock, from, command, state);
      break;

    default:
      await sendMainMenu(sock, from);
      break;
  }
};

module.exports = { handleMessage };