const fs = require('fs');
const { exec } = require('child_process');

// ESC/POS commands for thermal printer
const ESC = '\x1B';
const GS = '\x1D';

// Create ESC/POS formatted receipt
function createESCPOSReceipt() {
    let receipt = '';
    
    // Initialize printer
    receipt += ESC + '@';  // Initialize
    
    // Center align and print header
    receipt += ESC + 'a' + '\x01';  // Center alignment
    receipt += GS + '!' + '\x11';   // Double width and height
    receipt += 'STATION 134\n';
    receipt += GS + '!' + '\x00';   // Normal size
    receipt += 'Bestelling\n';
    
    // Left align
    receipt += ESC + 'a' + '\x00';  // Left alignment
    receipt += '================================\n';
    receipt += `Datum: ${new Date().toLocaleString('nl-NL')}\n`;
    receipt += 'Tafel: 5\n';
    receipt += `Order ID: TEST-${Date.now()}\n\n`;
    
    // Items
    receipt += 'ITEMS:\n';
    receipt += '================================\n';
    receipt += '2x Hamburger Classic\n';
    receipt += '   Opties: Extra kaas, geen ui\n';
    receipt += ESC + 'a' + '\x02';  // Right alignment
    receipt += 'EUR 25,00\n';
    receipt += ESC + 'a' + '\x00';  // Left alignment
    receipt += '\n';
    
    receipt += '1x Friet groot\n';
    receipt += ESC + 'a' + '\x02';  // Right alignment
    receipt += 'EUR 4,50\n';
    receipt += ESC + 'a' + '\x00';  // Left alignment
    receipt += '\n';
    
    receipt += '2x Cola\n';
    receipt += ESC + 'a' + '\x02';  // Right alignment
    receipt += 'EUR 5,50\n';
    receipt += ESC + 'a' + '\x00';  // Left alignment
    receipt += '\n';
    
    // Total
    receipt += '================================\n';
    receipt += ESC + 'a' + '\x02';  // Right alignment
    receipt += GS + '!' + '\x11';   // Double size
    receipt += 'TOTAAL: EUR 35,00\n';
    receipt += GS + '!' + '\x00';   // Normal size
    receipt += ESC + 'a' + '\x01';  // Center alignment
    receipt += '\nBedankt voor uw bestelling!\n';
    
    // Feed and cut
    receipt += '\n\n\n';
    receipt += GS + 'V' + '\x00';  // Cut paper
    
    return receipt;
}

// Print using direct port access
async function printESCPOS() {
    const receipt = createESCPOSReceipt();
    const filename = 'escpos_receipt.bin';
    
    // Write binary data
    fs.writeFileSync(filename, receipt, 'binary');
    
    console.log('Sending ESC/POS formatted receipt to printer...');
    
    // Try copying directly to USB port
    const commands = [
        `copy /B "${filename}" "TMUSB001"`,
        `type "${filename}" > "\\\\localhost\\TMUSB001"`,
        `powershell "Get-Content -Path '${filename}' -Encoding Byte | Set-Content -Path 'TMUSB001' -Encoding Byte"`
    ];
    
    for (let i = 0; i < commands.length; i++) {
        console.log(`Trying method ${i + 1}: ${commands[i]}`);
        
        try {
            await new Promise((resolve, reject) => {
                exec(commands[i], (error, stdout, stderr) => {
                    if (error) {
                        console.log(`Method ${i + 1} failed:`, error.message);
                        resolve();
                    } else {
                        console.log(`Method ${i + 1} success:`, stdout);
                        resolve();
                    }
                });
            });
            break;
        } catch (e) {
            console.log(`Method ${i + 1} error:`, e);
        }
    }
    
    // Cleanup
    try {
        fs.unlinkSync(filename);
    } catch (e) {}
}

printESCPOS();