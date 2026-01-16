# MichaelLLM FAQ & Troubleshooting Guide

> A friendly guide for non-engineers building their first AI chatbot.

---

## Table of Contents

1. [Understanding the Basics](#understanding-the-basics)
2. [Deployment & Hosting](#deployment--hosting)
3. [Making Changes](#making-changes)
4. [API Keys & Environment Variables](#api-keys--environment-variables)
5. [Testing Your Chatbot](#testing-your-chatbot)
6. [Common Errors & Fixes](#common-errors--fixes)
7. [Costs & Billing](#costs--billing)
8. [Security Basics](#security-basics)
9. [Customization](#customization)
10. [Getting Help](#getting-help)

---

## Understanding the Basics

### What is a "backend" and why do I need one?

**Simple explanation:** Your chatbot has two parts:
- **Frontend (widget):** The chat bubble your visitors see and interact with on your website
- **Backend (API):** A hidden server that talks to OpenAI and sends responses back

**Why can't I just call OpenAI directly from my website?**
Your OpenAI API key is like a password. If you put it in your website's code, anyone could view your page source, steal your key, and run up your bill. The backend keeps your key secret on a secure server.

**Analogy:** Think of it like a restaurant. The frontend is the menu and waiter (what customers see). The backend is the kitchen (where the actual cooking happens, hidden from customers).

---

### What is Vercel?

Vercel is a cloud platform that runs your backend code. It's:
- **Free** for small projects (hobby tier)
- **Automatic** — deploys your code when you push to GitHub
- **Serverless** — you only pay when someone actually uses your chatbot

**You don't need to understand servers** — Vercel handles all of that. You just upload your code.

---

### What is an API?

API stands for "Application Programming Interface." It's just a way for two programs to talk to each other.

When someone types in your chatbot:
1. Your widget sends the message to your Vercel API
2. Your API sends it to OpenAI's API
3. OpenAI sends back a response
4. Your API sends it back to your widget
5. The widget displays it

**You don't write any of this communication code** — it's already done for you in `api/chat.js`.

---

### What is GitHub and why do I need it?

GitHub is where your code lives online. It's like Google Drive, but for code.

**Why it matters:**
- Vercel watches your GitHub repository
- When you push new code to GitHub, Vercel automatically updates your live chatbot
- It's also a backup of all your code

---

## Deployment & Hosting

### How do I deploy my chatbot for the first time?

**Step-by-step:**

1. **Create a GitHub account** (if you don't have one)
   - Go to [github.com](https://github.com) and sign up

2. **Push your code to GitHub**
   ```bash
   # In your terminal, navigate to your project folder
   cd /path/to/portfolio-chat-backend
   
   # Initialize git (only needed once)
   git init
   
   # Add all files
   git add .
   
   # Create your first commit
   git commit -m "Initial commit"
   
   # Add your GitHub repository as the destination
   git remote add origin https://github.com/YOUR-USERNAME/portfolio-chat-backend.git
   
   # Push to GitHub
   git push -u origin main
   ```

3. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign up with GitHub
   - Click "New Project"
   - Select your `portfolio-chat-backend` repository
   - Click "Deploy"

4. **Add your API keys** (see [Environment Variables section](#how-do-i-add-environment-variables-in-vercel))

5. **Update your widget** with your Vercel URL
   - Find your URL in Vercel dashboard (e.g., `https://portfolio-chat-backend.vercel.app`)
   - Update the `ENDPOINT` in your widget code

---

### How do I deploy changes after the initial setup?

**Every time you make changes:**

```bash
# 1. Save your files in Cursor/VS Code

# 2. Stage your changes
git add .

# 3. Commit with a message describing what you changed
git commit -m "Updated system prompt"

# 4. Push to GitHub (Vercel auto-deploys)
git push
```

**That's it!** Vercel automatically detects the push and deploys within seconds.

**To verify your deployment:**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your project
3. You should see a new deployment with a green checkmark

---

### Do I need to do anything in Vercel after pushing code?

**No!** Vercel automatically:
- Detects your GitHub push
- Builds your code
- Deploys it to the same URL

You only need to touch Vercel when:
- Adding/changing environment variables
- Checking error logs
- Setting up a custom domain

---

## Making Changes

### How do I update what my chatbot knows about me?

Edit the file `prompts/knowledge.md`. This is your chatbot's "memory" about you.

**Step-by-step:**
1. Open `prompts/knowledge.md` in Cursor
2. Update the content with your information
3. Save the file
4. Deploy your changes:
   ```bash
   git add .
   git commit -m "Updated knowledge base"
   git push
   ```

**Example knowledge.md structure:**
```markdown
## About Michael

Michael Aldama is a product designer based in San Francisco...

## Projects

### Project Name
- Role: Lead Designer
- Timeline: 2023
- Problem: ...
- Solution: ...
- Outcome: ...

## Contact

- Email: hello@example.com
- LinkedIn: linkedin.com/in/username
```

---

### How do I change my chatbot's personality?

Edit `prompts/system.md`. This controls how your chatbot behaves.

**Things you can customize:**
- Tone (formal, casual, playful)
- How it introduces itself
- What topics it focuses on
- How it handles off-topic questions

---

### How do I update the widget's appearance?

The widget code lives in `widget/embed.html`. 

**To change colors**, edit the CSS variables at the top:
```css
:root {
  --mllm-primary: #2D3748;     /* Main dark color */
  --mllm-accent: #4A5568;      /* Secondary color */
  --mllm-bg: #FFFFFF;          /* Background */
  --mllm-coral: #E07B67;       /* Accent/highlight color */
}
```

**After editing the widget:**
1. Copy the entire contents of `widget/embed.html`
2. Go to Webflow → Project Settings → Custom Code → Footer Code
3. Replace the old code with your new code
4. Publish your Webflow site

---

### I made changes but nothing happened. Why?

**Checklist:**

1. **Did you save the file?** (Cmd+S on Mac, Ctrl+S on Windows)

2. **Did you push to GitHub?**
   ```bash
   git status  # Shows what files changed
   git add .
   git commit -m "Your message"
   git push
   ```

3. **Did Vercel deploy successfully?**
   - Check [vercel.com/dashboard](https://vercel.com/dashboard)
   - Look for green checkmark on latest deployment

4. **Are you testing the right URL?**
   - Clear your browser cache (Cmd+Shift+R on Mac)
   - Make sure you're not testing a cached version

5. **For widget changes:** Did you update Webflow?
   - Widget code doesn't auto-deploy — you must copy it to Webflow manually

---

## API Keys & Environment Variables

### What is an environment variable?

An environment variable is a secret value that your code can access, but isn't visible in your code files.

**Why use them?**
- Keep secrets (like API keys) safe
- Different values for development vs production
- Easy to change without editing code

---

### How do I add environment variables in Vercel?

**Step-by-step:**

1. Go to [vercel.com](https://vercel.com) and log in
2. Click on your project (`portfolio-chat-backend`)
3. Click **Settings** (tab at the top)
4. Click **Environment Variables** (in the left sidebar)
5. Add each variable:
   - **Name:** `OPENAI_API_KEY`
   - **Value:** Your actual API key (starts with `sk-`)
   - **Environment:** Select all (Production, Preview, Development)
6. Click **Save**

**Required variables for this project:**
| Variable Name | Where to get it |
|--------------|-----------------|
| `OPENAI_API_KEY` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `SUPABASE_URL` | Optional - Supabase dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional - Supabase dashboard |

---

### How do I get an OpenAI API key?

**Step-by-step:**

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Click your profile icon → **View API keys**
4. Click **Create new secret key**
5. Give it a name (e.g., "Portfolio Chatbot")
6. **Copy the key immediately** — you won't see it again!
7. Add it to Vercel as `OPENAI_API_KEY`

**Important:** Add a payment method at [platform.openai.com/account/billing](https://platform.openai.com/account/billing) or your API won't work after free credits run out.

---

### My API key isn't working. What do I check?

1. **Is the key correct?**
   - OpenAI keys start with `sk-`
   - Make sure you didn't copy extra spaces

2. **Did you add it to Vercel?**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Confirm `OPENAI_API_KEY` is listed

3. **Did you redeploy after adding the key?**
   - Go to Vercel → Deployments tab
   - Click the three dots on the latest deployment
   - Click "Redeploy"

4. **Do you have billing set up with OpenAI?**
   - Go to [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
   - Add a payment method
   - Free trial credits expire

5. **Did you accidentally expose your key?**
   - If your key was ever in code that was pushed to GitHub, it may be disabled
   - Generate a new key and try again

---

## Testing Your Chatbot

### How do I test locally before deploying?

**Option 1: Use the test.html file**
1. Open `test.html` in a browser (double-click the file)
2. This simulates your Webflow site
3. Click "Chat with AI" to open the widget

**Note:** This still calls your deployed Vercel backend. For true local testing, use Option 2.

**Option 2: Run Vercel locally**
```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Log in to Vercel (one-time)
vercel login

# Start local server
vercel dev
```

Then temporarily change your widget's endpoint:
```javascript
const ENDPOINT = 'http://localhost:3000/api/chat';
```

---

### How do I test my API directly?

Use this command in your terminal:

```bash
curl -X POST https://YOUR-URL.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What projects has Michael worked on?"}'
```

Replace `YOUR-URL` with your actual Vercel URL.

**Expected response:**
```json
{
  "reply": "Michael has worked on several interesting projects...",
  "followups": ["Tell me more about that.", "What was the outcome?"],
  "meta": { "remaining_messages": 19 }
}
```

---

### How do I check if my chatbot is actually live?

1. **Check Vercel deployment:**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Your latest deployment should show a green checkmark

2. **Visit your API directly:**
   - Go to `https://YOUR-URL.vercel.app/api/chat` in a browser
   - You should see: `{"error":"Method not allowed. Use POST."}`
   - This error is actually good! It means your API is running.

3. **Test the actual widget:**
   - Go to your Webflow site
   - Click your "Chat with AI" button
   - Send a test message

---

## Common Errors & Fixes

### "Method not allowed. Use POST."

**This is not an error!** It means your API is working. 

Your API only accepts POST requests (when you send a message), not GET requests (when you visit the URL in a browser).

---

### "OpenAI API key not configured"

**Cause:** Your Vercel deployment doesn't have the API key.

**Fix:**
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add `OPENAI_API_KEY` with your OpenAI key
3. Redeploy: Vercel → Deployments → Latest → Redeploy

---

### "CORS error" or "Blocked by CORS policy"

**Cause:** Your website's domain isn't in the allowed list.

**Fix:** Edit `api/chat.js` and add your domain:

```javascript
const ALLOWED_ORIGINS = [
  'https://aldama.webflow.io',
  'https://www.yourdomain.com',  // Add your domain
  'https://yourdomain.com',      // Add without www too
  'http://localhost:3000',
  'null'
];
```

Then push to GitHub to deploy.

---

### "Rate limited" or "429 error"

**Cause:** Too many messages sent in a short time.

**This is intentional!** It protects you from:
- Bots spamming your chatbot
- Accidental billing spikes

**Default limits:**
- 20 messages per 30 minutes per user

**To adjust:** Edit `api/chat.js`:
```javascript
const RATE_LIMIT = {
  windowMs: 30 * 60 * 1000,  // 30 minutes
  maxRequests: 20            // Change this number
};
```

---

### "Hmm, I'm having trouble connecting"

**Cause:** Widget can't reach your API.

**Troubleshooting:**
1. **Check your endpoint URL** in `widget/embed.html`:
   ```javascript
   const ENDPOINT = 'https://portfolio-chat-backend.vercel.app/api/chat';
   ```
   Make sure it matches your Vercel URL exactly.

2. **Check Vercel is running:**
   - Visit your Vercel URL directly
   - Look for the "Method not allowed" message

3. **Check browser console:**
   - Right-click → Inspect → Console tab
   - Look for red error messages

4. **Check Vercel logs:**
   - Go to Vercel → Your Project → Logs tab
   - Look for errors when you send a message

---

### "AI service error" or "500 error"

**Cause:** Something went wrong on the server side.

**Troubleshooting:**
1. **Check Vercel logs** for the actual error:
   - Vercel → Your Project → Logs tab

2. **Common causes:**
   - OpenAI API key is invalid or expired
   - OpenAI is having an outage
   - Your prompt files have syntax errors

3. **Check OpenAI status:**
   - Visit [status.openai.com](https://status.openai.com)

---

### Widget doesn't appear on my Webflow site

**Checklist:**

1. **Did you add the code to the right place?**
   - Webflow → Project Settings → Custom Code → **Footer Code**
   - Not Header Code!

2. **Did you publish your Webflow site?**
   - Changes to Custom Code require publishing

3. **Do you have a button to open it?**
   - Add `onclick="toggleMichaelLLM()"` to a button/link
   - Or call `openMichaelLLM()` from your own code

4. **Check for JavaScript errors:**
   - Right-click your page → Inspect → Console
   - Look for red errors

---

### Changes I made aren't showing up

**For backend changes (api/chat.js, prompts/):**
1. Did you save the file?
2. Did you `git add . && git commit -m "message" && git push`?
3. Check Vercel for successful deployment

**For widget changes:**
1. Did you copy new code to Webflow?
2. Did you publish Webflow?
3. Clear browser cache: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

---

## Costs & Billing

### How much does this cost?

**Vercel:** Free for hobby projects
- 100GB bandwidth/month
- Unlimited deployments
- No credit card needed

**OpenAI:** Pay-as-you-go
- GPT-4o-mini (what your chatbot uses): ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens
- Typical conversation: $0.001-0.005 (fraction of a penny)
- 100 conversations/day ≈ $3-15/month

**Webflow:** Depends on your existing plan

**Supabase (optional):** Free tier includes 500MB database

---

### How do I set a spending limit on OpenAI?

**Step-by-step:**

1. Go to [platform.openai.com/account/limits](https://platform.openai.com/account/limits)
2. Set a **Monthly budget** (e.g., $20)
3. Set an **Email alert threshold** (e.g., $10)

**Recommendation for starting out:** Set a $10-20 monthly limit. You can always increase it later.

---

### How do I monitor my OpenAI usage?

1. Go to [platform.openai.com/usage](https://platform.openai.com/usage)
2. View daily and monthly costs
3. See which API calls are using the most tokens

---

## Security Basics

### Is my API key safe?

**Yes, if you followed the setup correctly.** Your API key should:
- ✅ Be stored in Vercel Environment Variables
- ✅ Never appear in your code files
- ✅ Never be committed to GitHub

**Check:** Search your codebase for your key:
```bash
grep -r "sk-" .
```
If it finds your actual key in any file, remove it immediately and generate a new key.

---

### Can someone abuse my chatbot?

Your chatbot has built-in protections:

1. **Rate limiting:** Users can only send 20 messages per 30 minutes
2. **CORS protection:** Only your domains can use the API
3. **Input sanitization:** Malicious input is cleaned
4. **Message length limits:** Max 1000 characters per message

---

### Should I worry about prompt injection?

Your system prompt includes security instructions to resist manipulation:
- Stays in character as "MichaelLLM"
- Won't reveal system instructions
- Redirects jailbreak attempts to portfolio topics

**However:** No AI is 100% secure. For a portfolio chatbot, this level of protection is appropriate. Don't use this for anything handling sensitive data.

---

## Customization

### How do I add my own starter questions?

Edit the `SEED_PROMPTS` array in `widget/embed.html`:

```javascript
const SEED_PROMPTS = [
  "What projects are you most proud of?",
  "Tell me about your design process.",
  "What kind of roles are you looking for?",
  // Add your own questions here
];
```

The widget randomly selects 3 to display.

---

### How do I change the chatbot's name?

1. **In the widget:** Search for "MichaelLLM" in `widget/embed.html` and replace
2. **In the system prompt:** Update `prompts/system.md`
3. **In the API:** Update `api/chat.js` if needed

---

### How do I add my custom domain?

**In Vercel:**
1. Go to your project → Settings → Domains
2. Add your domain (e.g., `api.yourdomain.com`)
3. Follow DNS configuration instructions

**Then update your widget:**
```javascript
const ENDPOINT = 'https://api.yourdomain.com/api/chat';
```

---

## Getting Help

### Where do I look when something breaks?

**Check in this order:**

1. **Browser Console** (for widget issues)
   - Right-click page → Inspect → Console tab

2. **Vercel Logs** (for API issues)
   - Vercel → Your Project → Logs tab

3. **Vercel Deployments** (for deployment issues)
   - Vercel → Your Project → Deployments tab

4. **OpenAI Status** (for AI issues)
   - [status.openai.com](https://status.openai.com)

---

### Useful commands to remember

```bash
# Check what files have changed
git status

# See your recent commits
git log --oneline -5

# Push changes to deploy
git add . && git commit -m "message" && git push

# Run locally
vercel dev

# Check if Vercel CLI is installed
vercel --version
```

---

### Glossary

| Term | Meaning |
|------|---------|
| **API** | A way for programs to talk to each other |
| **Backend** | Server-side code (hidden from users) |
| **CORS** | Security feature that controls which websites can call your API |
| **Deploy** | Make your code live on the internet |
| **Environment Variable** | A secret value stored outside your code |
| **Frontend** | Client-side code (what users see) |
| **Git** | Version control system for tracking code changes |
| **Push** | Upload your code changes to GitHub |
| **Rate Limit** | A cap on how many requests someone can make |
| **Repository (Repo)** | A project folder tracked by Git |
| **Serverless** | Cloud functions that run on-demand (no server management) |
| **Token** | A piece of text (roughly 4 characters) - how AI models measure text |

---

*Last updated: January 2026*
