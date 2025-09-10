const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { EpsonNetworkPrinter, PRINTER_CONFIG } = require('./epson-network-printer');

// Configuration - easily changeable for restaurant deployment
const CONFIG = {
    printerIP: '192.168.1.19', // Change this when moving to restaurant
    webhookUrl: 'https://graceful-lebkuchen-da9a1f.netlify.app/.netlify/functions/store-order',
    pollInterval: 30000, // Check every 30 seconds
    processedOrdersFile: path.join(__dirname, 'processed-orders.json')
};

// Initialize printer
let printer = new EpsonNetworkPrinter(CONFIG.printerIP);

// Load processed orders to avoid duplicates
function loadProcessedOrders() {
    try {
        if (fs.existsSync(CONFIG.processedOrdersFile)) {
            const data = fs.readFileSync(CONFIG.processedOrdersFile, 'utf8');
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
        
        fs.writeFileSync(CONFIG.processedOrdersFile, JSON.stringify(processedOrders, null, 2));
    } catch (error) {
        console.error('Error saving processed order:', error);
    }
}

// Check if order was already processed
function isOrderProcessed(orderId) {
    const processedOrders = loadProcessedOrders();
    return processedOrders.includes(orderId);
}

// Check for new orders from webhook
async function checkForNewOrders() {
    try {
        console.log('Checking for new orders...');
        const response = await fetch(CONFIG.webhookUrl);
        
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
                
                const printSuccess = await printer.printOrder(order);
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

// Test printer connection on startup
async function testPrinterConnection() {
    try {
        console.log(`Testing printer connection to ${CONFIG.printerIP}:9100...`);
        await printer.testConnection();
        return true;
    } catch (error) {
        console.error('Printer connection test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Check if printer is powered on');
        console.log('2. Verify printer IP address in CONFIG (currently:', CONFIG.printerIP + ')');
        console.log('3. Ensure printer is connected to network');
        console.log('4. Update CONFIG.printerIP if the printer has a different IP address');
        return false;
    }
}

// Start the print server
async function startPrintServer() {
    console.log('=== Station 134 Print Server (Network Version) ===');
    console.log('Printer IP:', CONFIG.printerIP);
    console.log('Webhook URL:', CONFIG.webhookUrl);
    console.log('Poll interval:', CONFIG.pollInterval / 1000, 'seconds');
    console.log('');
    
    // Test printer connection
    const printerConnected = await testPrinterConnection();
    if (!printerConnected) {
        console.error('❌ Failed to connect to printer. Please check configuration and try again.');
        process.exit(1);
    }
    
    console.log('✅ Printer connected successfully!');
    console.log('');
    console.log('🖨️  Print server started. Monitoring for new orders...');
    console.log('Press Ctrl+C to stop the server');
    console.log('');
    
    // Start polling for orders
    setInterval(checkForNewOrders, CONFIG.pollInterval);
    
    // Check immediately on startup
    checkForNewOrders();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down print server...');
    console.log('Goodbye!');
    process.exit(0);
});

// Command line argument handling
if (process.argv.includes('--test')) {
    console.log('=== Running Printer Test ===');
    
    async function runPrintTest() {
        const testSuccess = await testPrinterConnection();
        if (testSuccess) {
            console.log('\nPrinting test receipt...');
            const printSuccess = await printer.printTest();
            if (printSuccess) {
                console.log('✅ Test completed successfully!');
            } else {
                console.log('❌ Test printing failed');
                process.exit(1);
            }
        } else {
            console.log('❌ Connection test failed');
            process.exit(1);
        }
        process.exit(0);
    }
    
    runPrintTest();
} else if (process.argv.includes('--config')) {
    console.log('=== Current Configuration ===');
    console.log('Printer IP:', CONFIG.printerIP);
    console.log('Webhook URL:', CONFIG.webhookUrl);
    console.log('Poll Interval:', CONFIG.pollInterval / 1000, 'seconds');
    console.log('Processed Orders File:', CONFIG.processedOrdersFile);
    console.log('');
    console.log('To change the printer IP when moving to restaurant:');
    console.log('1. Edit server-new.js');
    console.log('2. Update CONFIG.printerIP to the new IP address');
    console.log('3. Restart the server');
    process.exit(0);
} else {
    // Start the server
    startPrintServer();
}

// Export configuration for easy access
module.exports = { CONFIG, printer };