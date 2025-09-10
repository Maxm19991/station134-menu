const fs = require('fs');
const { exec } = require('child_process');

// Create a simple test receipt
function createTestReceipt() {
    const receipt = `
================================
         STATION 134
          Bestelling
================================
Datum: ${new Date().toLocaleString('nl-NL')}
Tafel: 5
Order ID: TEST-${Date.now()}

ITEMS:
================================
2x Hamburger Classic
   Opties: Extra kaas, geen ui
                          €25,00

1x Friet groot
                           €4,50

2x Cola
                           €5,50

================================
                 TOTAAL: €35,00

       Bedankt voor uw bestelling!



`;
    
    return receipt;
}

// Print to thermal printer using Windows print command
function printReceipt() {
    const receipt = createTestReceipt();
    const tempFile = 'temp_receipt.txt';
    
    // Write receipt to temporary file
    fs.writeFileSync(tempFile, receipt, 'utf8');
    
    // Print using Windows print command
    const printCommand = `print /D:"EPSON TM-T88VII Receipt (1)" "${tempFile}"`;
    
    console.log('Printing test receipt...');
    console.log('Command:', printCommand);
    
    exec(printCommand, (error, stdout, stderr) => {
        if (error) {
            console.error('Print error:', error);
        } else {
            console.log('Print successful!');
            console.log('stdout:', stdout);
        }
        
        // Clean up temp file
        try {
            fs.unlinkSync(tempFile);
        } catch (e) {
            // Ignore cleanup errors
        }
    });
}

// Run the test
printReceipt();