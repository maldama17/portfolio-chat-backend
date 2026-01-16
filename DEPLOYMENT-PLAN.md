# Webflow Deployment Plan (with Rollback)

## 🎯 What You're Deploying
Text selection feature updates:
- ✅ Vertical bar (|) instead of quote icon
- ✅ Removed "Context" badge from widget header
- ✅ Lighter chip background colors

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Create Backup (CRITICAL - DO THIS FIRST!)
**Where**: Webflow → Project Settings → Custom Code → Footer Code  
**What to do**:
1. Open the Footer Code tab
2. Select ALL the code (Cmd+A)
3. Copy it (Cmd+C)
4. Open a new note in Notes.app or TextEdit
5. Paste the code
6. Save as: `webflow-widget-backup-[TODAY'S-DATE].txt`
7. Keep this file open in a tab - you'll need it if rollback is needed

**✅ Verification**: You have a text file with the old widget code saved

---

## 🚀 DEPLOYMENT STEPS

### 2. Copy New Widget Code
**Where**: `/Users/bbaosaos/Documents/code/portfolio-chat-backend/widget/embed.html`  
**What to do**:
1. Open `embed.html` in Cursor
2. Select ALL code (Cmd+A)
3. Copy (Cmd+C)

### 3. Deploy to Webflow
**Where**: Webflow → Project Settings → Custom Code  
**What to do**:
1. Go to your Webflow project
2. Click **Settings** (left sidebar)
3. Click **Custom Code** tab
4. Click **Footer Code** section
5. Select all existing code (Cmd+A)
6. **Paste** new code (Cmd+V)
7. Click **Save Changes** button (top right)

### 4. Publish Site
**Where**: Webflow → Publish button (top right)  
**What to do**:
1. Click the **Publish** button (top right corner)
2. Select "Publish to selected domains"
3. Click **Publish**
4. Wait 60 seconds for CDN to update

**✅ Verification**: You see "Site published successfully" message

### 5. Test on Live Site
**Where**: Your live portfolio website (in a new incognito window)  
**What to do**:
1. Open your live site in **incognito mode** (Cmd+Shift+N)
2. Select text from a project description (at least 10 characters)
3. **Check**: Floating "Add to chat" button appears
4. Click "Add to chat"
5. **Check**: Context chip shows with vertical bar (|), NOT quote icon
6. **Check**: NO "Context" badge appears next to MICHAEL.LLM in header
7. **Check**: Chip has lighter background color

**✅ Pass**: All checks above work correctly  
**❌ Fail**: Go to Rollback section below

---

## 🔄 ROLLBACK (if something breaks)

### If Test Fails:
**Where**: Webflow → Project Settings → Custom Code → Footer Code  
**What to do**:
1. Open the backup file you saved in step 1
2. Select ALL code (Cmd+A)
3. Copy (Cmd+C)
4. Go to Webflow → Settings → Custom Code → Footer Code
5. Select all current code (Cmd+A)
6. Paste backup code (Cmd+V)
7. Click **Save Changes**
8. Click **Publish** → Publish to selected domains
9. Wait 60 seconds
10. Test site again - old version should be restored

**⏱️ Time to rollback**: ~2 minutes

---

## 📝 POST-DEPLOYMENT

### If Deployment Successful:
- [ ] Test on desktop browser
- [ ] Test on mobile (iOS Safari)
- [ ] Select text from different sections (About, Projects, etc.)
- [ ] Test clear (X) button on context chip
- [ ] Test sending a message with context
- [ ] You can delete the backup file after 24 hours if everything works

### If You Need Help:
1. Take a screenshot of what you see
2. Copy any error messages from browser console (right-click → Inspect → Console tab)
3. Note which step failed

---

## 🎨 Future Customizations

### To Adjust Chip Colors Later:
**Where**: Webflow → Custom Code → Footer Code (lines 35-40)  
**What to change**:
```css
--mllm-selection-chip-bg: #FAFAFA;      /* Chip background */
--mllm-selection-chip-text: #4A5568;    /* Text color */
--mllm-selection-chip-bar: #CBD5E0;     /* Vertical bar color */
```

**Example**: To make chip even lighter, change `#FAFAFA` to `#FFFFFF` (pure white)

---

## ⏱️ Total Time Estimate
- Backup: 2 minutes
- Deploy: 3 minutes
- Test: 2 minutes
- **Total: ~7 minutes**

---

**Last Updated**: Today  
**Version**: Text Selection Feature v2 (Vertical Bar + Clean Header)
