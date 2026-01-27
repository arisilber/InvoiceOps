import express from 'express';
import { query } from '../db/connection.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET all expenses
router.get('/', async (req, res, next) => {
  try {
    const { vendor, expense_date_from, expense_date_to, is_refund } = req.query;
    let queryText = `
      SELECT 
        id,
        vendor,
        item,
        price_cents,
        quantity,
        expense_date,
        is_refund,
        created_at,
        updated_at,
        (price_cents * quantity) as total_cents
      FROM expenses
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (vendor) {
      queryText += ` AND LOWER(vendor) LIKE LOWER($${paramCount})`;
      params.push(`%${vendor}%`);
      paramCount++;
    }

    if (expense_date_from) {
      queryText += ` AND expense_date >= $${paramCount}`;
      params.push(expense_date_from);
      paramCount++;
    }

    if (expense_date_to) {
      queryText += ` AND expense_date <= $${paramCount}`;
      params.push(expense_date_to);
      paramCount++;
    }

    if (is_refund !== undefined) {
      queryText += ` AND is_refund = $${paramCount}`;
      params.push(is_refund === 'true');
      paramCount++;
    }

    queryText += ' ORDER BY expense_date DESC, created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET previous price for an item
router.get('/previous-price', async (req, res, next) => {
  try {
    const { item } = req.query;
    
    if (!item) {
      return res.status(400).json({ error: 'item query parameter is required' });
    }

    // Find the most recent expense with the same item (case-insensitive)
    // Only get price from non-refund expenses
    const result = await query(
      `SELECT price_cents
       FROM expenses
       WHERE LOWER(TRIM(item)) = LOWER(TRIM($1))
         AND is_refund = FALSE
       ORDER BY expense_date DESC, created_at DESC
       LIMIT 1`,
      [item]
    );

    if (result.rows.length === 0) {
      return res.json({ price_cents: null });
    }

    res.json({ price_cents: result.rows[0].price_cents });
  } catch (error) {
    next(error);
  }
});

// GET a single expense by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT 
        id,
        vendor,
        item,
        price_cents,
        quantity,
        expense_date,
        is_refund,
        created_at,
        updated_at,
        (price_cents * quantity) as total_cents
       FROM expenses
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// POST create a new expense
router.post('/', async (req, res, next) => {
  try {
    const { vendor, item, price_cents, quantity = 1, expense_date, is_refund } = req.body;

    // Validation
    if (!vendor || !item || price_cents === undefined || !expense_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: vendor, item, price_cents, and expense_date are required' 
      });
    }

    // Convert is_refund to boolean (handle string "true"/"false" or boolean)
    const isRefund = is_refund === true || is_refund === 'true';

    // Validate price based on refund status
    if (isRefund) {
      if (price_cents > 0) {
        return res.status(400).json({ error: 'price_cents must be non-positive for refunds' });
      }
    } else {
      if (price_cents < 0) {
        return res.status(400).json({ error: 'price_cents must be non-negative for expenses' });
      }
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than 0' });
    }

    const result = await query(
      `INSERT INTO expenses (vendor, item, price_cents, quantity, expense_date, is_refund)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING 
         id,
         vendor,
         item,
         price_cents,
         quantity,
         expense_date,
         is_refund,
         created_at,
         updated_at,
         (price_cents * quantity) as total_cents`,
      [vendor, item, price_cents, quantity, expense_date, isRefund]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PUT update an expense
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vendor, item, price_cents, quantity, expense_date, is_refund } = req.body;

    // First, get the current expense to check its refund status
    const currentExpense = await query(
      'SELECT is_refund FROM expenses WHERE id = $1',
      [id]
    );

    if (currentExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const currentIsRefund = currentExpense.rows[0].is_refund;
    const finalIsRefund = is_refund !== undefined ? is_refund : currentIsRefund;

    // Validation for price_cents based on refund status
    if (price_cents !== undefined) {
      if (finalIsRefund) {
        if (price_cents > 0) {
          return res.status(400).json({ error: 'price_cents must be non-positive for refunds' });
        }
      } else {
        if (price_cents < 0) {
          return res.status(400).json({ error: 'price_cents must be non-negative for expenses' });
        }
      }
    }

    if (quantity !== undefined && quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be greater than 0' });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (vendor !== undefined) {
      updates.push(`vendor = $${paramCount}`);
      params.push(vendor);
      paramCount++;
    }

    if (item !== undefined) {
      updates.push(`item = $${paramCount}`);
      params.push(item);
      paramCount++;
    }

    if (price_cents !== undefined) {
      updates.push(`price_cents = $${paramCount}`);
      params.push(price_cents);
      paramCount++;
    }

    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount}`);
      params.push(quantity);
      paramCount++;
    }

    if (expense_date !== undefined) {
      updates.push(`expense_date = $${paramCount}`);
      params.push(expense_date);
      paramCount++;
    }

    if (is_refund !== undefined) {
      updates.push(`is_refund = $${paramCount}`);
      params.push(is_refund);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const result = await query(
      `UPDATE expenses
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramCount}
       RETURNING 
         id,
         vendor,
         item,
         price_cents,
         quantity,
         expense_date,
         is_refund,
         created_at,
         updated_at,
         (price_cents * quantity) as total_cents`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// DELETE an expense
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'DELETE FROM expenses WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// GET expense statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { expense_date_from, expense_date_to } = req.query;
    let queryText = `
      SELECT 
        COUNT(*) FILTER (WHERE is_refund = FALSE) as total_expenses,
        COUNT(*) FILTER (WHERE is_refund = TRUE) as total_refunds,
        COALESCE(SUM(price_cents * quantity) FILTER (WHERE is_refund = FALSE), 0) as total_expenses_amount_cents,
        COALESCE(SUM(price_cents * quantity) FILTER (WHERE is_refund = TRUE), 0) as total_refunds_amount_cents,
        COALESCE(SUM(price_cents * quantity), 0) as net_amount_cents,
        COALESCE(AVG(price_cents * quantity), 0) as average_expense_amount_cents,
        COUNT(DISTINCT vendor) as unique_vendors
      FROM expenses
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (expense_date_from) {
      queryText += ` AND expense_date >= $${paramCount}`;
      params.push(expense_date_from);
      paramCount++;
    }

    if (expense_date_to) {
      queryText += ` AND expense_date <= $${paramCount}`;
      params.push(expense_date_to);
      paramCount++;
    }

    const result = await query(queryText, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// GET unique vendors
router.get('/vendors/unique', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT vendor
       FROM expenses
       WHERE vendor IS NOT NULL AND TRIM(vendor) != ''
       ORDER BY vendor ASC`,
      []
    );
    const vendors = result.rows.map(row => row.vendor);
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
});

// GET unique items
router.get('/items/unique', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT DISTINCT item
       FROM expenses
       WHERE item IS NOT NULL AND TRIM(item) != ''
       ORDER BY item ASC`,
      []
    );
    const items = result.rows.map(row => row.item);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

export default router;
