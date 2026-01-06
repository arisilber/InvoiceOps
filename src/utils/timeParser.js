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
    
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return dateString; // Return original if parsing fails
    
    // Format as MM/DD/YYYY
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${monthStr}/${dayStr}/${year}`;
};

