import express from 'express';
import { calculateStatement } from '../services/statementService.js';
import { generateStatementHTML } from '../utils/statementHtmlGenerator.js';
import { authenticateToken } from '../middleware/auth.js';
import puppeteer from 'puppeteer';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/statements/:clientId
 * Returns statement data as JSON
 * Query params: start_date (required), end_date (required) in YYYY-MM-DD format
 */
router.get('/:clientId', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { start_date, end_date } = req.query;

    // Validate required parameters
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: start_date and end_date' 
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    // Calculate statement
    const statement = await calculateStatement(
      parseInt(clientId, 10),
      start_date,
      end_date
    );

    res.json(statement);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('required') || error.message.includes('format') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/statements/:clientId/html
 * Returns statement as HTML
 * Query params: start_date (required), end_date (required) in YYYY-MM-DD format
 */
router.get('/:clientId/html', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { start_date, end_date } = req.query;

    // Validate required parameters
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: start_date and end_date' 
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    // Calculate statement
    const statement = await calculateStatement(
      parseInt(clientId, 10),
      start_date,
      end_date
    );

    // Generate HTML
    const html = generateStatementHTML(statement);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('required') || error.message.includes('format') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

/**
 * GET /api/statements/:clientId/pdf
 * Returns statement as PDF
 * Query params: start_date (required), end_date (required) in YYYY-MM-DD format
 */
router.get('/:clientId/pdf', async (req, res, next) => {
  let browser = null;
  try {
    const { clientId } = req.params;
    const { start_date, end_date } = req.query;

    // Validate required parameters
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        error: 'Missing required query parameters: start_date and end_date' 
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
      return res.status(400).json({ 
        error: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    // Calculate statement
    const statement = await calculateStatement(
      parseInt(clientId, 10),
      start_date,
      end_date
    );

    // Generate HTML
    const html = generateStatementHTML(statement);

    // Launch Puppeteer browser with font support
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({
      width: 1200,
      height: 1600,
      deviceScaleFactor: 2
    });
    
    // Set the HTML content directly
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30000
    });

    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    
    // Additional wait to ensure all rendering is complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: '5mm',
        right: '5mm',
        bottom: '5mm',
        left: '5mm'
      },
      displayHeaderFooter: false
    });

    // Set response headers
    const clientName = statement.client_name?.replace(/\s+/g, '-') || 'client';
    const filename = `Statement-${clientName}-${start_date}-to-${end_date}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('required') || error.message.includes('format') || error.message.includes('must be')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error generating statement PDF:', error);
    next(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

export default router;
