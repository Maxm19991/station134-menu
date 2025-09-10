const net = require('net');
const fs = require('fs');
const path = require('path');

// Printer configuration
const PRINTER_CONFIG = {
    ip: '192.168.1.19',
    port: 9100, // Standard ESC/POS port for Epson printers
    timeout: 5000
};

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';

const Commands = {
    INIT: ESC + '@',
    ALIGN_LEFT: ESC + 'a' + '\x00',
    ALIGN_CENTER: ESC + 'a' + '\x01',
    ALIGN_RIGHT: ESC + 'a' + '\x02',
    BOLD_ON: ESC + 'E' + '\x01',
    BOLD_OFF: ESC + 'E' + '\x00',
    UNDERLINE_ON: ESC + '-' + '\x01',
    UNDERLINE_OFF: ESC + '-' + '\x00',
    FONT_SIZE_NORMAL: GS + '!' + '\x00',
    FONT_SIZE_DOUBLE_WIDTH: GS + '!' + '\x10',
    FONT_SIZE_DOUBLE_HEIGHT: GS + '!' + '\x01',
    FONT_SIZE_DOUBLE: GS + '!' + '\x11',
    LINE_FEED: '\x0A',
    CARRIAGE_RETURN: '\x0D',
    CUT_PAPER: GS + 'V' + '\x42' + '\x00',
    DRAWER_KICK: ESC + 'p' + '\x00' + '\x19' + '\xFA'
};

class EpsonNetworkPrinter {
    constructor(ip = PRINTER_CONFIG.ip, port = PRINTER_CONFIG.port) {
        this.ip = ip;
        this.port = port;
        this.timeout = PRINTER_CONFIG.timeout;
    }

