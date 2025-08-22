# Station 134 Print Server Setup

## Prerequisites on Work Computer

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Choose LTS version
   - Install with default settings

2. **Install Epson TM T88V Printer**
   - Install printer drivers from Epson website
   - Connect printer via USB or network
   - Test print from Windows (Control Panel > Devices and Printers)
   - Note the exact printer name in Windows

## Installation Steps

1. **Copy print-server folder to work computer**
   - Transfer the entire `print-server` folder to the work computer
   - Place it anywhere convenient (Desktop, Documents, etc.)

2. **Install dependencies**
   ```cmd
   cd path\to\print-server
   npm install
   ```

3. **Configure printer name**
   - Open `server.js`
   - Find line: `interface: 'printer:TM-T88V'`
   - Replace `TM-T88V` with the exact printer name from Windows
   - Common names: `TM-T88V`, `EPSON TM-T88V Receipt`, `TM-T88V (USB)`

4. **Start the print server**
   ```cmd
   npm start
   ```

## How It Works

1. Customer places order on website
2. Payment completes via Mollie
3. Order is stored in Netlify function
4. Print server (running on work PC) polls for new orders every 30 seconds
5. When new order found, it prints receipt on Epson TM T88V
6. Order is marked as printed to avoid duplicates

## Troubleshooting

**Printer Not Found:**
- Check printer name in Windows Device Manager
- Ensure printer is powered on and connected
- Update the `interface` setting in server.js

**No Orders Printing:**
- Check console for error messages
- Verify internet connection on work computer
- Test webhook URL manually in browser

**Permission Errors:**
- Run Command Prompt as Administrator
- Install Node.js dependencies as Administrator

## Testing

1. Place a test order through the website
2. Check print server console for "Processing new order" message
3. Receipt should print automatically on TM T88V

## Receipt Format

```
        STATION 134
        Bestelling
========================
Datum: 22/08/2025 14:30:15
Tafel: 5
Order ID: order_12345

ITEMS:
========================
2x Frites zonder
                  €6,40

1x Cola (Klein)
   Opties: Klein
                  €2,50

========================
        TOTAAL: €8,90

   Bedankt voor uw bestelling!
```