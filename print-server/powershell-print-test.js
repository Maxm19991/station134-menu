const { exec } = require('child_process');

function printTestOrder() {
    // Create formatted receipt for thermal printer
    const receipt = [
        '        STATION 134',
        '         Bestelling',
        '================================',
        `Datum: ${new Date().toLocaleString('nl-NL')}`,
        'Tafel: 5',
        `Order ID: TEST-${Date.now()}`,
        '',
        'ITEMS:',
        '================================',
        '2x Hamburger Classic',
        '   Opties: Extra kaas, geen ui',
        '                         €25,00',
        '',
        '1x Friet groot',
        '                          €4,50',
        '',
        '2x Cola',
        '                          €5,50',
        '',
        '================================',
        '                TOTAAL: €35,00',
        '',
        '      Bedankt voor uw bestelling!',
        '',
        '',
        ''
    ].join('\r\n');

    // Use PowerShell to send raw text to printer
    const psCommand = `
        $printer = "EPSON TM-T88VII Receipt (1)"
        $text = @"
${receipt}
"@
        Add-Type -AssemblyName System.Drawing
        $printDoc = New-Object System.Drawing.Printing.PrintDocument
        $printDoc.PrinterSettings.PrinterName = $printer
        $printDoc.add_PrintPage({
            param($sender, $ev)
            $font = New-Object System.Drawing.Font("Courier New", 9)
            $ev.Graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, 10, 10)
        })
        $printDoc.Print()
        Write-Output "Print job sent to $printer"
    `;

    console.log('Sending test order to Epson TM-T88VII printer...');
    
    exec(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
        if (error) {
            console.error('PowerShell print error:', error.message);
        } else {
            console.log('PowerShell print result:', stdout);
        }
        if (stderr) {
            console.error('PowerShell stderr:', stderr);
        }
    });
}

printTestOrder();