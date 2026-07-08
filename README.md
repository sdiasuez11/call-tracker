# Call Tracker 📞

A lightweight, browser-based web app to track phone calls throughout the day. No server required — all data is stored locally in your browser using localStorage.

## Features

✅ **Log Calls**: One-click logging with current timestamp, or manually enter call time  
✅ **Hourly Analytics**: View calls per hour with interactive bar chart and data table  
✅ **Summary Stats**: See total calls, peak hour, and average calls per hour  
✅ **View Modes**: Filter by today, this week, or all time  
✅ **Edit/Delete**: Modify or remove past calls anytime  
✅ **Export Data**: Download calls as CSV or JSON for backup or analysis  
✅ **Responsive Design**: Works on desktop, tablet, and mobile  
✅ **Privacy**: Data stays on your device — never sent to any server  

## Getting Started

### Option 1: Local File (Simplest)
1. Clone or download this repository
2. Open `index.html` in your web browser
3. Start logging calls!

### Option 2: Local Development Server
If you want to serve it over HTTP (useful for HTTPS features or testing):

```bash
cd call-tracker

# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (requires http-server installed)
npx http-server
```

Then open `http://localhost:8000` in your browser.

## How to Use

### Logging a Call
- **Quick Log**: Click "Log Call Now" to log a call at the current time
- **Manual Log**: Click "Manual Time" to specify a different time

### Viewing Your Data
- **Today**: See all calls from today, broken down by hour
- **This Week**: View calls across the current week
- **All Time**: See your entire call history
- **Date Picker**: When viewing "Today", select a different date to see past days

### Understanding the Stats
- **Total Calls**: Sum of all calls in the selected period
- **Peak Hour**: The hour when you had the most calls
- **Avg/Hour**: Average number of calls per hour (calculated as total ÷ 24 hours)

### Editing or Deleting Calls
- In the "Logged Calls" section, click **Edit** to change the time of a call
- Click **Delete** to remove a call (requires confirmation)

### Exporting Your Data
- **CSV Export**: Download as a spreadsheet (`.csv` format)
  - Useful for analysis in Excel, Google Sheets, etc.
  - Includes: Date, Time, Hour, Full Timestamp
  
- **JSON Export**: Download raw data in JSON format
  - Useful for backup or importing into other tools
  - Contains: All call objects with timestamps and hour

### Clearing All Data
- Click "Clear All Data" in the Export section
- **Warning**: This will permanently delete all your logged calls (requires double confirmation)

## Data Structure

Calls are stored as objects with the following structure:
```json
{
  "id": "call_1234567890_abc123def",
  "timestamp": "2026-04-24T14:30:00.000Z",
  "hour": 14
}
```

All data is stored in your browser's `localStorage` and never leaves your device.

## Keyboard Shortcuts

- **Enter**: Log a new call (when not editing)

## Mobile Tips

- Use "Log Call Now" for quick logging on your phone
- Swipe to see the full chart on smaller screens
- Pinch to zoom the chart if needed

## Browser Support

Works on any modern browser with localStorage support:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile, etc.)

## Troubleshooting

### "Storage quota exceeded" error
- You've logged too many calls for your browser's storage
- **Solution**: Export your data (CSV/JSON) and clear old calls, or clear all data

### Data not saving
- Check if localStorage is enabled in your browser
- Private/Incognito mode may not support persistent storage
- Try a regular browsing session instead

### Chart not showing
- Ensure JavaScript is enabled in your browser
- Try refreshing the page
- Check browser console for errors (F12 → Console tab)

## Technical Details

- **Framework**: Vanilla JavaScript (no dependencies required)
- **Storage**: Browser localStorage (max ~5-10 MB per domain)
- **Charts**: Chart.js 3.x
- **Styling**: Modern CSS3 with mobile-first responsive design
- **Accessibility**: Semantic HTML5 structure

## Project Files

```
call-tracker/
├── index.html       # Main UI and structure
├── styles.css       # All styling (responsive design)
├── app.js          # Main application logic
├── storage.js      # localStorage management
├── charts.js       # Chart.js integration
├── export.js       # CSV/JSON export functionality
└── README.md       # This file
```

## Development Notes

- **No build step required**: Just open `index.html` and it works
- **No external API calls**: Everything runs locally
- **Modular structure**: Each file has a single responsibility
  - `storage.js`: Data persistence
  - `charts.js`: Visualization
  - `export.js`: Data export
  - `app.js`: UI logic and state management

## License

Free to use and modify for personal or commercial projects.

## Feedback

If you find bugs or have feature requests, please document them and feel free to improve the code!

---

**Happy call tracking! 📞**
