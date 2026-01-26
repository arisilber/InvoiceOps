import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Search,
    Filter,
    Calendar as CalendarIcon,
    User,
    Briefcase,
    Edit2,
    Trash2,
    ChevronRight,
    ChevronDown,
    Download,
    Plus,
    X,
    Loader2,
    AlertCircle,
    FileText,
    Upload,
    ExternalLink,
    LayoutGrid,
    List,
    Timer as TimerIcon
} from 'lucide-react';
import api from '../services/api';
import LogTimeEntry from './LogTimeEntry';
import CreateInvoiceFromTimeEntriesModal from './CreateInvoiceFromTimeEntriesModal';
import CSVTimeEntryUpload from './CSVTimeEntryUpload';
import Timer from './Timer';
import { formatDate as formatDateUtil, utcDateToLocalDateString } from '../utils/timeParser';

const TimeEntryList = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [allEntries, setAllEntries] = useState([]); // For stats calculation
    const [clients, setClients] = useState([]);
    const [workTypes, setWorkTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        client_id: '',
        work_type_id: '',
        work_date_from: '',
        work_date_to: '',
        is_invoiced: '' // '' (all), 'true', 'false'
    });

    // View State
    const [showSummaryView, setShowSummaryView] = useState(false);
    const [showTimer, setShowTimer] = useState(false);
    const [expandedDates, setExpandedDates] = useState(new Set());
    const [expandedStats, setExpandedStats] = useState({
        last7Days: false,
        thisWeek: false
    });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isCSVUploadOpen, setIsCSVUploadOpen] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [entriesData, allEntriesData, clientsData, workTypesData] = await Promise.all([
                api.getTimeEntries(filters),
                api.getTimeEntries({}), // Fetch all entries for stats
                api.getClients(),
                api.getWorkTypes()
            ]);
            
            // Convert UTC dates from backend to local dates for display
            const convertEntryDates = (entry) => ({
                ...entry,
                work_date: entry.work_date ? utcDateToLocalDateString(entry.work_date) : entry.work_date
            });
            
            setEntries(entriesData.map(convertEntryDates));
            setAllEntries(allEntriesData.map(convertEntryDates));
            setClients(clientsData);
            setWorkTypes(workTypesData);
            setError(null);
        } catch (err) {
            console.error('Error fetching time entries:', err);
            setError('Failed to load time entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this time entry?')) return;

        try {
            await api.deleteTimeEntry(id);
            setEntries(entries.filter(e => e.id !== id));
            setAllEntries(allEntries.filter(e => e.id !== id));
        } catch (err) {
            alert('Failed to delete entry');
        }
    };

    const handleEdit = (entry) => {
        setEditingEntry(entry);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingEntry(null);
        setIsModalOpen(true);
    };

    const formatMinutes = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const parseDateKeyToLocalDate = (dateKey) => {
        if (!dateKey) return null;
        const [year, month, day] = dateKey.split('-').map(Number);
        if (!year || !month || !day) return null;
        return new Date(year, month - 1, day);
    };

    const toLocalDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const formatDayLabel = (dateKey) => {
        const dt = parseDateKeyToLocalDate(dateKey);
        if (!dt) return dateKey;
        const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
        return `${weekday} ${formatDateUtil(dateKey)}`;
    };

    const formatShortDate = (dateKey) => {
        const dt = parseDateKeyToLocalDate(dateKey);
        if (!dt) return dateKey;
        return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Calculate stats for last 7 days and this week
    const getTimeStats = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Last 7 days (including today)
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 days including today
        
        // This week (Monday to Sunday)
        const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days, else go to Monday
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Sunday
        weekEnd.setHours(23, 59, 59, 999);
        
        // Build a per-day minutes map using date keys (YYYY-MM-DD) to avoid timezone shifts
        const minutesByDateKey = new Map();
        allEntries.forEach((entry) => {
            const dateKey = entry?.work_date?.split('T')?.[0];
            if (!dateKey) return;
            const minutes = entry?.minutes_spent || 0;
            minutesByDateKey.set(dateKey, (minutesByDateKey.get(dateKey) || 0) + minutes);
        });

        const buildBreakdownBetween = (startDateInclusive, endDateInclusive) => {
            const rows = [];
            const start = new Date(startDateInclusive);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDateInclusive);
            end.setHours(0, 0, 0, 0);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateKey = toLocalDateKey(d);
                rows.push({
                    date: dateKey,
                    minutes: minutesByDateKey.get(dateKey) || 0
                });
            }
            return rows;
        };

        const last7DaysBreakdown = buildBreakdownBetween(sevenDaysAgo, today);

        // For "This week", only include days that have occurred so far (Mon..today)
        const weekEndDay = new Date(weekStart);
        weekEndDay.setDate(weekEndDay.getDate() + 6);
        weekEndDay.setHours(0, 0, 0, 0);
        const thisWeekEndDay = today <= weekEndDay ? today : weekEndDay;
        const thisWeekBreakdown = buildBreakdownBetween(weekStart, thisWeekEndDay);

        const last7DaysMinutes = last7DaysBreakdown.reduce((sum, r) => sum + (r.minutes || 0), 0);
        const thisWeekMinutes = thisWeekBreakdown.reduce((sum, r) => sum + (r.minutes || 0), 0);
        
        return {
            last7Days: last7DaysMinutes,
            thisWeek: thisWeekMinutes,
            last7DaysBreakdown,
            thisWeekBreakdown,
            last7DaysRange: {
                start: toLocalDateKey(sevenDaysAgo),
                end: toLocalDateKey(today)
            },
            thisWeekRange: {
                start: toLocalDateKey(weekStart),
                end: toLocalDateKey(thisWeekEndDay)
            }
        };
    };

    const timeStats = getTimeStats();

    // Calculate daily summary from filtered entries
    const getDailySummary = () => {
        const dailyTotals = {};
        entries.forEach(entry => {
            const date = entry.work_date;
            if (!dailyTotals[date]) {
                dailyTotals[date] = 0;
            }
            dailyTotals[date] += entry.minutes_spent || 0;
        });

        // Convert to array and sort by date (newest first)
        return Object.entries(dailyTotals)
            .map(([date, minutes]) => ({ date, minutes }))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    };

    const dailySummary = getDailySummary();
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.minutes_spent || 0), 0);
    const totalHours = totalMinutes / 60;

    // Calculate total money considering customer discount
    const totalMoneyCents = entries.reduce((sum, entry) => {
        const hours = (entry.minutes_spent || 0) / 60;
        const hourlyRateCents = entry.hourly_rate_cents || 0;
        const discountPercent = entry.discount_percent || 0;
        
        // Calculate pre-discount amount
        const preDiscountCents = hours * hourlyRateCents;
        
        // Apply discount
        const discountCents = (preDiscountCents * discountPercent) / 100;
        const amountCents = preDiscountCents - discountCents;
        
        return sum + amountCents;
    }, 0);

    const formatDate = (dateString) => {
        return formatDateUtil(dateString);
    };

    const formatCurrency = (cents) => {
        if (!cents) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(cents / 100);
    };

    const formatInvoiceDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getInvoiceStatusLabel = (status) => {
        const statusMap = {
            'draft': 'Draft',
            'sent': 'Sent',
            'paid': 'Paid',
            'overdue': 'Overdue'
        };
        return statusMap[status] || status || 'Unknown';
    };

    const toggleDateExpansion = (date) => {
        setExpandedDates(prev => {
            const newSet = new Set(prev);
            if (newSet.has(date)) {
                newSet.delete(date);
            } else {
                newSet.add(date);
            }
            return newSet;
        });
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '32px',
                paddingBottom: '16px',
                borderBottom: '1px solid var(--border)'
            }}>
                <div>
                    <h1 style={{ 
                        fontSize: '28px', 
                        fontWeight: '600',
                        letterSpacing: '-0.02em',
                        marginBottom: '4px',
                        color: 'var(--foreground)'
                    }}>Time Tracking</h1>
                    <p style={{ 
                        fontSize: '15px',
                        color: 'var(--foreground)',
                        opacity: 0.6,
                        fontWeight: '400'
                    }}>Review and manage your logged work</p>
                </div>
                <div style={{ 
                    display: 'flex', 
                    gap: '0.625rem', 
                    alignItems: 'center',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={() => setIsCSVUploadOpen(true)}
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            color: 'var(--foreground)',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--background)';
                            e.currentTarget.style.borderColor = 'var(--foreground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <Upload size={18} style={{ flexShrink: 0 }} />
                        <span>Bulk Upload</span>
                    </button>
                    <button
                        onClick={() => setIsInvoiceModalOpen(true)}
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            color: 'var(--foreground)',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--background)';
                            e.currentTarget.style.borderColor = 'var(--foreground)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                    >
                        <FileText size={18} style={{ flexShrink: 0 }} />
                        <span>Create Invoice</span>
                    </button>
                    <button 
                        onClick={() => setShowTimer(!showTimer)}
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            color: showTimer ? 'white' : 'var(--foreground)',
                            backgroundColor: showTimer ? 'var(--primary)' : 'transparent',
                            border: '1px solid ' + (showTimer ? 'var(--primary)' : 'var(--border)'),
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            if (!showTimer) {
                                e.currentTarget.style.backgroundColor = 'var(--background)';
                                e.currentTarget.style.borderColor = 'var(--foreground)';
                            } else {
                                e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showTimer) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.borderColor = 'var(--border)';
                            } else {
                                e.currentTarget.style.backgroundColor = 'var(--primary)';
                            }
                        }}
                    >
                        <TimerIcon size={18} style={{ flexShrink: 0 }} />
                        <span>{showTimer ? 'Hide Timer' : 'Timer'}</span>
                    </button>
                    <button 
                        onClick={handleAdd}
                        style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            color: 'white',
                            backgroundColor: 'var(--primary)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--primary)';
                        }}
                    >
                        <Plus size={20} style={{ flexShrink: 0 }} />
                        <span>Log Time</span>
                    </button>
                </div>
            </div>

            {/* Timer Section */}
            {showTimer && (
                <div style={{ marginBottom: '2rem' }}>
                    <Timer onTimeLogged={() => {
                        fetchData();
                        setShowTimer(false);
                    }} />
                </div>
            )}

            {/* Time Summary (Accordion) */}
            <div style={{
                marginBottom: '1.5rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                background: 'var(--card-bg)',
                overflow: 'hidden'
            }}>
                {/* Last 7 Days */}
                <button
                    type="button"
                    aria-expanded={expandedStats.last7Days}
                    aria-controls="time-stats-last7days"
                    onClick={() => setExpandedStats(prev => ({ ...prev, last7Days: !prev.last7Days }))}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <Clock size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                letterSpacing: '-0.01em'
                            }}>
                                Last 7 days
                            </div>
                            <div style={{
                                fontSize: '0.8125rem',
                                opacity: 0.65,
                                marginTop: '0.125rem'
                            }}>
                                {formatShortDate(timeStats.last7DaysRange.start)}–{formatShortDate(timeStats.last7DaysRange.end)}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.01em'
                        }}>
                            {formatMinutes(timeStats.last7Days)}
                        </div>
                        {expandedStats.last7Days ? (
                            <ChevronDown size={16} style={{ opacity: 0.6 }} />
                        ) : (
                            <ChevronRight size={16} style={{ opacity: 0.6 }} />
                        )}
                    </div>
                </button>
                {expandedStats.last7Days && (
                    <div
                        id="time-stats-last7days"
                        role="region"
                        aria-label="Last 7 days daily breakdown"
                        style={{
                            borderTop: '1px solid var(--border)'
                        }}
                    >
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '0.75rem',
                            padding: '0.625rem 1rem',
                            background: 'var(--background)',
                            borderBottom: '1px solid var(--border)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            color: 'var(--foreground)',
                            opacity: 0.7,
                            textTransform: 'uppercase'
                        }}>
                            <div>Date</div>
                            <div>Time</div>
                        </div>
                        <div style={{ display: 'grid' }}>
                            {timeStats.last7DaysBreakdown.map((row, idx) => (
                                <div
                                    key={row.date}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: '0.75rem',
                                        padding: '0.625rem 1rem',
                                        borderBottom: idx < timeStats.last7DaysBreakdown.length - 1 ? '1px solid var(--border)' : 'none',
                                        fontSize: '0.875rem',
                                        color: 'var(--foreground)'
                                    }}
                                >
                                    <div style={{ opacity: 0.85 }}>{formatDayLabel(row.date)}</div>
                                    <div style={{
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '0.01em'
                                    }}>
                                        {formatMinutes(row.minutes)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* This Week */}
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <button
                    type="button"
                    aria-expanded={expandedStats.thisWeek}
                    aria-controls="time-stats-thisweek"
                    onClick={() => setExpandedStats(prev => ({ ...prev, thisWeek: !prev.thisWeek }))}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        padding: '0.875rem 1rem',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--foreground)',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <CalendarIcon size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                            <div style={{
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                letterSpacing: '-0.01em'
                            }}>
                                This week
                            </div>
                            <div style={{
                                fontSize: '0.8125rem',
                                opacity: 0.65,
                                marginTop: '0.125rem'
                            }}>
                                {formatShortDate(timeStats.thisWeekRange.start)}–{formatShortDate(timeStats.thisWeekRange.end)}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        <div style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            letterSpacing: '0.01em'
                        }}>
                            {formatMinutes(timeStats.thisWeek)}
                        </div>
                        {expandedStats.thisWeek ? (
                            <ChevronDown size={16} style={{ opacity: 0.6 }} />
                        ) : (
                            <ChevronRight size={16} style={{ opacity: 0.6 }} />
                        )}
                    </div>
                </button>
                {expandedStats.thisWeek && (
                    <div
                        id="time-stats-thisweek"
                        role="region"
                        aria-label="This week daily breakdown"
                        style={{
                            borderTop: '1px solid var(--border)'
                        }}
                    >
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '0.75rem',
                            padding: '0.625rem 1rem',
                            background: 'var(--background)',
                            borderBottom: '1px solid var(--border)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            color: 'var(--foreground)',
                            opacity: 0.7,
                            textTransform: 'uppercase'
                        }}>
                            <div>Date</div>
                            <div>Time</div>
                        </div>
                        <div style={{ display: 'grid' }}>
                            {timeStats.thisWeekBreakdown.map((row, idx) => (
                                <div
                                    key={row.date}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: '0.75rem',
                                        padding: '0.625rem 1rem',
                                        borderBottom: idx < timeStats.thisWeekBreakdown.length - 1 ? '1px solid var(--border)' : 'none',
                                        fontSize: '0.875rem',
                                        color: 'var(--foreground)'
                                    }}
                                >
                                    <div style={{ opacity: 0.85 }}>{formatDayLabel(row.date)}</div>
                                    <div style={{
                                        fontWeight: 700,
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '0.01em'
                                    }}>
                                        {formatMinutes(row.minutes)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div style={{ 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                padding: '1.5rem', 
                marginBottom: '2rem'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ 
                        fontSize: '0.9375rem', 
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        color: 'var(--foreground)'
                    }}>
                        Filters
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--foreground)', opacity: 0.6 }}>View:</span>
                        <div style={{ 
                            display: 'flex', 
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: 'var(--background)'
                        }}>
                            <button
                                onClick={() => setShowSummaryView(false)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: 'none',
                                    background: showSummaryView ? 'transparent' : 'var(--foreground)',
                                    color: showSummaryView ? 'var(--foreground)' : 'var(--background)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    transition: 'background-color 0.15s ease',
                                    fontFamily: 'var(--font-sans)'
                                }}
                            >
                                <List size={14} />
                                Table
                            </button>
                            <button
                                onClick={() => setShowSummaryView(true)}
                                style={{
                                    padding: '0.5rem 0.75rem',
                                    border: 'none',
                                    borderLeft: '1px solid var(--border)',
                                    background: showSummaryView ? 'var(--foreground)' : 'transparent',
                                    color: showSummaryView ? 'var(--background)' : 'var(--foreground)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 500,
                                    transition: 'background-color 0.15s ease',
                                    fontFamily: 'var(--font-sans)'
                                }}
                            >
                                <LayoutGrid size={14} />
                                Summary
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Client</label>
                        <div style={{ position: 'relative' }}>
                            <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <select
                                value={filters.client_id}
                                onChange={e => setFilters({ ...filters, client_id: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            >
                                <option value="">All Clients</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Work Type</label>
                        <div style={{ position: 'relative' }}>
                            <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <select
                                value={filters.work_type_id}
                                onChange={e => setFilters({ ...filters, work_type_id: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            >
                                <option value="">All Types</option>
                                {workTypes.map(wt => <option key={wt.id} value={wt.id}>{wt.description}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>From Date</label>
                        <div style={{ position: 'relative' }}>
                            <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="date"
                                value={filters.work_date_from}
                                onChange={e => setFilters({ ...filters, work_date_from: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>To Date</label>
                        <div style={{ position: 'relative' }}>
                            <CalendarIcon size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="date"
                                value={filters.work_date_to}
                                onChange={e => setFilters({ ...filters, work_date_to: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Status</label>
                        <div style={{ position: 'relative' }}>
                            <FileText size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <select
                                value={filters.is_invoiced}
                                onChange={e => setFilters({ ...filters, is_invoiced: e.target.value })}
                                style={{ padding: '0.75rem 0.75rem 0.75rem 2.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', width: '100%', outline: 'none' }}
                            >
                                <option value="">All Statuses</option>
                                <option value="true">Invoiced</option>
                                <option value="false">Uninvoiced</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={() => setFilters({ client_id: '', work_type_id: '', work_date_from: '', work_date_to: '', is_invoiced: '' })}
                        style={{ height: '2.8rem' }}
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Content Area - Summary or Table */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
                    <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                    <p style={{ opacity: 0.6 }}>Loading entries...</p>
                </div>
            ) : error ? (
                <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <AlertCircle size={24} />
                    <p>{error}</p>
                </div>
            ) : entries.length === 0 ? (
                <div className="card glass" style={{ textAlign: 'center', padding: '4rem' }}>
                    <Clock size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.2 }} />
                    <h3 style={{ marginBottom: '0.5rem' }}>No time entries found</h3>
                    <p style={{ opacity: 0.6, marginBottom: '1.5rem' }}>Try adjusting your filters or log some new work.</p>
                    <button className="btn btn-primary" onClick={handleAdd}>
                        <Plus size={20} />
                        Log Your First Entry
                    </button>
                </div>
            ) : showSummaryView ? (
                /* Daily Summary Table View */
                <div style={{ 
                    background: 'var(--card-bg)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <div style={{ 
                        padding: '1rem 1.5rem', 
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--background)'
                    }}>
                        <h3 style={{ 
                            fontSize: '0.9375rem', 
                            fontWeight: 600, 
                            letterSpacing: '-0.01em',
                            color: 'var(--foreground)'
                        }}>
                            Daily Summary
                        </h3>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'baseline', 
                            gap: '1.5rem',
                            fontSize: '0.875rem',
                            color: 'var(--foreground)',
                            opacity: 0.7
                        }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span>Total Time:</span>
                                <span style={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.9375rem',
                                    opacity: 1,
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {formatMinutes(totalMinutes)}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                <span>Total Amount:</span>
                                <span style={{ 
                                    fontWeight: 600, 
                                    fontSize: '0.9375rem',
                                    opacity: 1,
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {formatCurrency(Math.round(totalMoneyCents))}
                                </span>
                            </div>
                        </div>
                    </div>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem'
                    }}>
                        <thead>
                            <tr style={{ 
                                background: 'var(--background)',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Date
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Entries
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Total Time
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Total Amount
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {dailySummary.map(({ date, minutes }, index) => {
                                const dayEntries = entries.filter(e => e.work_date === date);
                                const dayEntriesCount = dayEntries.length;
                                const isExpanded = expandedDates.has(date);
                                
                                // Calculate total money for this day
                                const dayMoneyCents = dayEntries.reduce((sum, entry) => {
                                    const hours = (entry.minutes_spent || 0) / 60;
                                    const hourlyRateCents = entry.hourly_rate_cents || 0;
                                    const discountPercent = entry.discount_percent || 0;
                                    
                                    // Calculate pre-discount amount
                                    const preDiscountCents = hours * hourlyRateCents;
                                    
                                    // Apply discount
                                    const discountCents = (preDiscountCents * discountPercent) / 100;
                                    const amountCents = preDiscountCents - discountCents;
                                    
                                    return sum + amountCents;
                                }, 0);
                                
                                return (
                                    <React.Fragment key={date}>
                                        <tr
                                            style={{ 
                                                borderBottom: isExpanded ? 'none' : (index < dailySummary.length - 1 ? '1px solid var(--border)' : 'none'),
                                                transition: 'background-color 0.15s ease',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => toggleDateExpansion(date)}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--background)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <td style={{ 
                                                padding: '1rem 1.5rem',
                                                fontWeight: 500,
                                                color: 'var(--foreground)',
                                                fontVariantNumeric: 'tabular-nums',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {isExpanded ? (
                                                    <ChevronDown size={16} style={{ opacity: 0.6 }} />
                                                ) : (
                                                    <ChevronRight size={16} style={{ opacity: 0.6 }} />
                                                )}
                                                {formatDate(date)}
                                            </td>
                                            <td style={{ 
                                                padding: '1rem 1.5rem',
                                                textAlign: 'right',
                                                color: 'var(--foreground)',
                                                opacity: 0.7,
                                                fontVariantNumeric: 'tabular-nums'
                                            }}>
                                                {dayEntriesCount}
                                            </td>
                                            <td style={{ 
                                                padding: '1rem 1.5rem',
                                                textAlign: 'right',
                                                fontWeight: 600,
                                                color: 'var(--foreground)',
                                                fontVariantNumeric: 'tabular-nums',
                                                letterSpacing: '0.01em'
                                            }}>
                                                {formatMinutes(minutes)}
                                            </td>
                                            <td style={{ 
                                                padding: '1rem 1.5rem',
                                                textAlign: 'right',
                                                fontWeight: 600,
                                                color: 'var(--foreground)',
                                                fontSize: '0.9375rem',
                                                fontVariantNumeric: 'tabular-nums'
                                            }}>
                                                {formatCurrency(Math.round(dayMoneyCents))}
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan="4" style={{ 
                                                    padding: 0,
                                                    background: 'var(--background)',
                                                    borderBottom: index < dailySummary.length - 1 ? '1px solid var(--border)' : 'none'
                                                }}>
                                                    <div style={{ padding: '1rem 1.5rem' }}>
                                                        <table style={{ 
                                                            width: '100%',
                                                            borderCollapse: 'collapse',
                                                            fontSize: '0.875rem'
                                                        }}>
                                                            <thead>
                                                                <tr style={{ 
                                                                    borderBottom: '1px solid var(--border)'
                                                                }}>
                                                                    <th style={{ 
                                                                        padding: '0.75rem 1rem', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--foreground)',
                                                                        opacity: 0.6,
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        Client & Project
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.75rem 1rem', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--foreground)',
                                                                        opacity: 0.6,
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        Work Type
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.75rem 1rem', 
                                                                        textAlign: 'right',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--foreground)',
                                                                        opacity: 0.6,
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        Duration
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.75rem 1rem', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--foreground)',
                                                                        opacity: 0.6,
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        Status
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.75rem 1rem', 
                                                                        textAlign: 'left',
                                                                        fontSize: '0.75rem',
                                                                        fontWeight: 600,
                                                                        color: 'var(--foreground)',
                                                                        opacity: 0.6,
                                                                        textTransform: 'uppercase'
                                                                    }}>
                                                                        Details
                                                                    </th>
                                                                    <th style={{ 
                                                                        padding: '0.75rem 1rem', 
                                                                        textAlign: 'right',
                                                                        width: '100px'
                                                                    }}></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {dayEntries.map((entry, entryIndex) => (
                                                                    <tr
                                                                        key={entry.id}
                                                                        style={{ 
                                                                            borderBottom: entryIndex < dayEntries.length - 1 ? '1px solid var(--border)' : 'none',
                                                                            transition: 'background-color 0.15s ease'
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                        }}
                                                                    >
                                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                                            <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                                                                                {entry.client_name}
                                                                            </div>
                                                                            <div style={{ fontSize: '0.8125rem', color: 'var(--foreground)', opacity: 0.6 }}>
                                                                                {entry.project_name || '—'}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                                            <span style={{
                                                                                fontSize: '0.8125rem',
                                                                                padding: '0.25rem 0.5rem',
                                                                                borderRadius: '4px',
                                                                                background: 'var(--card-bg)',
                                                                                border: '1px solid var(--border)',
                                                                                color: 'var(--foreground)',
                                                                                fontWeight: 500,
                                                                                fontFamily: 'monospace',
                                                                                letterSpacing: '0.05em'
                                                                            }}>
                                                                                {entry.work_type_code}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ 
                                                                            padding: '0.75rem 1rem',
                                                                            textAlign: 'right',
                                                                            fontWeight: 600,
                                                                            color: 'var(--foreground)',
                                                                            fontVariantNumeric: 'tabular-nums',
                                                                            letterSpacing: '0.01em'
                                                                        }}>
                                                                            {formatMinutes(entry.minutes_spent)}
                                                                        </td>
                                                                        <td style={{ padding: '0.75rem 1rem' }}>
                                                                            {entry.invoice_id ? (
                                                                                <div style={{
                                                                                    display: 'flex',
                                                                                    flexDirection: 'column',
                                                                                    gap: '0.5rem'
                                                                                }}>
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            navigate(`/invoices/${entry.invoice_id}`);
                                                                                        }}
                                                                                        style={{
                                                                                            fontSize: '0.8125rem',
                                                                                            fontWeight: 600,
                                                                                            background: 'none',
                                                                                            border: 'none',
                                                                                            color: 'var(--foreground)',
                                                                                            cursor: 'pointer',
                                                                                            padding: 0,
                                                                                            textAlign: 'left',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            gap: '0.375rem',
                                                                                            fontFamily: 'monospace',
                                                                                            letterSpacing: '0.025em',
                                                                                            transition: 'color 0.15s ease'
                                                                                        }}
                                                                                        onMouseEnter={(e) => {
                                                                                            e.target.style.color = 'var(--primary)';
                                                                                        }}
                                                                                        onMouseLeave={(e) => {
                                                                                            e.target.style.color = 'var(--foreground)';
                                                                                        }}
                                                                                    >
                                                                                        INV-{entry.invoice_number}
                                                                                        <ExternalLink size={12} style={{ opacity: 0.5 }} />
                                                                                    </button>
                                                                                    <div style={{
                                                                                        display: 'flex',
                                                                                        flexDirection: 'column',
                                                                                        gap: '0.5rem',
                                                                                        fontSize: '0.75rem',
                                                                                        color: 'var(--foreground)',
                                                                                        opacity: 0.6
                                                                                    }}>
                                                                                        <div>
                                                                                            {entry.invoice_date ? formatInvoiceDate(entry.invoice_date) : '—'}
                                                                                        </div>
                                                                                        {entry.invoice_status && (
                                                                                            <span className={`badge badge-${entry.invoice_status}`}>
                                                                                                {entry.invoice_status.replace('_', ' ')}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span style={{
                                                                                    fontSize: '0.8125rem',
                                                                                    color: 'var(--foreground)',
                                                                                    opacity: 0.5
                                                                                }}>
                                                                                    Uninvoiced
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ 
                                                                            padding: '0.75rem 1rem', 
                                                                            maxWidth: '300px',
                                                                            color: 'var(--foreground)',
                                                                            opacity: 0.8
                                                                        }}>
                                                                            <div style={{ 
                                                                                fontSize: '0.8125rem', 
                                                                                whiteSpace: 'nowrap', 
                                                                                overflow: 'hidden', 
                                                                                textOverflow: 'ellipsis' 
                                                                            }}>
                                                                                {entry.detail || <span style={{ opacity: 0.4 }}>—</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                                                                            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleEdit(entry);
                                                                                    }}
                                                                                    style={{ 
                                                                                        padding: '0.5rem', 
                                                                                        borderRadius: '4px', 
                                                                                        border: '1px solid var(--border)', 
                                                                                        background: 'transparent', 
                                                                                        color: 'var(--foreground)', 
                                                                                        cursor: 'pointer',
                                                                                        transition: 'background-color 0.15s ease',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center'
                                                                                    }}
                                                                                    onMouseEnter={(e) => {
                                                                                        e.currentTarget.style.backgroundColor = 'var(--card-bg)';
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                                    }}
                                                                                >
                                                                                    <Edit2 size={14} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        handleDelete(entry.id);
                                                                                    }}
                                                                                    style={{ 
                                                                                        padding: '0.5rem', 
                                                                                        borderRadius: '4px', 
                                                                                        border: '1px solid var(--border)', 
                                                                                        background: 'transparent', 
                                                                                        color: '#ef4444', 
                                                                                        cursor: 'pointer',
                                                                                        transition: 'background-color 0.15s ease',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center'
                                                                                    }}
                                                                                    onMouseEnter={(e) => {
                                                                                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                                                                    }}
                                                                                    onMouseLeave={(e) => {
                                                                                        e.currentTarget.style.backgroundColor = 'transparent';
                                                                                    }}
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ 
                                borderTop: '2px solid var(--border)',
                                background: 'var(--background)'
                            }}>
                                <td style={{ 
                                    padding: '1rem 1.5rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem'
                                }}>
                                    Total
                                </td>
                                <td style={{ 
                                    padding: '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.7,
                                    fontSize: '0.9375rem',
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {entries.length}
                                </td>
                                <td style={{ 
                                    padding: '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '0.01em'
                                }}>
                                    {formatMinutes(totalMinutes)}
                                </td>
                                <td style={{ 
                                    padding: '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem',
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {formatCurrency(Math.round(totalMoneyCents))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : (
                /* Table View */
                <div style={{ 
                    background: 'var(--card-bg)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px',
                    overflow: 'hidden'
                }}>
                    <table style={{ 
                        width: '100%', 
                        borderCollapse: 'collapse',
                        fontSize: '0.875rem'
                    }}>
                        <thead>
                            <tr style={{ 
                                background: 'var(--background)',
                                borderBottom: '1px solid var(--border)'
                            }}>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Date
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Client & Project
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Work Type
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Duration
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Status
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    opacity: 0.6,
                                    letterSpacing: '0.01em',
                                    textTransform: 'uppercase'
                                }}>
                                    Details
                                </th>
                                <th style={{ 
                                    padding: '0.875rem 1.5rem', 
                                    textAlign: 'right',
                                    width: '100px'
                                }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => (
                                <tr
                                    key={entry.id}
                                    style={{ 
                                        borderBottom: index < entries.length - 1 ? '1px solid var(--border)' : 'none',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--background)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <td style={{ 
                                        padding: '1rem 1.5rem',
                                        fontWeight: 500,
                                        color: 'var(--foreground)',
                                        fontVariantNumeric: 'tabular-nums'
                                    }}>
                                        {formatDate(entry.work_date)}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.25rem' }}>
                                            {entry.client_name}
                                        </div>
                                        <div style={{ fontSize: '0.8125rem', color: 'var(--foreground)', opacity: 0.6 }}>
                                            {entry.project_name || '—'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{
                                            fontSize: '0.8125rem',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: 'var(--background)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--foreground)',
                                            fontWeight: 500,
                                            fontFamily: 'monospace',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {entry.work_type_code}
                                        </span>
                                    </td>
                                    <td style={{ 
                                        padding: '1rem 1.5rem',
                                        textAlign: 'right',
                                        fontWeight: 600,
                                        color: 'var(--foreground)',
                                        fontVariantNumeric: 'tabular-nums',
                                        letterSpacing: '0.01em'
                                    }}>
                                        {formatMinutes(entry.minutes_spent)}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        {entry.invoice_id ? (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem'
                                            }}>
                                                <button
                                                    onClick={() => navigate(`/invoices/${entry.invoice_id}`)}
                                                    style={{
                                                        fontSize: '0.8125rem',
                                                        fontWeight: 600,
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--foreground)',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        textAlign: 'left',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.375rem',
                                                        fontFamily: 'monospace',
                                                        letterSpacing: '0.025em',
                                                        transition: 'color 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.target.style.color = 'var(--primary)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.target.style.color = 'var(--foreground)';
                                                    }}
                                                >
                                                    INV-{entry.invoice_number}
                                                    <ExternalLink size={12} style={{ opacity: 0.5 }} />
                                                </button>
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    color: 'var(--foreground)',
                                                    opacity: 0.6
                                                }}>
                                                    <div>
                                                        {entry.invoice_date ? formatInvoiceDate(entry.invoice_date) : '—'}
                                                    </div>
                                                    {entry.invoice_status && (
                                                        <span className={`badge badge-${entry.invoice_status}`}>
                                                            {entry.invoice_status.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <span style={{
                                                fontSize: '0.8125rem',
                                                color: 'var(--foreground)',
                                                opacity: 0.5
                                            }}>
                                                Uninvoiced
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ 
                                        padding: '1rem 1.5rem', 
                                        maxWidth: '300px',
                                        color: 'var(--foreground)',
                                        opacity: 0.8
                                    }}>
                                        <div style={{ 
                                            fontSize: '0.8125rem', 
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>
                                            {entry.detail || <span style={{ opacity: 0.4 }}>—</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleEdit(entry)}
                                                style={{ 
                                                    padding: '0.5rem', 
                                                    borderRadius: '4px', 
                                                    border: '1px solid var(--border)', 
                                                    background: 'transparent', 
                                                    color: 'var(--foreground)', 
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'var(--background)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(entry.id)}
                                                style={{ 
                                                    padding: '0.5rem', 
                                                    borderRadius: '4px', 
                                                    border: '1px solid var(--border)', 
                                                    background: 'transparent', 
                                                    color: '#ef4444', 
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ 
                                borderTop: '2px solid var(--border)',
                                background: 'var(--background)'
                            }}>
                                <td colSpan="3" style={{ 
                                    padding: '1rem 1.5rem',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem'
                                }}>
                                    Total
                                </td>
                                <td style={{ 
                                    padding: '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem',
                                    fontVariantNumeric: 'tabular-nums',
                                    letterSpacing: '0.01em'
                                }}>
                                    {formatMinutes(totalMinutes)}
                                </td>
                                <td colSpan="3" style={{ 
                                    padding: '1rem 1.5rem',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    color: 'var(--foreground)',
                                    fontSize: '0.9375rem',
                                    fontVariantNumeric: 'tabular-nums'
                                }}>
                                    {formatCurrency(Math.round(totalMoneyCents))}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Edit/Add Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="card"
                            style={{
                                width: '100%',
                                maxWidth: '600px',
                                position: 'relative',
                                background: 'var(--background)',
                                zIndex: 1001,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '2rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>{editingEntry ? 'Edit Time Entry' : 'Log New Work'}</h3>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', opacity: 0.5 }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <LogTimeEntry
                                initialData={editingEntry}
                                isModal={true}
                                onSave={() => {
                                    setIsModalOpen(false);
                                    fetchData();
                                }}
                                onCancel={() => setIsModalOpen(false)}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Create Invoice from Time Entries Modal */}
            <CreateInvoiceFromTimeEntriesModal
                isOpen={isInvoiceModalOpen}
                onClose={() => setIsInvoiceModalOpen(false)}
                onInvoiceCreated={() => {
                    setIsInvoiceModalOpen(false);
                    fetchData(); // Refresh time entries to show invoice status
                }}
            />

            {/* CSV Upload Modal */}
            <AnimatePresence>
                {isCSVUploadOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCSVUploadOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="card"
                            style={{
                                width: '100%',
                                maxWidth: '800px',
                                position: 'relative',
                                background: 'var(--background)',
                                zIndex: 1001,
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                padding: '2rem'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <h3 style={{ fontSize: '1.5rem' }}>Bulk Upload Time Entries</h3>
                                <button
                                    onClick={() => setIsCSVUploadOpen(false)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--foreground)', cursor: 'pointer', opacity: 0.5 }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <CSVTimeEntryUpload
                                onUploadComplete={() => {
                                    setIsCSVUploadOpen(false);
                                    fetchData();
                                }}
                                clients={clients}
                                workTypes={workTypes}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default TimeEntryList;
