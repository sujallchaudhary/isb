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

const getExamVenue = async (subject, pgid) => {
  try {
    const data = await extractData(WORKBOOKS.EXAM_SCHEDULE, subject);
    if (data.length === 0) {
      return { success: false, message: 'Exam venue information not found.' };
    }
    
    const headerRow = data[0];
    const fromPgidIndex = headerRow.findIndex(col => col.toLowerCase() === 'from_pgid');
    const toPgidIndex = headerRow.findIndex(col => col.toLowerCase() === 'to_pgid');
    const venueIndex = headerRow.findIndex(col => col.toLowerCase() === 'venue');
    
    if (fromPgidIndex === -1 || toPgidIndex === -1 || venueIndex === -1) {
      return { success: false, message: 'Exam venue information not properly formatted in the sheet.' };
    }
    const pgidNum = parseInt(pgid);
    if (isNaN(pgidNum)) {
      return { success: false, message: 'Invalid PGID format. Please enter a numeric PGID.' };
    }
    const matchingRow = data.slice(1).find(row => {
      const fromPgid = parseInt(row[fromPgidIndex]);
      const toPgid = parseInt(row[toPgidIndex]);
      return !isNaN(fromPgid) && !isNaN(toPgid) && pgidNum >= fromPgid && pgidNum <= toPgid;
    });
    
    if (matchingRow && matchingRow[venueIndex]) {
      return { success: true, data: matchingRow[venueIndex] };
    } else {
      return { success: false, message: `No venue information found for PGID ${pgid}.` };
    }
  } catch (error) {
    console.error('Error fetching exam venue:', error);
    return { success: false, message: 'Error retrieving exam venue information.' };
  }
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

const getSarovarMenu = async (mealType, day) => {
  try {
    const data = await extractData(WORKBOOKS.SAROVAR_MENU, 'Sheet1');
    if (data.length === 0) {
      return { success: false, message: 'Menu information not found.' };
    }

    const headerRow = data[0];
    const dateIndex = headerRow.findIndex(col => col.toLowerCase() === 'date');
    const breakfastIndex = headerRow.findIndex(col => col.toLowerCase() === 'breakfast');
    const lunchIndex = headerRow.findIndex(col => col.toLowerCase() === 'lunch');
    const dinnerIndex = headerRow.findIndex(col => col.toLowerCase() === 'dinner');
    
    if (dateIndex === -1 || breakfastIndex === -1 || lunchIndex === -1 || dinnerIndex === -1) {
      return { success: false, message: 'Menu information not properly formatted in the sheet.' };
    }
    
    // Get today's and tomorrow's dates in DD-MMM format
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date) => {
      const day = date.getDate();
      const month = date.toLocaleString('default', { month: 'short' });
      return `${day}-${month}`;
    };
    
    const todayFormatted = formatDate(today);
    const tomorrowFormatted = formatDate(tomorrow);
    
    // Find the target date based on user selection
    const targetDate = day === 'today' ? todayFormatted : tomorrowFormatted;
    
    // Find rows for the target date
    let menuItems = [];
    let currentDate = '';
    let collectingItems = false;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Check if this is a date row
      if (row[dateIndex] && row[dateIndex].trim()) {
        currentDate = row[dateIndex];
        // Start collecting items if this is our target date
        collectingItems = currentDate.includes(targetDate);
      }
      
      // If we're collecting items for our target date and this row has meal data
      if (collectingItems && row.length > 0) {
        // If we hit an empty row or another date row, stop collecting
        if (!row[0] && !row[1] && !row[2] && !row[3]) {
          collectingItems = false;
        } else {
          // Add meal item based on requested type
          let mealItem = null;
          if (mealType === 'breakfast' && row[breakfastIndex]) {
            mealItem = row[breakfastIndex];
          } else if (mealType === 'lunch' && row[lunchIndex]) {
            mealItem = row[lunchIndex];
          } else if (mealType === 'dinner' && row[dinnerIndex]) {
            mealItem = row[dinnerIndex];
          }
          
          if (mealItem) {
            menuItems.push(mealItem);
          }
        }
      }
    }
    
    if (menuItems.length === 0) {
      return { success: false, message: `No ${mealType} menu found for ${day} (${targetDate}).` };
    }
    
    return { success: true, data: menuItems };
  } catch (error) {
    console.error('Error fetching Sarovar menu:', error);
    return { success: false, message: 'Error retrieving Sarovar menu information.' };
  }
};

module.exports = {
  getVenueInfo,
  getClassTimeInfo,
  getSeatingPlan,
  getTermTimetable,
  getOfficeHours,
  getTutorialTimings,
  getExamSchedule,
  getExamVenue,
  getSarovarMenu
};