import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import workTypesRoutes from './routes/workTypes.js';
import timeEntriesRoutes from './routes/timeEntries.js';
import invoicesRoutes from './routes/invoices.js';
import paymentsRoutes from './routes/payments.js';

dotenv.config();

// #region agent log
fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:14',message:'Server startup - env vars check',data:{hasPort:!!process.env.PORT,port:process.env.PORT,hasDatabaseUrl:!!process.env.DATABASE_URL,hasDbHost:!!process.env.DB_HOST,nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

const app = express();
const PORT = process.env.PORT || 3001;

// #region agent log
fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:19',message:'Server startup - PORT resolved',data:{port:PORT},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
// #endregion

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// #region agent log
// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:25',message:'Request received',data:{method:req.method,path:req.path,hasBody:!!req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  }
  next();
});
// #endregion

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'InvoiceOps API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/work-types', workTypesRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/payments', paymentsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:45',message:'Server error handler triggered',data:{errorName:err.name,errorMessage:err.message,status:err.status||500,path:req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, async () => {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:54',message:'Server listening successfully',data:{port:PORT,listening:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // Test database connection
  try {
    const { query } = await import('./db/connection.js');
    const testResult = await query('SELECT 1 as test');
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:80',message:'Database connection test',data:{connected:true,testResult:testResult.rows[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  } catch (dbError) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/91688a60-4570-42ad-b24f-59d4a9d774d5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server/index.js:84',message:'Database connection test failed',data:{connected:false,errorName:dbError.name,errorMessage:dbError.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
  }
  
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

