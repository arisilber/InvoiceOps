import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Square, Clock, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import LogTimeEntry from './LogTimeEntry';
import { getLocalDateString } from '../utils/timeParser';

const Timer = ({ onTimeLogged }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [finalMinutesSpent, setFinalMinutesSpent] = useState(0);
    
    const intervalRef = useRef(null);
    const startTimeRef = useRef(null);
    const accumulatedTimeRef = useRef(0); // Total elapsed time in ms (excluding current pause)

    // Update elapsed time every second when running
    useEffect(() => {
        if (isRunning && !isPaused) {
            intervalRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((accumulatedTimeRef.current + (now - startTimeRef.current)) / 1000);
                setElapsedSeconds(elapsed);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // When paused, update elapsed time one more time
            if (isPaused && startTimeRef.current) {
                const now = Date.now();
                const elapsed = Math.floor((accumulatedTimeRef.current) / 1000);
                setElapsedSeconds(elapsed);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, isPaused]);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlay = () => {
        if (!isRunning) {
            // Start new timer
            const now = Date.now();
            startTimeRef.current = now;
            accumulatedTimeRef.current = 0;
            setStartTime(now);
            setElapsedSeconds(0);
            setIsRunning(true);
            setIsPaused(false);
        } else if (isPaused) {
            // Resume from pause
            const now = Date.now();
            // Update startTimeRef to now to begin tracking again
            // accumulatedTimeRef already has the elapsed time up to when we paused
            startTimeRef.current = now;
            setIsPaused(false);
        }
    };

    const handlePause = () => {
        if (isRunning && !isPaused) {
            const now = Date.now();
            // Add the current run duration to accumulated time
            accumulatedTimeRef.current += (now - startTimeRef.current);
            // Update startTimeRef to track pause duration (we don't use it, but keep it consistent)
            startTimeRef.current = now;
            setIsPaused(true);
        }
    };

    const handleStop = () => {
        if (isRunning || isPaused) {
            const now = Date.now();
            // Final update to accumulated time if we're currently running
            if (isRunning && !isPaused) {
                accumulatedTimeRef.current += (now - startTimeRef.current);
            }
            // Calculate final elapsed seconds and minutes
            const finalElapsed = Math.floor(accumulatedTimeRef.current / 1000);
            const finalMinutes = Math.ceil(finalElapsed / 60); // Round up to nearest minute
            setElapsedSeconds(finalElapsed);
            setFinalMinutesSpent(finalMinutes);
            setIsRunning(false);
            setIsPaused(false);
            setShowEntryModal(true);
        }
    };

    const handleReset = () => {
        setIsRunning(false);
        setIsPaused(false);
        setElapsedSeconds(0);
        setStartTime(null);
        setFinalMinutesSpent(0);
        accumulatedTimeRef.current = 0;
        startTimeRef.current = null;
    };

    const handleSaveEntry = async () => {
        setShowEntryModal(false);
        if (onTimeLogged) {
            onTimeLogged();
        }
        handleReset();
    };

    const handleCancelEntry = () => {
        setShowEntryModal(false);
        // Keep the timer state so user can resume if needed
    };

    // Calculate minutes from elapsed seconds (round up to nearest minute)
    const minutesSpent = Math.ceil(elapsedSeconds / 60);

    return (
        <>
            <div className="card glass" style={{ 
                padding: '2rem', 
                textAlign: 'center',
                maxWidth: '600px',
                margin: '0 auto'
            }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        background: 'var(--primary)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                    }}>
                        <Clock size={28} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Timer</h2>
                        <p style={{ opacity: 0.7 }}>Track your work time</p>
                    </div>
                </div>

                {/* Elapsed Time Display */}
                <div style={{
                    fontSize: '4rem',
                    fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                    color: 'var(--foreground)',
                    marginBottom: '2rem',
                    fontFamily: 'var(--font-mono, monospace)'
                }}>
                    {formatTime(elapsedSeconds)}
                </div>

                {/* Timer Status */}
                {(isRunning || isPaused) && startTime && (
                    <div style={{
                        marginBottom: '2rem',
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        opacity: 0.6
                    }}>
                        Started at {new Date(startTime).toLocaleTimeString()}
                        {isPaused && ' (Paused)'}
                    </div>
                )}

                {/* Control Buttons */}
                <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                }}>
                    {!isRunning ? (
                        <button
                            onClick={handlePlay}
                            className="btn btn-primary"
                            style={{
                                minWidth: '140px',
                                height: '3.5rem',
                                fontSize: '1rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Play size={20} />
                            Start Timer
                        </button>
                    ) : (
                        <>
                            {!isPaused ? (
                                <button
                                    onClick={handlePause}
                                    className="btn btn-secondary"
                                    style={{
                                        minWidth: '140px',
                                        height: '3.5rem',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        background: 'transparent',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <Pause size={20} />
                                    Pause
                                </button>
                            ) : (
                                <button
                                    onClick={handlePlay}
                                    className="btn btn-primary"
                                    style={{
                                        minWidth: '140px',
                                        height: '3.5rem',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <Play size={20} />
                                    Resume
                                </button>
                            )}
                            <button
                                onClick={handleStop}
                                className="btn btn-secondary"
                                style={{
                                    minWidth: '140px',
                                    height: '3.5rem',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#dc2626';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                }}
                            >
                                <Square size={18} />
                                Stop & Log
                            </button>
                            <button
                                onClick={handleReset}
                                className="btn btn-secondary"
                                style={{
                                    minWidth: '120px',
                                    height: '3.5rem',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    background: 'transparent',
                                    border: '1px solid var(--border)',
                                    opacity: 0.6
                                }}
                            >
                                Reset
                            </button>
                        </>
                    )}
                </div>

                {/* Elapsed time summary */}
                {(elapsedSeconds > 0 || isRunning || isPaused) && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1rem',
                        background: 'var(--background)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        color: 'var(--foreground)',
                        opacity: 0.7
                    }}>
                        {minutesSpent} {minutesSpent === 1 ? 'minute' : 'minutes'} tracked
                    </div>
                )}
            </div>

            {/* Entry Modal */}
            <AnimatePresence>
                {showEntryModal && (
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
                            onClick={() => setShowEntryModal(false)}
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
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: '2rem' 
                            }}>
                                <h3 style={{ fontSize: '1.5rem' }}>Log Time Entry</h3>
                                <button
                                    onClick={() => setShowEntryModal(false)}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: 'var(--foreground)', 
                                        cursor: 'pointer', 
                                        opacity: 0.5 
                                    }}
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <LogTimeEntry
                                initialData={{
                                    minutes_spent: finalMinutesSpent > 0 ? finalMinutesSpent : minutesSpent,
                                    work_date: getLocalDateString()
                                }}
                                isModal={true}
                                onSave={handleSaveEntry}
                                onCancel={handleCancelEntry}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Timer;
