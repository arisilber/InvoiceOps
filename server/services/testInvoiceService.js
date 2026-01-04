/**
 * Test script for invoice service
 * 
 * This script demonstrates how to use the createInvoiceFromTimeEntries function
 * and related helper functions.
 * 
 * To run this test:
 * 1. Ensure you have some clients and time entries in your database
 * 2. Run: node server/services/testInvoiceService.js
 */

import {
    createInvoiceFromTimeEntries,
    getNextInvoiceNumber,
    previewInvoiceFromTimeEntries
} from './invoiceService.js';

async function runTests() {
    console.log('🧪 Testing Invoice Service\n');

    try {
        // Test 1: Get next invoice number
        console.log('Test 1: Getting next invoice number...');
        const nextNumber = await getNextInvoiceNumber();
        console.log(`✅ Next invoice number: ${nextNumber}\n`);

        // Test 2: Preview invoice (adjust client_id and dates as needed)
        console.log('Test 2: Previewing invoice...');
        try {
            const preview = await previewInvoiceFromTimeEntries(
                1,              // clientId - adjust this to match a client in your DB
                '2024-01-01',   // startDate
                '2024-12-31'    // endDate
            );

            console.log('✅ Preview successful:');
            console.log(`   Client: ${preview.client.name}`);
            console.log(`   Total entries: ${preview.total_entries}`);
            console.log(`   Lines: ${preview.lines.length}`);
            console.log(`   Subtotal: $${(preview.subtotal_cents / 100).toFixed(2)}`);
            console.log(`   Discount: $${(preview.discount_cents / 100).toFixed(2)}`);
            console.log(`   Total: $${(preview.total_cents / 100).toFixed(2)}`);

            console.log('\n   Line items:');
            preview.lines.forEach((line, idx) => {
                console.log(`   ${idx + 1}. ${line.work_type_code} - ${line.project_name || '(no project)'}`);
                console.log(`      ${line.total_minutes} minutes (${line.entry_count} entries) = $${(line.amount_cents / 100).toFixed(2)}`);
            });
            console.log();

            // Test 3: Create invoice (uncomment to actually create)
            /*
            console.log('Test 3: Creating invoice...');
            const invoice = await createInvoiceFromTimeEntries(
              1,                    // clientId
              '2024-01-01',        // startDate
              '2024-12-31',        // endDate
              nextNumber,          // invoiceNumber
              '2024-01-04',        // invoiceDate
              '2024-01-18'         // dueDate
            );
            
            console.log('✅ Invoice created successfully:');
            console.log(`   Invoice #${invoice.invoice_number}`);
            console.log(`   Status: ${invoice.status}`);
            console.log(`   Total: $${(invoice.total_cents / 100).toFixed(2)}`);
            console.log(`   Lines: ${invoice.lines.length}`);
            */

        } catch (error) {
            if (error.message.includes('not found') || error.message.includes('No uninvoiced')) {
                console.log(`⚠️  ${error.message}`);
                console.log('   This is expected if you don\'t have any uninvoiced time entries.\n');
            } else {
                throw error;
            }
        }

        console.log('✅ All tests completed!\n');
        console.log('To create an actual invoice, uncomment Test 3 in the script.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }

    process.exit(0);
}

// Run the tests
runTests();
