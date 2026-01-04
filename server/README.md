# InvoiceOps Server

Express.js API server for InvoiceOps invoice management system.

## Setup

1. **Install dependencies** (already done if you ran `npm install`)
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Copy `.env.example` to `.env` and update with your database credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your PostgreSQL credentials:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=invoiceops
   DB_USER=postgres
   DB_PASSWORD=your_password
   PORT=3001
   NODE_ENV=development
   ```

3. **Create and set up the database**
   
   Make sure PostgreSQL is running, then create the database and run the schema:
   ```bash
   createdb invoiceops
   psql -U postgres -d invoiceops -f database/schema.sql
   ```

4. **Start the server**
   ```bash
   npm run server
   # or
   npm run dev:server
   ```

   The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Clients
- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Work Types
- `GET /api/work-types` - Get all work types
- `GET /api/work-types/:id` - Get work type by ID
- `POST /api/work-types` - Create new work type

### Time Entries
- `GET /api/time-entries` - Get all time entries (supports query params: `client_id`, `work_type_id`, `work_date_from`, `work_date_to`, `is_invoiced=['true'|'false']`)
- `GET /api/time-entries/:id` - Get time entry by ID
- `POST /api/time-entries` - Create new time entry (accepts `invoice_id` for association)
- `PUT /api/time-entries/:id` - Update time entry (supports updating `invoice_id`)
- `DELETE /api/time-entries/:id` - Delete time entry

### Invoices
- `GET /api/invoices` - Get all invoices (supports query params: `client_id`, `status`)
- `GET /api/invoices/:id` - Get invoice by ID (includes invoice lines)
- `POST /api/invoices` - Create new invoice (with invoice lines)
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/:id` - Get payment by ID (includes payment applications)
- `POST /api/payments` - Create new payment (with payment applications)
- `DELETE /api/payments/:id` - Delete payment

## Development

The server runs on port 3001 by default. The Vite dev server (port 5173) is configured to proxy `/api` requests to the Express server, so you can make API calls from your React app using relative paths like `/api/clients`.

## Running Frontend and Backend Together

You'll need two terminal windows:

1. **Terminal 1** - Start the Express server:
   ```bash
   npm run server
   ```

2. **Terminal 2** - Start the Vite dev server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173` and API calls to `/api/*` will be proxied to `http://localhost:3001`.

