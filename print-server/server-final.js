const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { EpsonNetworkPrinter } = require('./epson-network-printer');

// Load configuration from JSON file
const CONFIG_FILE = path.join(__dirname, 'printer-config.json');

function loadConfig() {
    try {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        console.error('Error loading configuration file:', error.message);
        console.log('Using default configuration...');
        return {
            printerIP: '192.168.1.19',
            printerPort: 9100,
            webhookUrl: 'https://graceful-lebkuchen-da9a1f.netlify.app/.netlify/functions/store-order',
            pollInterval: 30000
        };
    }
}

const CONFIG = loadConfig();
const PROCESSED_ORDERS_FILE = path.join(__dirname, 'processed-orders.json');

// Initialize printer with config
let printer = new EpsonNetworkPrinter(CONFIG.printerIP, CONFIG.printerPort);

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

// Check for new orders from webhook
async function checkForNewOrders() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] Checking for new orders...`);
        const response = await fetch(CONFIG.webhookUrl);
        
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            return;
        }
        
        const orders = await response.json();
        
        // Process new orders
        let newOrdersCount = 0;
        for (const order of orders) {
            if (!isOrderProcessed(order.id)) {
                newOrdersCount++;
                console.log(`🆕 New order: ${order.id} for table ${order.table}`);
                
                const printSuccess = await printer.printOrder(order);
                if (printSuccess) {
                    saveProcessedOrder(order.id);
                    console.log(`✅ Order ${order.id} printed and processed`);
                } else {
                    console.error(`❌ Failed to print order ${order.id}`);
                }
            }
        }
        
        if (newOrdersCount === 0) {
            console.log(`[${new Date().toLocaleTimeString()}] No new orders (${orders.length} total orders checked)`);
        }
        
    } catch (error) {
        console.error('Error checking for orders:', error);
    }
}

// Test printer connection on startup
async function testPrinterConnection() {
    try {
        console.log(`🔍 Testing printer connection to ${CONFIG.printerIP}:${CONFIG.printerPort}...`);
        await printer.testConnection();
        return true;
    } catch (error) {
        console.error('❌ Printer connection test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('1. Check if printer is powered on');
        console.log('2. Verify printer IP in printer-config.json (currently:', CONFIG.printerIP + ')');
        console.log('3. Ensure printer is connected to network');
        console.log('4. Try accessing http://' + CONFIG.printerIP + ' in your browser');
        return false;
    }
}

// Start the print server
async function startPrintServer() {
    console.log('🖨️  === Station 134 Print Server === 🖨️');
    console.log('');
    console.log('📡 Configuration:');
    console.log('   Printer IP: ' + CONFIG.printerIP + ':' + CONFIG.printerPort);
    console.log('   Webhook: ' + CONFIG.webhookUrl);
    console.log('   Check interval: ' + CONFIG.pollInterval / 1000 + ' seconds');
    console.log('');
    
    // Test printer connection
    const printerConnected = await testPrinterConnection();
    if (!printerConnected) {
        console.error('❌ Cannot start server - printer connection failed');
        console.log('💡 To change printer IP: edit printer-config.json');
        process.exit(1);
    }
    
    console.log('✅ Printer connected successfully!');
    console.log('');
    console.log('🚀 Print server started successfully!');
    console.log('📝 Monitoring for new orders...');
    console.log('🛑 Press Ctrl+C to stop');
    console.log('');
    console.log('=' .repeat(50));
    console.log('');
    
    // Start polling for orders
    setInterval(checkForNewOrders, CONFIG.pollInterval);
    
    // Check immediately on startup
    checkForNewOrders();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down print server...');
    console.log('👋 Server stopped. Goodbye!');
    process.exit(0);
});

// Command line argument handling
if (process.argv.includes('--test')) {
    console.log('🧪 === Testing Printer === 🧪');
    console.log('');
    
    async function runPrintTest() {
        const testSuccess = await testPrinterConnection();
        if (testSuccess) {
            console.log('🖨️  Printing test receipt...');
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
    console.log('⚙️  === Current Configuration === ⚙️');
    console.log('');
    console.log('Printer IP:', CONFIG.printerIP);
    console.log('Printer Port:', CONFIG.printerPort);
    console.log('Webhook URL:', CONFIG.webhookUrl);
    console.log('Poll Interval:', CONFIG.pollInterval / 1000, 'seconds');
    console.log('Config File:', CONFIG_FILE);
    console.log('');
    console.log('💡 To change printer IP when moving to restaurant:');
    console.log('   1. Edit printer-config.json');
    console.log('   2. Change "printerIP" to the new IP address');
    console.log('   3. Restart the server');
    console.log('');
    process.exit(0);
} else {
    // Start the server
    startPrintServer();
}

// Export for testing
module.exports = { CONFIG, printer, loadConfig };