    // Test printer connectivity
    async testConnection() {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            
            client.setTimeout(this.timeout);
            
            client.on('connect', () => {
                console.log(`✓ Successfully connected to printer at ${this.ip}:${this.port}`);
                client.destroy();
                resolve(true);
            });
            
            client.on('error', (err) => {
                console.log(`✗ Failed to connect to printer at ${this.ip}:${this.port}`);
                console.log(`Error: ${err.message}`);
                reject(err);
            });
            
            client.on('timeout', () => {
                console.log(`✗ Connection timeout to printer at ${this.ip}:${this.port}`);
                client.destroy();
                reject(new Error('Connection timeout'));
            });
            
            console.log(`Testing connection to ${this.ip}:${this.port}...`);
            client.connect(this.port, this.ip);
        });
    }

    // Send raw data to printer
    async sendToPrinter(data) {
        return new Promise((resolve, reject) => {
            const client = new net.Socket();
            
            client.setTimeout(this.timeout);
            
            client.on('connect', () => {
                console.log('Connected to printer, sending data...');
                client.write(data);
                
                // Wait a bit for data to be sent, then close
                setTimeout(() => {
                    client.destroy();
                    console.log('Print job sent successfully');
                    resolve(true);
                }, 1000);
            });
            
            client.on('error', (err) => {
                console.error('Printer communication error:', err.message);
                reject(err);
            });
            
            client.on('timeout', () => {
                console.error('Printer communication timeout');
                client.destroy();
                reject(new Error('Communication timeout'));
            });
            
            client.connect(this.port, this.ip);
        });
    }

    // Print a test receipt
    async printTest() {
        const receipt = 
            Commands.INIT +
            Commands.ALIGN_CENTER +
            Commands.BOLD_ON +
            Commands.FONT_SIZE_DOUBLE +
            'STATION 134' + Commands.LINE_FEED +
            Commands.FONT_SIZE_NORMAL +
            Commands.BOLD_OFF +
            'Test Bestelling' + Commands.LINE_FEED +
            this.drawLine() + 
            Commands.ALIGN_LEFT +
            Commands.LINE_FEED +
            `Datum: ${new Date().toLocaleString('nl-NL')}` + Commands.LINE_FEED +
            'Tafel: TEST' + Commands.LINE_FEED +
            `Order ID: TEST-${Date.now()}` + Commands.LINE_FEED +
            Commands.LINE_FEED +
            Commands.BOLD_ON +
            'ITEMS:' + Commands.LINE_FEED +
            Commands.BOLD_OFF +
            this.drawLine() +
            '1x Hamburger Classic' + Commands.LINE_FEED +
            '   Extra kaas, geen ui' + Commands.LINE_FEED +
            Commands.ALIGN_RIGHT +
            '€12,50' + Commands.LINE_FEED +
            Commands.ALIGN_LEFT +
            Commands.LINE_FEED +
            '1x Cola' + Commands.LINE_FEED +
            Commands.ALIGN_RIGHT +
            '€2,75' + Commands.LINE_FEED +
            Commands.ALIGN_LEFT +
            Commands.LINE_FEED +
            this.drawLine() +
            Commands.BOLD_ON +
            Commands.ALIGN_RIGHT +
            'TOTAAL: €15,25' + Commands.LINE_FEED +
            Commands.BOLD_OFF +
            Commands.ALIGN_LEFT +
            Commands.LINE_FEED +
            Commands.ALIGN_CENTER +
            'Bedankt voor uw bestelling!' + Commands.LINE_FEED +
            Commands.LINE_FEED +
            Commands.LINE_FEED +
            Commands.CUT_PAPER;

        try {
            await this.sendToPrinter(receipt);
            console.log('✓ Test receipt printed successfully!');
            return true;
        } catch (error) {
            console.error('✗ Failed to print test receipt:', error.message);
            return false;
        }
    }

    // Print order from the restaurant system
    async printOrder(order) {
        try {
            let receipt = Commands.INIT;
            
            // Header
            receipt += Commands.ALIGN_CENTER + 
                      Commands.BOLD_ON + 
                      Commands.FONT_SIZE_DOUBLE + 
                      'STATION 134' + Commands.LINE_FEED +
                      Commands.FONT_SIZE_NORMAL + 
                      Commands.BOLD_OFF +
                      'Bestelling' + Commands.LINE_FEED +
                      this.drawLine();
            
            // Order info
            receipt += Commands.ALIGN_LEFT +
                      `Datum: ${new Date().toLocaleString('nl-NL')}` + Commands.LINE_FEED +
                      `Tafel: ${order.table}` + Commands.LINE_FEED +
                      `Order ID: ${order.id || 'N/A'}` + Commands.LINE_FEED +
                      Commands.LINE_FEED;
            
            // Items section
            receipt += Commands.BOLD_ON + 'ITEMS:' + Commands.LINE_FEED + Commands.BOLD_OFF +
                      this.drawLine();
            
            let totalAmount = 0;
            
            order.items.forEach(item => {
                const itemPrice = parseFloat(item.price.replace('€', '').replace(',', '.'));
                const itemTotal = itemPrice * item.quantity;
                totalAmount += itemTotal;
                
                receipt += `${item.quantity}x ${item.name}` + Commands.LINE_FEED;
                
                if (item.options) {
                    receipt += `   Opties: ${item.options}` + Commands.LINE_FEED;
                }
                
                receipt += Commands.ALIGN_RIGHT +
                          `€${itemTotal.toFixed(2).replace('.', ',')}` + Commands.LINE_FEED +
                          Commands.ALIGN_LEFT + Commands.LINE_FEED;
            });
            
            // Total
            receipt += this.drawLine() +
                      Commands.BOLD_ON +
                      Commands.ALIGN_RIGHT +
                      `TOTAAL: €${totalAmount.toFixed(2).replace('.', ',')}` + Commands.LINE_FEED +
                      Commands.BOLD_OFF +
                      Commands.ALIGN_LEFT;
            
            // Comment if present
            if (order.comment && order.comment.trim()) {
                receipt += Commands.LINE_FEED +
                          Commands.BOLD_ON + 'OPMERKING:' + Commands.LINE_FEED + Commands.BOLD_OFF +
                          order.comment.trim() + Commands.LINE_FEED;
            }
            
            // Footer
            receipt += Commands.LINE_FEED +
                      Commands.ALIGN_CENTER +
                      'Bedankt voor uw bestelling!' + Commands.LINE_FEED +
                      Commands.LINE_FEED +
                      Commands.LINE_FEED +
                      Commands.CUT_PAPER;

            await this.sendToPrinter(receipt);
            console.log(`✓ Order printed successfully for table ${order.table}`);
            return true;
            
        } catch (error) {
            console.error(`✗ Failed to print order for table ${order.table}:`, error.message);
            return false;
        }
    }

    // Helper method to draw a line
    drawLine() {
        return '================================' + Commands.LINE_FEED;
    }

    // Update printer IP (for when moving to restaurant)
    updatePrinterIP(newIP) {
        this.ip = newIP;
        console.log(`Printer IP updated to: ${newIP}`);
    }
}

module.exports = { EpsonNetworkPrinter, PRINTER_CONFIG };

// If running this file directly, run a test
if (require.main === module) {
    const printer = new EpsonNetworkPrinter();
    
    console.log('=== Epson TM-T88VII Network Printer Test ===');
    
    async function runTest() {
        try {
            // Test connection
            await printer.testConnection();
            
            // Print test receipt
            console.log('\nPrinting test receipt...');
            await printer.printTest();
            
            console.log('\n✓ All tests completed successfully!');
        } catch (error) {
            console.error('\n✗ Test failed:', error.message);
            console.log('\nTroubleshooting:');
            console.log('1. Check if printer is powered on');
            console.log('2. Verify printer IP address (currently set to:', PRINTER_CONFIG.ip + ')');
            console.log('3. Ensure printer is connected to network');
            console.log('4. Check if port 9100 is open on the printer');
        }
    }
    
    runTest();
}