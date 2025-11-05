# Fix: Auto-Load Data When Returning to Tab

## Problem
Data is not showing up when you navigate back to a tab after saving.

## Solution
Add these two script tags to your `safety-office.html` file.

---

## Step 1: Add Scripts to HTML

Open `safety-office.html` and add these two script tags **before the closing `</body>` tag**:

```html
<!-- Add these scripts before </body> -->
<script src="/js/safety-api-client.js"></script>
<script src="/js/safety-tab-loader.js"></script>

</body>
</html>
```

**Important:** Make sure they are in this order:
1. `safety-api-client.js` (the API functions)
2. `safety-tab-loader.js` (the auto-loader)

---

## Step 2: Update Your Save Button Handlers

Replace your existing onclick handlers with the new function names:

### USC-Safe Tab
```html
<button onclick="saveUSCSafeTab()">Save</button>
```

### Fire Safety Tab
```html
<button onclick="saveFireSafetyTab()">Save</button>
```

### Gas Safety Tab
```html
<button onclick="saveGasSafetyTab()">Save</button>
```

### Electrical Safety Tab
```html
<button onclick="saveElectricalSafetyTab()">Save</button>
```

### Structural Safety Tab
```html
<button onclick="saveStructuralSafetyTab()">Save</button>
```

### Health Hazards Tab
```html
<button onclick="saveHealthHazardsTab()">Save</button>
```

### Boiler Safety Tab
```html
<button onclick="saveBoilerSafetyTab()">Save</button>
```

### Consultant Tab
```html
<button onclick="saveConsultantTab()">Save</button>
```

### DSA Tab
```html
<button onclick="saveDSATab()">Save</button>
```

### Emergency Power Tab
```html
<button onclick="saveEmergencyPowerTab()">Save</button>
```

### Safety Training Tab
```html
<button onclick="saveSafetyTrainingTab()">Save</button>
```

### UNGP Tab
```html
<button onclick="saveUNGPTab()">Save</button>
```

### Incidents Tab
```html
<button onclick="saveIncidentTab()">Save</button>
```

### Grievances Tab
```html
<button onclick="saveGrievanceTab()">Save</button>
```

---

## Step 3: Ensure Tab IDs Match

Make sure your tab panes have the correct IDs. The tab loader expects these exact IDs:

```html
<div class="tab-pane" id="usc-safe">...</div>
<div class="tab-pane" id="fire-safety">...</div>
<div class="tab-pane" id="electrical-safety">...</div>
<div class="tab-pane" id="structural-safety">...</div>
<div class="tab-pane" id="health-hazards">...</div>
<div class="tab-pane" id="gas-safety">...</div>
<div class="tab-pane" id="boiler-safety">...</div>
<div class="tab-pane" id="consultant">...</div>
<div class="tab-pane" id="dsa">...</div>
<div class="tab-pane" id="emergency-power">...</div>
<div class="tab-pane" id="safety-training">...</div>
<div class="tab-pane" id="ungp">...</div>
<div class="tab-pane" id="incidents">...</div>
<div class="tab-pane" id="grievances">...</div>
```

---

## Step 4: Test It

1. **Open the page** in your browser
2. **Open Developer Console** (F12) to see loading messages
3. **Click on a tab** - You should see: `Loading data for tab: tab-name`
4. **Fill in some data** and click Save
5. **Switch to another tab** and then **come back** - Your data should appear!

---

## What This Does

The auto-loader script:
- ✅ **Loads data when page first opens** (for the active tab)
- ✅ **Loads data when you click a tab** (using Bootstrap's `shown.bs.tab` event)
- ✅ **Works with all 14 tabs** automatically
- ✅ **Shows console messages** so you can see what's happening

---

## Troubleshooting

### Data Still Not Loading?

**Check the browser console (F12) for errors:**

1. **"SafetyAPI is not defined"**
   - Make sure `safety-api-client.js` is loaded first
   - Check the script path is correct

2. **"Form not found"**
   - Your form might have a different ID
   - Update the form ID in your HTML or check the script

3. **Network errors**
   - Make sure your backend server is running
   - Check that the API endpoints are working (test with curl)

4. **No console messages at all**
   - Scripts might not be loading
   - Check the browser Network tab to see if scripts loaded successfully

### Verify Scripts Are Loaded

In the browser console, type:
```javascript
console.log(typeof SafetyAPI);
console.log(typeof saveUSCSafeTab);
```

Both should output `"object"` and `"function"` respectively.

---

## Custom Tab IDs?

If your tab IDs are different, update the `TAB_LOADERS` object in `safety-tab-loader.js`:

```javascript
const TAB_LOADERS = {
  'your-custom-id': loadYourCustomTab,
  // ... etc
};
```

---

## Need Manual Load?

You can also manually trigger a load from console or a button:

```javascript
// Load specific tab manually
loadUSCSafeTab();
loadFireSafetyTab();
// etc.
```

---

That's it! Your data should now automatically load when you navigate between tabs.
