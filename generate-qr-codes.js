const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// List of all table numbers
const tables = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '111', '112', '113',
    'Picknic 1', 'Picknic 2', 'Picknic 3'
];

// Base URL for the website - Netlify URL
const baseUrl = 'https://68a78e63b6598965dcaab232--graceful-lebkuchen-da9a1f.netlify.app';

// Create qr-codes directory if it doesn't exist
const qrCodesDir = path.join(__dirname, 'qr-codes');
if (!fs.existsSync(qrCodesDir)) {
    fs.mkdirSync(qrCodesDir);
}

async function generateQRCodes() {
    console.log('Generating QR codes for Station 134 tables...\n');
    
    for (const table of tables) {
        try {
            // Create URL with table parameter
            const url = `${baseUrl}/?table=${encodeURIComponent(table)}`;
            
            // Generate filename (replace spaces and special chars for file system)
            const filename = `table-${table.replace(/\s+/g, '-').toLowerCase()}.png`;
            const filepath = path.join(qrCodesDir, filename);
            
            // Generate QR code
            await QRCode.toFile(filepath, url, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });
            
            console.log(`✓ Generated QR code for Table ${table}: ${filename}`);
        } catch (error) {
            console.error(`✗ Error generating QR code for Table ${table}:`, error.message);
        }
    }
    
    console.log('\n🎉 QR code generation complete!');
    console.log(`📁 QR codes saved in: ${qrCodesDir}`);
    console.log(`🌐 Base URL used: ${baseUrl}`);
    console.log('\n💡 Remember to update the baseUrl in this script to your actual website domain before printing!');
}

generateQRCodes();