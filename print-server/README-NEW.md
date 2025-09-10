# Station 134 Print Server (Network Version)

This is the new network-based print server for the Epson TM-T88VII receipt printer. It connects directly to the printer via network (ESC/POS protocol) instead of using Windows printer drivers.

## 🚀 Quick Start

### 1. Test the Printer Connection
```bash
node server-final.js --test
```

### 2. Start the Print Server
```bash
node server-final.js
```

### 3. View Current Configuration
```bash
node server-final.js --config
```

## ⚙️ Configuration

All settings are stored in `printer-config.json`:

```json
{
  "printerIP": "192.168.1.19",
  "printerPort": 9100,
  "webhookUrl": "https://graceful-lebkuchen-da9a1f.netlify.app/.netlify/functions/store-order",
  "pollInterval": 30000
}
```

### Changing Printer IP (for Restaurant Deployment)

When you move the printer to the restaurant network:

1. **Find the new printer IP address:**
   - Access your router's admin panel
   - Look for "EPSON TM-T88VII" in connected devices
   - Note the IP address

2. **Update the configuration:**
   - Edit `printer-config.json`
   - Change `"printerIP"` to the new IP address
   - Save the file

3. **Test the new connection:**
   ```bash
   node server-final.js --test
   ```

4. **Restart the server:**
   ```bash
   node server-final.js
   ```

## 🖨️ How It Works

1. **Network Connection**: Connects directly to printer via TCP/IP on port 9100
2. **ESC/POS Commands**: Uses standard receipt printer commands
3. **Order Monitoring**: Polls the webhook every 30 seconds for new orders
4. **Duplicate Prevention**: Tracks processed orders to avoid reprinting

## 🔧 Troubleshooting

### Printer Connection Issues
- ✅ Verify printer is powered on
- ✅ Check network cable connection
- ✅ Test printer web interface: `http://[PRINTER_IP]`
- ✅ Verify IP address in `printer-config.json`

### Print Quality Issues
- ✅ Check paper roll is loaded correctly
- ✅ Ensure printer cover is closed
- ✅ Clean print head if necessary

### No Orders Printing
- ✅ Check internet connection
- ✅ Verify webhook URL in config
- ✅ Check server logs for errors

## 📋 Files Overview

- `server-final.js` - Main print server (use this one)
- `epson-network-printer.js` - Network printer module
- `printer-config.json` - Configuration file
- `processed-orders.json` - Tracks processed orders (auto-created)

## 🆚 Old vs New System

### Old System (Problems)
- ❌ Used Windows printer drivers (unreliable)
- ❌ Required printer to be USB/Windows connected
- ❌ Complex driver installation
- ❌ Limited network support

### New System (Benefits)  
- ✅ Direct network connection (TCP/IP)
- ✅ No Windows drivers needed
- ✅ Works from any computer on network
- ✅ Easy IP address changes
- ✅ More reliable printing
- ✅ Better error handling

## 🎯 Production Deployment

1. Copy print-server folder to restaurant computer
2. Install Node.js if not present
3. Run `npm install` in print-server folder
4. Update printer IP in `printer-config.json`
5. Test with `node server-final.js --test`
6. Start server with `node server-final.js`

The server will run continuously monitoring for new orders and printing them automatically.