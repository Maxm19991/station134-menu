const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');

// Configuration
const WEBHOOK_URL = 'https://68a78e63b6598965dcaab232--graceful-lebkuchen-da9a1f.netlify.app/.netlify/functions/store-order';
const POLL_INTERVAL = 30000; // Check every 30 seconds
const PROCESSED_ORDERS_FILE = path.join(__dirname, 'processed-orders.json');

// Initialize printer
let printer;

function initializePrinter() {
    try {
        printer = new ThermalPrinter({
            type: PrinterTypes.EPSON,
            interface: 'printer:TM-T88V', // Adjust this to match your printer name in Windows
            characterSet: CharacterSet.PC852_LATIN2,
            removeSpecialCharacters: false,
            lineCharacter: "=",
        });
        
        console.log('Printer initialized successfully');
        return true;
    } catch (error) {
        console.error('Failed to initialize printer:', error);
        console.log('Available printer options:');
        console.log('- Make sure Epson TM T88V is properly installed in Windows');
        console.log('- Check printer name in Windows Control Panel > Devices and Printers');
        console.log('- Update the interface name in this file if needed');
        return false;
    }
}

// Load processed orders to avoid duplicates
function loadProcessedOrders() {
    try {
        if (fs.existsSync(PROCESSED_ORDERS_FILE)) {
            const data = fs.readFileSync(PROCESSED_ORDERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading processed orders:', error);
    }
    return [];
}

// Save processed order ID
function saveProcessedOrder(orderId) {
    try {
        const processedOrders = loadProcessedOrders();
        processedOrders.push(orderId);
        
        // Keep only last 1000 orders to prevent file from growing too large
        if (processedOrders.length > 1000) {
            processedOrders.splice(0, processedOrders.length - 1000);
        }
        
        fs.writeFileSync(PROCESSED_ORDERS_FILE, JSON.stringify(processedOrders, null, 2));
    } catch (error) {
        console.error('Error saving processed order:', error);
    }
}

// Check if order was already processed
function isOrderProcessed(orderId) {
    const processedOrders = loadProcessedOrders();
    return processedOrders.includes(orderId);
}

// Format and print order
async function printOrder(order) {
    if (!printer) {
        console.error('Printer not initialized');
        return false;
    }
    
    try {
        printer.clear();
        
        // Header
        printer.alignCenter();
        printer.setTextSize(1, 1);
        printer.bold(true);
        printer.println('STATION 134');
        printer.bold(false);
        printer.println('Bestelling');
        printer.drawLine();
        
        // Order info
        printer.alignLeft();
        printer.println(`Datum: ${new Date().toLocaleString('nl-NL')}`);
        printer.println(`Tafel: ${order.table}`);
        printer.println(`Order ID: ${order.id || 'N/A'}`);
        printer.newLine();
        
        // Items
        printer.bold(true);
        printer.println('ITEMS:');
        printer.bold(false);
        printer.drawLine();
        
        let totalAmount = 0;
        
        order.items.forEach(item => {
            const itemPrice = parseFloat(item.price.replace('€', '').replace(',', '.'));
            const itemTotal = itemPrice * item.quantity;
            totalAmount += itemTotal;
            
            printer.println(`${item.quantity}x ${item.name}`);
            
            if (item.options) {
                printer.println(`   Opties: ${item.options}`);
            }
            
            printer.alignRight();
            printer.println(`€${itemTotal.toFixed(2).replace('.', ',')}`);
            printer.alignLeft();
            printer.newLine();
        });
        
        // Total
        printer.drawLine();
        printer.bold(true);
        printer.alignRight();
        printer.setTextSize(1, 1);
        printer.println(`TOTAAL: €${totalAmount.toFixed(2).replace('.', ',')}`);
        printer.bold(false);
        printer.alignLeft();
        printer.setTextSize(0, 0);
        
        // Footer
        printer.newLine();
        printer.alignCenter();
        printer.println('Bedankt voor uw bestelling!');
        printer.newLine();
        printer.newLine();
        printer.newLine();
        
        // Cut paper
        printer.cut();
        
        // Execute print
        await printer.execute();
        console.log(`Order printed successfully for table ${order.table}`);
        return true;
        
    } catch (error) {
        console.error('Print error:', error);
        return false;
    }
}

// Check for new orders
async function checkForNewOrders() {
    try {
        console.log('Checking for new orders...');
        const response = await fetch(WEBHOOK_URL);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return;
        }
        
        const orders = await response.json();
        console.log(`Found ${orders.length} total orders`);
        
        // Process new orders
        for (const order of orders) {
            if (!isOrderProcessed(order.id)) {
                console.log(`Processing new order: ${order.id} for table ${order.table}`);
                
                const printSuccess = await printOrder(order);
                if (printSuccess) {
                    saveProcessedOrder(order.id);
                    console.log(`Order ${order.id} printed and marked as processed`);
                } else {
                    console.error(`Failed to print order ${order.id}`);
                }
            }
        }
        
    } catch (error) {
        console.error('Error checking for orders:', error);
    }
}

// Start the print server
async function startPrintServer() {
    console.log('Starting Station 134 Print Server...');
    console.log('Webhook URL:', WEBHOOK_URL);
    console.log('Poll interval:', POLL_INTERVAL / 1000, 'seconds');
    
    // Initialize printer
    if (!initializePrinter()) {
        console.error('Failed to initialize printer. Exiting...');
        process.exit(1);
    }
    
    // Start polling for orders
    console.log('Print server started. Monitoring for new orders...');
    setInterval(checkForNewOrders, POLL_INTERVAL);
    
    // Check immediately on startup
    checkForNewOrders();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down print server...');
    process.exit(0);
});

// Start the server
startPrintServer();