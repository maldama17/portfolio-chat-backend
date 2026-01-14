# MichaelLLM - Portfolio Chat Backend

A secure, serverless chat backend for embedding an AI assistant on your portfolio website.

## Features

- **OpenAI Integration** - GPT-4o-mini for fast, cost-effective responses
- **CORS Protection** - Only accepts requests from your domain
- **Rate Limiting** - Server-side IP limiting + client-side tracking
- **Supabase Logging** - Track conversations for insights
- **Customizable Prompts** - Easy-to-edit system prompt and knowledge base

## Quick Start

### 1. Prerequisites

Create accounts for:
- [GitHub](https://github.com) (to store code)
- [Vercel](https://vercel.com) (to host backend)
- [OpenAI](https://platform.openai.com) (for AI responses)
- [Supabase](https://supabase.com) (optional, for logging)

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New → Project
3. Import your GitHub repository
4. Click Deploy

### 3. Add Environment Variables

In Vercel: Project → Settings → Environment Variables

Add these:

| Variable | Value | Required |
|----------|-------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | Yes |
| `SUPABASE_URL` | Your Supabase project URL | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service key | No |

**After adding variables, redeploy:** Deployments → Latest → Redeploy

### 4. Set Up Supabase (Optional)

1. Create a new Supabase project
2. Go to Table Editor → New Table
3. Create table `chat_logs` with columns:
   - `session_id` (text)
   - `page_url` (text)
   - `user_message` (text)
   - `assistant_message` (text)
   - `clicked_suggestion` (text, nullable)

### 5. Test Your Endpoint

```bash
curl -X POST https://YOUR-URL.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What projects has Michael worked on?"}'
```

### 6. Add Widget to Webflow

1. Copy contents of `widget/embed.html`
2. In Webflow: Project Settings → Custom Code → Footer Code
3. Paste the code
4. Update `ENDPOINT` to your Vercel URL
5. Add a button in your nav: `onclick="toggleMichaelLLM()"`
6. Publish

## File Structure

```
portfolio-chat-backend/
├── package.json          # Project config
├── api/
│   └── chat.js           # Main serverless function
├── prompts/
│   ├── system.md         # Bot personality (edit this!)
│   └── knowledge.md      # Your portfolio facts (fill this in!)
├── widget/
│   └── embed.html        # Webflow embed code
├── test.html             # Local testing page
└── README.md
```

## Customization

### Edit Bot Personality
Edit `prompts/system.md` to change how the bot responds.

### Add Your Portfolio Info
Fill in `prompts/knowledge.md` with your:
- Bio and background
- Work experience
- Featured projects
- Contact information

### Update Allowed Origins
In `api/chat.js`, update `ALLOWED_ORIGINS`:

```javascript
const ALLOWED_ORIGINS = [
  'https://aldama.webflow.io',
  'https://yourdomain.com',  // Add your custom domain
];
```

## Testing Locally

1. Open `test.html` in your browser
2. The UI simulates your portfolio
3. Click "Chat with AI" to test the widget
4. Note: Backend must be deployed for API calls to work

## Security

- API keys stored securely in Vercel environment variables
- CORS restricts requests to your domain only
- Rate limiting prevents abuse (20 requests per 30 min per IP)
- Input sanitization prevents injection attacks
- System prompt hardened against jailbreak attempts

## Costs

With GPT-4o-mini:
- ~$0.15 per 1M input tokens
- ~$0.60 per 1M output tokens
- Typical conversation: ~$0.001-0.002

Set up [OpenAI usage limits](https://platform.openai.com/account/limits) to cap spending.

## Support

Questions? Issues? 
- Check the test.html page for setup checklist
- Review Vercel deployment logs for errors
- Ensure environment variables are set correctly
