/**
 * Parses time input and converts to minutes, rounding up to nearest 5 minutes
 * Supports:
 * - Decimal hours (e.g., 0.75 = 45 minutes, 1.5 = 90 minutes)
 * - Hours:minutes format (e.g., 1:30 = 90 minutes)
 * - Minutes as integer (e.g., 90 = 90 minutes)
 * 
 * @param {string|number} value - Time input value
 * @returns {number} Minutes, rounded up to nearest 5
 */
export const parseTimeToMinutes = (value) => {
    if (!value && value !== 0) return 0;
    
    let minutes = 0;
    
    // Handle string input
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0;
        
        // Check for HH:MM format (e.g., "1:30")
        if (trimmed.includes(':')) {
            const parts = trimmed.split(':');
            const hours = parseFloat(parts[0]) || 0;
            const minutesPart = parseFloat(parts[1]) || 0;
            minutes = hours * 60 + minutesPart;
        }
        // Check for decimal hours (e.g., "0.75", "1.5", "0,75")
        else if (trimmed.includes('.') || trimmed.includes(',')) {
            // Handle both . and , as decimal separator
            const decimalValue = parseFloat(trimmed.replace(',', '.'));
            if (!isNaN(decimalValue)) {
                minutes = decimalValue * 60;
            } else {
                // Fallback to integer minutes
                minutes = parseInt(trimmed) || 0;
            }
        }
        // Integer - could be minutes or hours
        // If it's a small number (< 10), assume hours; otherwise minutes
        else {
            const intValue = parseInt(trimmed);
            if (!isNaN(intValue)) {
                // Small integers (< 10) are likely hours, larger ones are minutes
                minutes = intValue < 10 ? intValue * 60 : intValue;
            } else {
                minutes = 0;
            }
        }
    }
    // Handle number input
    else if (typeof value === 'number') {
        // If it's a decimal, treat as hours
        if (value % 1 !== 0) {
            minutes = value * 60;
        }
        // If it's a small integer (< 10), assume hours; otherwise minutes
        else {
            minutes = value < 10 ? value * 60 : value;
        }
    }
    
    // Round up to nearest 5 minutes
    return Math.ceil(minutes / 5) * 5;
};

/**
 * Formats minutes to a human-readable string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted string (e.g., "1h 30m" or "45m")
 */
export const formatMinutes = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

/**
 * Formats a date string (YYYY-MM-DD) to MM/DD/YYYY format
 * Parses the date as a local date to avoid timezone issues.
 * When using new Date("YYYY-MM-DD"), JavaScript interprets it as UTC midnight,
 * which can cause off-by-one errors when converted to local time.
 * 
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date string in MM/DD/YYYY format
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // Handle ISO format strings (e.g., "2025-11-05T00:00:00.000Z")
    const datePart = dateString.split('T')[0];
    
    // Validate the date part is in YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        console.warn('Invalid date format in formatDate:', dateString);
        return '';
    }
    
    // Parse date string as local date to avoid timezone issues
    const parts = datePart.split('-');
    if (parts.length !== 3) {
        console.warn('Invalid date format in formatDate:', dateString);
        return '';
    }
    
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    
    // Check if any part is NaN or invalid
    if (isNaN(year) || isNaN(month) || isNaN(day) || 
        month < 1 || month > 12 || day < 1 || day > 31) {
        console.warn('Invalid date values in formatDate:', dateString, { year, month, day });
        return '';
    }
    
    // Format as MM/DD/YYYY
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${monthStr}/${dayStr}/${year}`;
};

/**
 * Gets the local date string (YYYY-MM-DD) from a Date object
 * This ensures we get the date in the user's local timezone, not UTC
 * 
 * @param {Date} date - Date object (defaults to current date)
 * @returns {string} Date string in YYYY-MM-DD format (local timezone)
 */
export const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Converts a UTC date string (YYYY-MM-DD) to local date string (YYYY-MM-DD)
 * This is useful when displaying dates from the backend that are stored in UTC
 * 
 * @param {string} utcDateString - Date string in YYYY-MM-DD format or ISO format (UTC)
 * @returns {string} Date string in YYYY-MM-DD format (local timezone)
 */
export const utcDateToLocalDateString = (utcDateString) => {
    if (!utcDateString) return '';
    
    // Extract date part if it's an ISO string (e.g., "2025-01-26T00:00:00.000Z")
    const datePart = utcDateString.split('T')[0];
    
    // Validate the date part is in YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        console.warn('Invalid date format:', utcDateString);
        return '';
    }
    
    // Parse the UTC date string as UTC midnight
    const utcDate = new Date(datePart + 'T00:00:00Z');
    
    // Check if date is valid
    if (isNaN(utcDate.getTime())) {
        console.warn('Invalid date:', utcDateString);
        return '';
    }
    
    // Convert to local date string
    return getLocalDateString(utcDate);
};

/**
 * Converts a local date string (YYYY-MM-DD) to UTC date string (YYYY-MM-DD)
 * This is useful when submitting dates to the backend that should be stored in UTC
 * 
 * @param {string} localDateString - Date string in YYYY-MM-DD format (local timezone)
 * @returns {string} Date string in YYYY-MM-DD format (UTC)
 */
export const localDateStringToUtc = (localDateString) => {
    if (!localDateString) return '';
    
    // Parse the local date string and create a Date at midnight local time
    const [year, month, day] = localDateString.split('-').map(Number);
    const localDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    
    // Convert to UTC and get the date string
    const utcYear = localDate.getUTCFullYear();
    const utcMonth = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const utcDay = String(localDate.getUTCDate()).padStart(2, '0');
    
    return `${utcYear}-${utcMonth}-${utcDay}`;
};

