const { extractData } = require('../services/sheets');
const WORKBOOKS = require('../config/workbooks');

const getVenueInfo = async (section, subject) => {
  try {
    const data = await extractData(WORKBOOKS.CLASS_INFO, section);
    if (data.length === 0) {
      return { success: false, message: 'Venue information not found.' };
    }

    const headerRow = data[0];
    const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
    const venueIndex = headerRow.findIndex(col => col.toLowerCase() === 'venue');
    
    if (subjectIndex === -1 || venueIndex === -1) {
      return { success: false, message: 'Venue information not properly formatted in the sheet.' };
    }
    
    const subjectRow = data.slice(1).find(row => row[subjectIndex] === subject);
    if (subjectRow && subjectRow[venueIndex]) {
      return { success: true, data: subjectRow[venueIndex] };
    } else {
      return { success: false, message: `Venue not found for ${subject}.` };
    }
  } catch (error) {
    console.error('Error fetching venue:', error);
    return { success: false, message: 'Error retrieving venue information.' };
  }
};

const getClassTimeInfo = async (section, subject) => {
  try {
    const data = await extractData(WORKBOOKS.CLASS_INFO, section);
    if (!data || data.length <= 1) {
      return { success: false, message: 'Class time information not found.' };
    }

    const headerRow = data[0];
    const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
    const timeIndex = headerRow.findIndex(col => col.toLowerCase() === 'time');
    const dayIndex = headerRow.findIndex(col => col.toLowerCase() === 'day');

    if (subjectIndex === -1 || timeIndex === -1 || dayIndex === -1) {
      return { success: false, message: 'Class time information not properly formatted.' };
    }

    const subjectRows = data.slice(1).filter(row => row[subjectIndex] === subject);

    if (subjectRows.length > 0) {
      const classTimes = subjectRows.map(row => {
        const day = row[dayIndex];
        const time = row[timeIndex];
        if (day && time) {
          return `${day} ${time}`;
        }
        return null;
      }).filter(Boolean);
      
      return { success: true, data: classTimes };
    } else {
      return { success: false, message: `Class time not found for ${subject}.` };
    }
  } catch (error) {
    console.error('Error fetching class time:', error);
    return { success: false, message: 'Error retrieving class time information.' };
  }
};

const getSeatingPlan = async (section, subject) => {
  try {
    const data = await extractData(WORKBOOKS.CLASS_INFO, section);
    if (data.length === 0) {
      return { success: false, message: 'Seating plan information not found.' };
    }
    
    const headerRow = data[0];
    const subjectIndex = headerRow.findIndex(col => col.toLowerCase() === 'code');
    const seatingPlanIndex = headerRow.findIndex(col => col.toLowerCase() === 'seating_plan');
    
    if (subjectIndex === -1 || seatingPlanIndex === -1) {
      return { success: false, message: 'Seating plan information not properly formatted.' };
    }
    
    const subjectRow = data.slice(1).find(row => row[subjectIndex] === subject);
    if (subjectRow && subjectRow[seatingPlanIndex]) {
      const imageUrl = subjectRow[seatingPlanIndex];
        return { success: true, data: imageUrl};
    } else {
      return { success: false, message: `Seating plan not found for ${subject}.` };
    }
  } catch (error) {
    console.error('Error fetching seating plan:', error);
    return { success: false, message: 'Error retrieving seating plan information.' };
  }
};

const getExamSchedule = ()=>{
  const imageUrl = "https://sdrive.blr1.cdn.digitaloceanspaces.com/files/f40c13370969318da4f44e5e74fe568a.jpg";
    return { success: true, data: imageUrl };
}

const getTermTimetable = async (term, section) => {
  try {
    const data = await extractData(WORKBOOKS.TERM_TIMETABLE, term);
    if (data.length === 0) {
      return { success: false, message: `No timetable data found for ${term}.` };
    }
    
    const headerRow = data[0];
    const sectionIndex = headerRow.findIndex(col => col.toLowerCase() === 'section');
    const timetableIndex = headerRow.findIndex(col => col.toLowerCase() === 'timetable');
    
    if (sectionIndex === -1 || timetableIndex === -1) {
      return { success: false, message: 'Timetable data not properly formatted.' };
    }
    
    const sectionRow = data.slice(1).find(row => 
      row[sectionIndex] && row[sectionIndex].toLowerCase() === section.toLowerCase()
    );
    
    if (sectionRow && sectionRow[timetableIndex]) {
      const imageUrl = sectionRow[timetableIndex];
        return { success: true, data: imageUrl };
    } else {
      return { success: false, message: `Timetable image not found for ${section} in ${term}.` };
    }
  } catch (error) {
    console.error('Error fetching timetable:', error);
    return { success: false, message: 'Error retrieving timetable information.' };
  }
};

const getOfficeHours = async (term, professor) => {
  try {
    const data = await extractData(WORKBOOKS.PROF_INFO, term);
    if (data.length === 0) {
      return { success: false, message: 'Office hours information not found.' };
    }
    
    const headerRow = data[0];
    const profIndex = headerRow.findIndex(col => col.toLowerCase() === 'professor');
    const officeHoursIndex = headerRow.findIndex(col => 
      col.toLowerCase() === 'office hours' ||
      col.toLowerCase() === 'officehours'
    );
    
    if (profIndex === -1 || officeHoursIndex === -1) {
      return { success: false, message: 'Office hours information not properly formatted.' };
    }
    
    const profRow = data.slice(1).find(row => row[profIndex] === professor);
    if (profRow && profRow[officeHoursIndex]) {
      return { success: true, data: profRow[officeHoursIndex] };
    } else {
      return { success: false, message: `Office hours not found for ${professor} in ${term}.` };
    }
  } catch (error) {
    console.error('Error fetching office hours:', error);
    return { success: false, message: 'Error retrieving office hours information.' };
  }
};

const getTutorialTimings = async (subject, professor) => {
  try {
    const data = await extractData(WORKBOOKS.PROF_INFO, subject);
    if (!data || data.length <= 1) {
      return { success: false, message: 'Tutorial timing information not found.' };
    }
    
    const headerRow = data[0];
    const profIndex = headerRow.findIndex(col => col.toLowerCase() === 'professor');
    const tutTimingsIndex = headerRow.findIndex(col => col.toLowerCase() === 'tut');
    
    if (profIndex === -1 || tutTimingsIndex === -1) {
      return { success: false, message: 'Tutorial timing information not properly formatted.' };
    }
    
    const profRow = data.slice(1).find(row => row[profIndex] === professor);
    if (profRow && profRow[tutTimingsIndex]) {
      return { success: true, data: profRow[tutTimingsIndex] };
    } else {
      return { success: false, message: `Tutorial timings not found for ${professor}.` };
    }
  } catch (error) {
    console.error('Error fetching tutorial timings:', error);
    return { success: false, message: 'Error retrieving tutorial timing information.' };
  }
};

module.exports = {
  getVenueInfo,
  getClassTimeInfo,
  getSeatingPlan,
  getTermTimetable,
  getOfficeHours,
  getTutorialTimings,
  getExamSchedule
};