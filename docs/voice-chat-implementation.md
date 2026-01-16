# Voice Chat Feature - Complete Implementation Guide

**Created:** January 2026  
**Status:** Design Complete - Ready for Implementation  
**Estimated Time:** 2-4 weeks  
**Estimated Cost:** $30-50/month operational

---

## Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Prerequisites & Dependencies](#prerequisites--dependencies)
3. [Implementation Steps](#implementation-steps)
4. [Test Plans](#test-plans)
5. [Setup Verification Checklist](#setup-verification-checklist)
6. [Cost Analysis & Budgeting](#cost-analysis--budgeting)
7. [Troubleshooting Guide](#troubleshooting-guide)
8. [Production Deployment](#production-deployment)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview & Architecture

### What This Feature Adds

Voice chat allows users to have natural spoken conversations with MichaelLLM directly in the widget:

- **Push-to-Talk Mode:** Hold mic button, speak, release
- **Hands-Free Mode:** Continuous conversation with automatic speech detection
- **Real-Time Response:** 200-400ms latency (5x faster than text-to-speech pipelines)
- **Natural Interruption:** Users can cut in while the assistant is speaking
- **Graceful Fallback:** Automatically switches to text chat if voice fails

### Technical Approach

**Recommended:** OpenAI Realtime API (WebSocket-based)

**Why not classic STT→LLM→TTS pipeline?**
- Classic: 2-3 second latency (too slow for natural conversation)
- Realtime API: 200-400ms latency (feels instantaneous)
- Classic: No interruption support (rigid turn-taking)
- Realtime API: Native barge-in support
- Classic: 3 separate APIs to orchestrate and debug
- Realtime API: Single WebSocket connection

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │   Mic Button │───▶│ MediaRecorder│───▶│  VoiceChat.js   │  │
│  │   (UI/UX)    │    │  (Capture)   │    │  (Client Logic) │  │
│  └──────────────┘    └──────────────┘    └─────────────────┘  │
│                                                    │            │
│                                           WebSocket│            │
│                                                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │   Speakers   │◀───│ AudioContext │◀───│  Audio Queue    │  │
│  │  (Playback)  │    │   (Decode)   │    │  (Streaming)    │  │
│  └──────────────┘    └──────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                         WebSocket│(wss://)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL SERVERLESS                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │            api/voice-proxy.js (WebSocket)                │  │
│  │                                                          │  │
│  │  • Validates session_id & rate limits                   │  │
│  │  • Proxies WebSocket to OpenAI Realtime API             │  │
│  │  • Logs transcripts to Supabase                         │  │
│  │  • Forwards audio chunks bidirectionally                │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                  │
                         WebSocket│(wss://)
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      OPENAI REALTIME API                        │
│                                                                 │
│  wss://api.openai.com/v1/realtime                              │
│                                                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│  │   STT    │───▶│   LLM    │───▶│   TTS    │                 │
│  │ (Whisper)│    │ (GPT-4)  │    │(Realtime)│                 │
│  └──────────┘    └──────────┘    └──────────┘                 │
│                                                                 │
│  Real-time audio streaming with Voice Activity Detection       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                              Logging│
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                │
│                                                                 │
│  Tables:                                                        │
│  • voice_sessions (session tracking)                           │
│  • voice_transcripts (conversation logs)                       │
│                                                                 │
│  Storage (optional):                                            │
│  • voice-recordings bucket (audio debugging)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow: One Complete Turn

```
1. User holds mic button
   └─▶ Request microphone permission (first time only)
   └─▶ Start MediaRecorder (audio/webm)

2. Audio captured in 100ms chunks
   └─▶ Convert WebM → PCM16 format (24kHz, mono)
   └─▶ Encode as Base64
   └─▶ Send via WebSocket: { type: "input_audio_buffer.append", audio: "..." }

3. Vercel proxy forwards to OpenAI
   └─▶ No processing, just proxy
   └─▶ Logs metadata to Supabase

4. User releases button
   └─▶ Send: { type: "input_audio_buffer.commit" }

5. OpenAI processes
   └─▶ STT: Audio → "What projects have you worked on?"
   └─▶ LLM: Generate response based on system prompt + knowledge
   └─▶ TTS: Text → Audio chunks
   └─▶ Stream back: { type: "response.audio.delta", delta: "..." }

6. Client receives audio chunks
   └─▶ Decode Base64 → PCM16
   └─▶ Convert to AudioBuffer
   └─▶ Queue for playback

7. Play audio seamlessly
   └─▶ AudioContext plays chunk
   └─▶ When finished, play next chunk
   └─▶ Display transcript simultaneously

Total latency: 200-400ms from button release to audio start
```

---

## Prerequisites & Dependencies

### Required Accounts & Services

| Service | Purpose | Cost | Setup Time |
|---------|---------|------|------------|
| **OpenAI** | Realtime API access | $0.30/min | 5 min |
| **Vercel** | Host WebSocket proxy | Free (Hobby) | Already set up |
| **Supabase** | Log sessions/transcripts | Free tier OK | Already set up |

### Required Environment Variables

Add to Vercel Project Settings → Environment Variables:

```bash
# Already have these:
OPENAI_API_KEY=sk-proj-...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# New variables (optional):
VOICE_RATE_LIMIT_MAX_SESSIONS=10        # Sessions per hour per IP
VOICE_RATE_LIMIT_MAX_DURATION=600000    # Max 10 min per session (ms)
```

### NPM Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "ws": "^8.14.2"
  }
}
```

Run: `npm install ws`

### Browser Requirements

| Browser | Min Version | Support Level | Notes |
|---------|-------------|---------------|-------|
| Chrome | 90+ | ✅ Full | Best performance |
| Safari | 14.1+ | ✅ Full | Requires user gesture for AudioContext |
| Edge | 90+ | ✅ Full | Chromium-based |
| Firefox | 88+ | ⚠️ Partial | WebRTC issues on some systems |
| Mobile Safari | iOS 14.5+ | ✅ Full | Touch events work |
| Mobile Chrome | Android 10+ | ✅ Full | Touch events work |

**Browser APIs required:**
- `navigator.mediaDevices.getUserMedia`
- `MediaRecorder`
- `AudioContext` / `webkitAudioContext`
- `WebSocket`

---

## Implementation Steps

### Phase 1: Backend - WebSocket Proxy

#### Step 1.1: Create Supabase Tables

Run in Supabase SQL Editor:

```sql
-- Voice sessions table
CREATE TABLE voice_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  user_ip TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  ended_at TIMESTAMP,
  total_turns INTEGER DEFAULT 0,
  total_duration_ms INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'error'
  error_message TEXT
);

CREATE INDEX idx_voice_sessions_session_id ON voice_sessions(session_id);
CREATE INDEX idx_voice_sessions_started_at ON voice_sessions(started_at);

-- Voice transcripts table (each conversational turn)
CREATE TABLE voice_transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  turn_id TEXT NOT NULL,
  speaker TEXT NOT NULL, -- 'user' or 'assistant'
  transcript TEXT,
  audio_duration_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_voice_transcripts_session_id ON voice_transcripts(session_id);
CREATE INDEX idx_voice_transcripts_created_at ON voice_transcripts(created_at);

-- Optional: Analytics view
CREATE VIEW voice_usage_stats AS
SELECT
  DATE(started_at) as date,
  COUNT(*) as total_sessions,
  AVG(total_duration_ms) as avg_duration_ms,
  AVG(total_turns) as avg_turns,
  SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error_count,
  SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed_count
FROM voice_sessions
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

**Verification:**
```sql
-- Test insertion
INSERT INTO voice_sessions (session_id, user_ip, status) 
VALUES ('test_session', '127.0.0.1', 'active');

-- Should return 1 row
SELECT * FROM voice_sessions WHERE session_id = 'test_session';

-- Clean up
DELETE FROM voice_sessions WHERE session_id = 'test_session';
```

#### Step 1.2: Create WebSocket Proxy Endpoint

Create new file: `api/voice-proxy.js`

```javascript
// api/voice-proxy.js
// WebSocket proxy to OpenAI Realtime API

import WebSocket from 'ws';

export const config = {
  runtime: 'nodejs18.x', // WebSocket requires Node.js runtime (not Edge)
};

const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';

// Rate limiting (in-memory, resets on cold start)
const rateLimitMap = new Map();
const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 60 minutes
  maxSessions: parseInt(process.env.VOICE_RATE_LIMIT_MAX_SESSIONS || '10'),
  maxDuration: parseInt(process.env.VOICE_RATE_LIMIT_MAX_DURATION || '600000'), // 10 min
};

export default async function handler(req, res) {
  // Only handle WebSocket upgrade requests
  if (req.method !== 'GET' || req.headers.upgrade?.toLowerCase() !== 'websocket') {
    return res.status(426).json({ 
      error: 'Upgrade Required',
      message: 'This endpoint requires WebSocket connection'
    });
  }

  const url = new URL(req.url, `https://${req.headers.host}`);
  const sessionId = url.searchParams.get('session_id');

  // Validate session ID
  if (!sessionId || !/^sess_[a-z0-9_]+$/i.test(sessionId)) {
    return res.status(400).json({ error: 'Invalid or missing session_id' });
  }

  // Check rate limits
  const clientIP = getClientIP(req);
  const rateLimitCheck = checkRateLimit(clientIP);
  
  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: 'rate_limited',
      message: `Voice chat limit reached. Try again in ${rateLimitCheck.resetInMinutes} minutes.`,
      resetInMinutes: rateLimitCheck.resetInMinutes
    });
  }

  // Upgrade to WebSocket
  handleWebSocketUpgrade(req, res.socket, sessionId, clientIP);
}

function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT.maxSessions - 1 };
  }

  // Check if window expired
  if (now - record.windowStart > RATE_LIMIT.windowMs) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT.maxSessions - 1 };
  }

  // Within window - check count
  if (record.count >= RATE_LIMIT.maxSessions) {
    const resetTime = Math.ceil((record.windowStart + RATE_LIMIT.windowMs - now) / 60000);
    return { allowed: false, resetInMinutes: resetTime };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT.maxSessions - record.count };
}

function handleWebSocketUpgrade(req, socket, sessionId, clientIP) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY not configured');
    socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
    socket.destroy();
    return;
  }

  // Create WebSocket server for this connection
  const wss = new WebSocket.Server({ noServer: true });
  
  wss.handleUpgrade(req, socket, Buffer.alloc(0), (clientWs) => {
    console.log(`[${sessionId}] Client connected from ${clientIP}`);

    // Track session start
    logSessionStart(sessionId, clientIP).catch(err => {
      console.error('Failed to log session start:', err);
    });

    // Create WebSocket to OpenAI
    const openaiWs = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'OpenAI-Beta': 'realtime=v1',
      },
    });

    let isConnected = false;
    let sessionStartTime = Date.now();
    let turnCount = 0;

    // OpenAI connection opened
    openaiWs.on('open', () => {
      console.log(`[${sessionId}] Connected to OpenAI Realtime API`);
      isConnected = true;
    });

    // Forward messages: Client → OpenAI
    clientWs.on('message', (data) => {
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.send(data);
        
        // Log if it's a commit (end of user turn)
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'input_audio_buffer.commit') {
            turnCount++;
          }
        } catch (e) {
          // Not JSON or parsing error - ignore
        }
      }
    });

    // Forward messages: OpenAI → Client
    openaiWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);

        // Log transcript events
        try {
          const event = JSON.parse(data.toString());
          
          if (event.type === 'conversation.item.created') {
            logTranscript(sessionId, event).catch(err => {
              console.error('Failed to log transcript:', err);
            });
          }
        } catch (e) {
          // Not JSON or parsing error - ignore
        }
      }
    });

    // Handle errors
    openaiWs.on('error', (err) => {
      console.error(`[${sessionId}] OpenAI WebSocket error:`, err.message);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'Upstream error');
      }
    });

    clientWs.on('error', (err) => {
      console.error(`[${sessionId}] Client WebSocket error:`, err.message);
      openaiWs.close();
    });

    // Handle close
    openaiWs.on('close', (code, reason) => {
      console.log(`[${sessionId}] OpenAI connection closed: ${code} ${reason}`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close();
      }
    });

    clientWs.on('close', (code, reason) => {
      console.log(`[${sessionId}] Client connection closed: ${code} ${reason}`);
      
      // Log session end
      const duration = Date.now() - sessionStartTime;
      logSessionEnd(sessionId, duration, turnCount, isConnected ? 'completed' : 'error')
        .catch(err => console.error('Failed to log session end:', err));
      
      if (openaiWs.readyState === WebSocket.OPEN) {
        openaiWs.close();
      }
    });

    // Enforce max duration (10 minutes default)
    setTimeout(() => {
      if (clientWs.readyState === WebSocket.OPEN) {
        console.log(`[${sessionId}] Max duration reached, closing connection`);
        clientWs.close(1000, 'Maximum session duration reached');
      }
    }, RATE_LIMIT.maxDuration);

    wss.emit('connection', clientWs, req);
  });
}

// Supabase logging functions
async function logSessionStart(sessionId, userIp) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase not configured, skipping session logging');
    return;
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/voice_sessions`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_ip: userIp,
        status: 'active'
      })
    });
  } catch (err) {
    console.error('Supabase session logging error:', err.message);
  }
}

async function logSessionEnd(sessionId, durationMs, turns, status) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/voice_sessions?session_id=eq.${sessionId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        ended_at: new Date().toISOString(),
        total_duration_ms: durationMs,
        total_turns: turns,
        status: status
      })
    });
  } catch (err) {
    console.error('Supabase session update error:', err.message);
  }
}

async function logTranscript(sessionId, event) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return;

  const item = event.item;
  if (!item?.content) return;

  // Extract transcript from content
  let transcript = '';
  let duration = 0;

  for (const content of item.content) {
    if (content.transcript) {
      transcript = content.transcript;
    }
    if (content.audio) {
      // Estimate duration from audio data length
      // PCM16 at 24kHz: 48000 bytes per second
      const audioBytes = content.audio.length * 0.75; // Base64 overhead
      duration = Math.round((audioBytes / 48000) * 1000);
    }
  }

  if (!transcript) return;

  try {
    await fetch(`${supabaseUrl}/rest/v1/voice_transcripts`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        session_id: sessionId,
        turn_id: item.id,
        speaker: item.role, // 'user' or 'assistant'
        transcript: transcript,
        audio_duration_ms: duration || null
      })
    });
  } catch (err) {
    console.error('Supabase transcript logging error:', err.message);
  }
}
```

**Verification:**
```bash
# Deploy to Vercel
vercel --prod

# Test WebSocket connection (use wscat)
npm install -g wscat

wscat -c "wss://your-app.vercel.app/api/voice-proxy?session_id=sess_test123"
# Should connect and show: Connected
# Press Ctrl+C to close

# Check Vercel logs
vercel logs --follow
# Should show: "[sess_test123] Client connected from ..."
```

---

### Phase 2: Frontend - Voice UI

#### Step 2.1: Add Voice UI Components

Edit `widget/embed.html` - Add these changes:

**A. Add CSS for voice components (in `<style>` section):**

```css
/* Voice Chat Components */

/* Mic button */
.mllm-mic-btn {
  background: var(--mllm-bg);
  border: 1px solid var(--mllm-border);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: none; /* Hidden by default, shown if browser supports */
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--mllm-text-light);
  transition: all 0.2s;
  flex-shrink: 0;
  position: relative;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.mllm-mic-btn:hover {
  color: var(--mllm-text);
  border-color: var(--mllm-text-light);
}

.mllm-mic-btn:active {
  transform: scale(0.95);
}

/* State-specific colors */
.mllm-mic-btn[data-state="idle"] {
  background: var(--mllm-bg);
  color: var(--mllm-text-light);
}

.mllm-mic-btn[data-state="requesting_permission"] {
  background: #FED7AA;
  color: #92400E;
  animation: pulse 1s ease-in-out infinite;
}

.mllm-mic-btn[data-state="recording_ptt"],
.mllm-mic-btn[data-state="recording_hands_free"] {
  background: var(--mllm-coral);
  color: white;
  border-color: var(--mllm-coral);
}

.mllm-mic-btn[data-state="processing"] {
  background: #4A5568;
  color: white;
  animation: pulse 1s ease-in-out infinite;
}

.mllm-mic-btn[data-state="playing"] {
  background: #48BB78;
  color: white;
}

.mllm-mic-btn[data-state="error"] {
  background: #F6AD55;
  color: white;
}

/* Pulsing ring animation for recording */
.mllm-mic-btn[data-state="recording_ptt"]::after,
.mllm-mic-btn[data-state="recording_hands_free"]::after {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid var(--mllm-coral);
  border-radius: 50%;
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes pulse-ring {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}

/* Voice indicator (shows status and duration) */
.mllm-voice-indicator {
  display: none;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--mllm-text-light);
  background: #F7F7F7;
  border-radius: 6px;
  margin-top: 8px;
  animation: mllm-fade-in 0.2s ease;
}

.mllm-voice-indicator.mllm-active {
  display: flex;
}

#mllm-voice-status {
  font-weight: 500;
}

#mllm-voice-duration {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

/* Voice mode selector */
.mllm-voice-mode-selector {
  display: none;
  margin-bottom: 8px;
}

.mllm-voice-mode-selector.mllm-active {
  display: block;
}

.mllm-voice-mode-selector select {
  width: 100%;
  padding: 8px 12px;
  font-size: 12px;
  font-family: inherit;
  color: var(--mllm-text);
  background: var(--mllm-bg);
  border: 1px solid var(--mllm-border);
  border-radius: 6px;
  cursor: pointer;
  outline: none;
}

.mllm-voice-mode-selector select:focus {
  border-color: var(--mllm-text-light);
}

/* Voice message bubbles */
.mllm-message-voice-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mllm-text-light);
  margin-bottom: 4px;
}

.mllm-voice-icon {
  width: 14px;
  height: 14px;
}
```

**B. Add HTML for voice components (in `.mllm-input-area` section):**

Find the `.mllm-input-area` div and replace with:

```html
<!-- Input -->
<div class="mllm-input-area">
  <!-- Voice mode selector (hidden initially) -->
  <div class="mllm-voice-mode-selector" id="mllm-voice-mode-selector">
    <select id="mllm-voice-mode">
      <option value="ptt">Push-to-talk (hold to speak)</option>
      <option value="hands-free">Hands-free (automatic)</option>
    </select>
  </div>

  <div class="mllm-input-wrapper">
    <!-- Mic button (hidden until browser support confirmed) -->
    <button 
      class="mllm-mic-btn" 
      id="mllm-mic-btn"
      data-state="idle"
      aria-label="Voice chat"
      style="display: none;"
    >
      <svg class="mllm-mic-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    </button>

    <!-- Existing text input -->
    <textarea 
      class="mllm-input" 
      id="mllm-input" 
      placeholder="Ask about Michael..."
      rows="1"
      onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();mllmSend();}"
      oninput="this.style.height='24px';this.style.height=this.scrollHeight+'px';"
    ></textarea>

    <!-- Existing send button -->
    <button class="mllm-send-btn" id="mllm-send-btn" onclick="mllmSend()" aria-label="Send">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m5 12 7-7 7 7"></path>
        <path d="M12 19V5"></path>
      </svg>
    </button>
  </div>

  <!-- Voice indicator (shows during recording/playing) -->
  <div class="mllm-voice-indicator" id="mllm-voice-indicator">
    <span id="mllm-voice-status">Ready</span>
    <span id="mllm-voice-duration">0:00</span>
  </div>
</div>
```

---

#### Step 2.2: Add VoiceChat JavaScript Class

Add this complete VoiceChat implementation to the `<script>` section of `embed.html`, before the closing `})();`:

```javascript
// ==========================================================================
// VOICE CHAT CLASS
// ==========================================================================

class VoiceChat {
  constructor(endpoint) {
    this.endpoint = endpoint.replace('http:', 'ws:').replace('https:', 'wss:').replace('/api/chat', '/api/voice-proxy');
    this.ws = null;
    this.audioContext = null;
    this.mediaRecorder = null;
    this.mediaStream = null;
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentSource = null;
    
    // State management
    this.state = 'idle';
    this.mode = 'ptt'; // 'ptt' or 'hands-free'
    this.recordingStartTime = 0;
    this.durationInterval = null;
    this.permissionGranted = false;
    
    // Check browser support
    this.isSupported = this.checkSupport();
    
    if (this.isSupported) {
      this.initializeUI();
    } else {
      console.warn('Voice chat not supported in this browser');
    }
  }
  
  checkSupport() {
    return !!(
      navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined' &&
      (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') &&
      typeof WebSocket !== 'undefined'
    );
  }
  
  initializeUI() {
    const micBtn = document.getElementById('mllm-mic-btn');
    const modeSelector = document.getElementById('mllm-voice-mode-selector');
    const modeDropdown = document.getElementById('mllm-voice-mode');
    
    if (micBtn) {
      micBtn.style.display = 'flex';
      
      // Push-to-talk events
      micBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (this.mode === 'ptt') this.startPTT();
      });
      
      micBtn.addEventListener('mouseup', (e) => {
        e.preventDefault();
        if (this.mode === 'ptt') this.stopPTT();
      });
      
      micBtn.addEventListener('mouseleave', (e) => {
        if (this.mode === 'ptt' && this.state === 'recording_ptt') {
          this.stopPTT();
        }
      });
      
      // Touch events for mobile
      micBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.mode === 'ptt') this.startPTT();
      });
      
      micBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (this.mode === 'ptt') this.stopPTT();
      });
      
      // Keyboard support (Space bar)
      micBtn.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && this.mode === 'ptt' && this.state === 'idle') {
          e.preventDefault();
          this.startPTT();
        }
      });
      
      micBtn.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && this.mode === 'ptt') {
          e.preventDefault();
          this.stopPTT();
        }
      });
      
      // Hands-free mode click
      micBtn.addEventListener('click', (e) => {
        if (this.mode === 'hands-free') {
          if (this.state === 'idle') {
            this.startHandsFree();
          } else if (this.state === 'recording_hands_free') {
            this.stopHandsFree();
          }
        }
      });
    }
    
    // Mode selector
    if (modeDropdown) {
      modeDropdown.addEventListener('change', (e) => {
        this.mode = e.target.value;
        console.log('Voice mode changed to:', this.mode);
        
        // Update mic button label
        if (micBtn) {
          if (this.mode === 'ptt') {
            micBtn.setAttribute('aria-label', 'Voice chat - hold to speak');
          } else {
            micBtn.setAttribute('aria-label', 'Voice chat - click to start/stop');
          }
        }
      });
    }
    
    // Show mode selector after first successful permission
    if (modeSelector) {
      // Hidden by default, shown after first use
    }
  }
  
  async requestPermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      this.permissionGranted = true;
      
      // Show mode selector after permission granted
      const modeSelector = document.getElementById('mllm-voice-mode-selector');
      if (modeSelector) {
        modeSelector.classList.add('mllm-active');
      }
      
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      this.showError('Microphone access required. Please enable in browser settings.');
      return false;
    }
  }
  
  async startPTT() {
    if (this.state !== 'idle' && this.state !== 'playing') return;
    
    // Stop any playing audio
    if (this.state === 'playing') {
      this.stopPlayback();
    }
    
    // Request permission on first use
    if (!this.permissionGranted) {
      this.setState('requesting_permission');
      const granted = await this.requestPermission();
      if (!granted) {
        this.setState('error');
        return;
      }
    }
    
    // Connect WebSocket if needed
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connectWebSocket();
      } catch (err) {
        this.showError('Connection failed. Please try again.');
        this.setState('error');
        return;
      }
    }
    
    // Start recording
    try {
      await this.startRecording();
      this.setState('recording_ptt');
      this.recordingStartTime = Date.now();
      this.startDurationCounter();
    } catch (err) {
      console.error('Failed to start recording:', err);
      this.showError('Failed to start recording.');
      this.setState('error');
    }
  }
  
  stopPTT() {
    if (this.state !== 'recording_ptt') return;
    
    this.stopRecording();
    this.setState('processing');
    this.stopDurationCounter();
    
    // Commit audio buffer
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'input_audio_buffer.commit'
      }));
    }
  }
  
  async startHandsFree() {
    if (this.state !== 'idle') return;
    
    if (!this.permissionGranted) {
      this.setState('requesting_permission');
      const granted = await this.requestPermission();
      if (!granted) {
        this.setState('error');
        return;
      }
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      try {
        await this.connectWebSocket();
      } catch (err) {
        this.showError('Connection failed.');
        this.setState('error');
        return;
      }
    }
    
    try {
      await this.startRecording();
      this.setState('recording_hands_free');
      this.recordingStartTime = Date.now();
      this.startDurationCounter();
    } catch (err) {
      console.error('Failed to start hands-free:', err);
      this.showError('Failed to start recording.');
      this.setState('error');
    }
  }
  
  stopHandsFree() {
    if (this.state !== 'recording_hands_free') return;
    
    this.stopRecording();
    this.setState('idle');
    this.stopDurationCounter();
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'User stopped hands-free');
    }
  }
  
  async connectWebSocket() {
    const wsUrl = `${this.endpoint}?session_id=${sessionId}`;
    
    return new Promise((resolve, reject) => {
      console.log('Connecting to voice WebSocket:', wsUrl);
      
      this.ws = new WebSocket(wsUrl);
      
      let connectionTimeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
        this.ws.close();
      }, 10000);
      
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('Voice WebSocket connected');
        
        // Send session configuration
        this.ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            voice: 'alloy',
            instructions: buildSystemPrompt(),
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: this.mode === 'hands-free' ? {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 700
            } : null
          }
        }));
        
        resolve();
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };
      
      this.ws.onerror = (err) => {
        clearTimeout(connectionTimeout);
        console.error('WebSocket error:', err);
        reject(err);
      };
      
      this.ws.onclose = (event) => {
        console.log('Voice WebSocket closed:', event.code, event.reason);
        this.setState('idle');
      };
    });
  }
  
  async startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000
      }
    });
    
    this.mediaStream = stream;
    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    this.mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          const pcm16 = await this.convertToPCM16(event.data);
          const base64 = this.arrayBufferToBase64(pcm16);
          
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64
          }));
        } catch (err) {
          console.error('Failed to process audio chunk:', err);
        }
      }
    };
    
    this.mediaRecorder.start(100); // 100ms chunks
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
  
  async convertToPCM16(webmBlob) {
    const arrayBuffer = await webmBlob.arrayBuffer();
    
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert Float32 [-1, 1] to Int16 PCM
    const pcm16 = new Int16Array(channelData.length);
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    return pcm16.buffer;
  }
  
  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  
  handleWebSocketMessage(event) {
    console.log('Voice event:', event.type);
    
    switch (event.type) {
      case 'session.created':
        console.log('Voice session created');
        break;
        
      case 'session.updated':
        console.log('Voice session updated');
        break;
        
      case 'input_audio_buffer.speech_started':
        console.log('Speech detected');
        break;
        
      case 'input_audio_buffer.speech_stopped':
        console.log('Speech ended');
        break;
        
      case 'conversation.item.created':
        if (event.item?.content) {
          // Find transcript
          for (const content of event.item.content) {
            if (content.transcript) {
              this.addTranscriptBubble(event.item.role, content.transcript);
              break;
            }
          }
        }
        break;
        
      case 'response.audio.delta':
        if (event.delta) {
          const pcm16 = this.base64ToArrayBuffer(event.delta);
          this.queueAudio(pcm16);
        }
        break;
        
      case 'response.audio.done':
        console.log('Response audio complete');
        break;
        
      case 'response.done':
        this.setState('idle');
        break;
        
      case 'error':
        console.error('OpenAI error:', event.error);
        this.showError('Voice error: ' + (event.error.message || 'Unknown error'));
        this.setState('error');
        break;
    }
  }
  
  async queueAudio(pcm16ArrayBuffer) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
    
    // Resume AudioContext if suspended (autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // Convert PCM16 to Float32
    const int16Array = new Int16Array(pcm16ArrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
    }
    
    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);
    
    this.audioQueue.push(audioBuffer);
    
    if (!this.isPlaying) {
      this.playNextAudio();
    }
  }
  
  async playNextAudio() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.state === 'playing') {
        this.setState('idle');
      }
      return;
    }
    
    this.isPlaying = true;
    this.setState('playing');
    
    const audioBuffer = this.audioQueue.shift();
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);
    
    this.currentSource = source;
    
    source.onended = () => {
      this.currentSource = null;
      this.playNextAudio();
    };
    
    source.start();
  }
  
  stopPlayback() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource = null;
      } catch (e) {
        // Already stopped
      }
    }
    
    this.audioQueue = [];
    this.isPlaying = false;
  }
  
  addTranscriptBubble(role, transcript) {
    const inner = document.getElementById('mllm-messages-inner');
    if (!inner) return;
    
    const isUser = role === 'user';
    const className = isUser ? 'mllm-message-user' : 'mllm-message-bot';
    const icon = isUser ? '' : '<div class="mllm-message-voice-indicator"><svg class="mllm-voice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg> Voice</div>';
    
    const bubble = document.createElement('div');
    bubble.className = `mllm-message ${className}`;
    bubble.innerHTML = `
      ${icon}
      <div class="mllm-bubble">${escapeHtml(transcript)}</div>
    `;
    
    inner.appendChild(bubble);
    
    const container = document.getElementById('mllm-messages');
    scrollToBottom(container);
  }
  
  setState(newState) {
    this.state = newState;
    
    const btn = document.getElementById('mllm-mic-btn');
    if (btn) {
      btn.setAttribute('data-state', newState);
    }
    
    const indicator = document.getElementById('mllm-voice-indicator');
    const status = document.getElementById('mllm-voice-status');
    
    if (newState === 'recording_ptt' || newState === 'recording_hands_free') {
      indicator.classList.add('mllm-active');
      status.textContent = 'Listening...';
    } else if (newState === 'processing') {
      status.textContent = 'Processing...';
    } else if (newState === 'playing') {
      status.textContent = 'Speaking...';
    } else if (newState === 'requesting_permission') {
      indicator.classList.add('mllm-active');
      status.textContent = 'Requesting permission...';
    } else {
      indicator.classList.remove('mllm-active');
    }
  }
  
  startDurationCounter() {
    const durationEl = document.getElementById('mllm-voice-duration');
    if (!durationEl) return;
    
    this.durationInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.recordingStartTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      durationEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  }
  
  stopDurationCounter() {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }
  
  showError(message) {
    this.setState('error');
    
    const inner = document.getElementById('mllm-messages-inner');
    if (inner) {
      const errorBubble = document.createElement('div');
      errorBubble.className = 'mllm-message mllm-message-bot';
      errorBubble.innerHTML = `
        <div class="mllm-bubble" style="color: #F6AD55;">
          ⚠️ ${escapeHtml(message)}
        </div>
      `;
      inner.appendChild(errorBubble);
      
      const container = document.getElementById('mllm-messages');
      scrollToBottom(container);
    }
    
    // Reset to idle after 3 seconds
    setTimeout(() => {
      if (this.state === 'error') {
        this.setState('idle');
      }
    }, 3000);
  }
}

// Initialize voice chat
let voiceChat = null;
try {
  voiceChat = new VoiceChat(ENDPOINT);
  console.log('Voice chat initialized:', voiceChat.isSupported ? 'supported' : 'not supported');
} catch (err) {
  console.error('Failed to initialize voice chat:', err);
}
```

---

## Test Plans

### Pre-Deployment Testing

#### Test 1: Backend WebSocket Connection

**Objective:** Verify WebSocket proxy connects to OpenAI successfully.

**Steps:**
```bash
# Install wscat for WebSocket testing
npm install -g wscat

# Test connection (replace with your Vercel URL)
wscat -c "wss://your-app.vercel.app/api/voice-proxy?session_id=sess_test_$(date +%s)"

# Expected output:
# Connected (press CTRL+C to quit)

# Send test message:
{"type": "session.update", "session": {"voice": "alloy"}}

# Expected response (within 2 seconds):
# {"type": "session.created", ...}

# Close with Ctrl+C
```

**Success Criteria:**
- ✅ WebSocket connects without errors
- ✅ Session created response received
- ✅ Vercel logs show connection from your IP
- ✅ Supabase `voice_sessions` table has new row

**If it fails:**
- Check OPENAI_API_KEY is set in Vercel environment variables
- Check Vercel function logs for errors
- Verify Node.js runtime (not Edge) in vercel.json

---

#### Test 2: Supabase Logging

**Objective:** Verify session and transcript data is logged correctly.

**Steps:**
```sql
-- In Supabase SQL Editor

-- Check recent sessions
SELECT * FROM voice_sessions 
ORDER BY started_at DESC 
LIMIT 10;

-- Expected: See test session from Test 1

-- Check transcripts
SELECT * FROM voice_transcripts 
ORDER BY created_at DESC 
LIMIT 10;

-- Expected: Empty for now (will populate after full voice test)

-- Check analytics view
SELECT * FROM voice_usage_stats;

-- Expected: Shows daily totals
```

**Success Criteria:**
- ✅ Sessions table receives entries
- ✅ Timestamps are correct
- ✅ session_id matches what was sent

---

#### Test 3: Frontend Audio Capture

**Objective:** Verify microphone capture and PCM16 conversion.

**Steps:**
1. Open `test.html` in Chrome (or deploy widget to staging site)
2. Open browser DevTools → Console
3. Click the mic button
4. Allow microphone permission when prompted
5. Hold mic button and say "testing one two three"
6. Release mic button
7. Check console for:
   ```
   Voice chat initialized: supported
   Connecting to voice WebSocket: wss://...
   Voice WebSocket connected
   Voice event: session.created
   Voice event: conversation.item.created
   ```

**Success Criteria:**
- ✅ Mic button appears (not hidden)
- ✅ Permission prompt shows and is granted
- ✅ Mic button turns red while held
- ✅ Duration counter shows elapsed time
- ✅ Console shows WebSocket events
- ✅ No JavaScript errors

**If it fails:**
- Check browser console for permission errors
- Verify MediaRecorder is supported: `typeof MediaRecorder`
- Check AudioContext: `typeof AudioContext`
- Clear browser permissions and try again

---

#### Test 4: End-to-End Voice Conversation

**Objective:** Complete voice conversation with response playback.

**Steps:**
1. Open widget
2. Click mic button (hold if push-to-talk)
3. Say: "What projects have you worked on?"
4. Release mic button
5. Wait for response
6. Observe:
   - Processing indicator appears
   - Audio plays through speakers
   - Transcript appears in chat
   - Mic button returns to idle state

**Expected Timeline:**
- **0ms:** User releases mic
- **200-400ms:** Audio playback starts
- **3-5s:** Full response completes
- **Total:** < 6 seconds for typical response

**Success Criteria:**
- ✅ Audio plays clearly (no crackling)
- ✅ Transcript matches audio content
- ✅ Latency < 600ms to first audio
- ✅ UI returns to idle after playback
- ✅ Can start new message immediately

---

### Cross-Browser Testing

#### Matrix

| Browser | Version | OS | Push-to-Talk | Hands-Free | Notes |
|---------|---------|----|--------------|-----------|----|
| Chrome | 120+ | macOS | ✓ | ✓ | Primary dev environment |
| Chrome | 120+ | Windows | ✓ | ✓ | Test touch events |
| Chrome | 120+ | Android | ✓ | ⚠️ | Mobile: test touch |
| Safari | 17+ | macOS | ✓ | ✓ | Test AudioContext unlock |
| Safari | 17+ | iOS | ✓ | ⚠️ | Mobile: may have autoplay issues |
| Edge | 120+ | Windows | ✓ | ✓ | Chromium-based |
| Firefox | 115+ | macOS | ⚠️ | ⚠️ | Test as fallback only |

**Legend:**
- ✓ = Full support expected
- ⚠️ = Partial support / needs testing
- ✗ = Known issues

---

### Edge Case Testing

#### Test 5: Permission Denial

**Scenario:** User blocks microphone permission.

**Steps:**
1. Go to browser settings
2. Block microphone for your site
3. Refresh widget
4. Click mic button

**Expected:**
- Error message: "Microphone access required..."
- Text chat still works
- No JavaScript crash

---

#### Test 6: Network Interruption

**Scenario:** WebSocket disconnects mid-conversation.

**Steps:**
1. Start voice conversation
2. Disable WiFi during recording
3. Wait 5 seconds
4. Re-enable WiFi

**Expected:**
- Error message within 5 seconds
- "Connection lost" indicator
- Graceful fallback to text chat
- Can restart voice after reconnect

---

#### Test 7: Rate Limit Hit

**Scenario:** User exceeds 10 sessions per hour.

**Steps:**
1. Start 11 voice sessions in quick succession
2. Use different browser tabs or incognito mode

**Expected:**
- 11th connection refused
- 429 error in console
- Message: "Voice chat limit reached..."
- Text chat still available

---

#### Test 8: Long Monologue

**Scenario:** User speaks for 2+ minutes continuously.

**Steps:**
1. Start hands-free mode
2. Read a long paragraph for 2 minutes
3. Observe connection stability

**Expected:**
- Session stays connected
- No timeout errors
- Response generates after speech ends
- Audio playback completes

---

## Setup Verification Checklist

Use this before going to production:

### Backend Checklist

- [ ] **Vercel Deployment**
  - [ ] `api/voice-proxy.js` deployed successfully
  - [ ] Function uses Node.js runtime (not Edge)
  - [ ] Function logs show WebSocket connections
  - [ ] No 426/500 errors in logs

- [ ] **Environment Variables**
  - [ ] `OPENAI_API_KEY` set and working
  - [ ] `SUPABASE_URL` set
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` set
  - [ ] Test API key with: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

- [ ] **Supabase Schema**
  - [ ] `voice_sessions` table exists
  - [ ] `voice_transcripts` table exists
  - [ ] Indexes created
  - [ ] Test insert/select works

- [ ] **Rate Limiting**
  - [ ] Test rate limits work (11th session blocked)
  - [ ] Test session duration limit (disconnects after 10 min)
  - [ ] Verify IP extraction works (check logs)

### Frontend Checklist

- [ ] **Browser Support**
  - [ ] Mic button appears on Chrome/Safari/Edge
  - [ ] MediaRecorder supported
  - [ ] AudioContext supported
  - [ ] WebSocket supported

- [ ] **UI Components**
  - [ ] Mic button visible and styled
  - [ ] State colors display correctly (red/green/gray)
  - [ ] Duration counter updates in real-time
  - [ ] Voice indicator shows/hides properly
  - [ ] Mode selector appears after permission granted

- [ ] **Audio Pipeline**
  - [ ] Microphone captures audio
  - [ ] PCM16 conversion works (no errors in console)
  - [ ] WebSocket sends audio chunks
  - [ ] Audio playback works (no crackling)
  - [ ] Transcripts appear simultaneously

- [ ] **Error Handling**
  - [ ] Permission denial handled gracefully
  - [ ] WebSocket disconnect shows error
  - [ ] Timeout shows error
  - [ ] Fallback to text chat works

### Performance Checklist

- [ ] **Latency**
  - [ ] First audio < 600ms after button release
  - [ ] Average latency < 400ms
  - [ ] No perceptible gaps between audio chunks

- [ ] **Quality**
  - [ ] Audio quality is clear (no distortion)
  - [ ] Echo cancellation works
  - [ ] Background noise suppressed
  - [ ] Transcripts are accurate (>90%)

### Security Checklist

- [ ] **Authentication**
  - [ ] session_id validated (format check)
  - [ ] Invalid session_id rejected
  - [ ] Rate limits enforced per IP

- [ ] **Data Privacy**
  - [ ] OpenAI API key not exposed to client
  - [ ] Transcripts logged securely in Supabase
  - [ ] Audio data not stored (unless explicitly enabled)
  - [ ] User IP hashed or anonymized (optional)

---

## Cost Analysis & Budgeting

### OpenAI Realtime API Pricing

**Current pricing (January 2026):**
- Input audio: **$0.06 per minute**
- Output audio: **$0.24 per minute**
- Text tokens (context): **$2.50/1M input**, **$10/1M output**

### Cost Per Conversation

**Example: 3-minute conversation**
```
User speaks: 1.5 minutes × $0.06 = $0.09
AI responds: 1.5 minutes × $0.24 = $0.36
Text tokens (system prompt): ~500 tokens = $0.001

Total: $0.46 per conversation
```

**Example: 5-minute conversation**
```
User speaks: 2.5 minutes × $0.06 = $0.15
AI responds: 2.5 minutes × $0.24 = $0.60

Total: $0.75 per conversation
```

### Monthly Cost Projections

| Visitors/Month | Voice Adoption | Conversations | Avg Duration | Total Minutes | Monthly Cost |
|----------------|----------------|---------------|--------------|---------------|--------------|
| 100 | 10% | 10 | 3 min | 30 min | **$13.80** |
| 500 | 10% | 50 | 3 min | 150 min | **$69** |
| 1,000 | 10% | 100 | 3 min | 300 min | **$138** |
| 5,000 | 5% | 250 | 3 min | 750 min | **$345** |

**Realistic for personal portfolio:** $30-50/month (assuming 100-170 conversations)

### Cost Control Strategies

#### 1. Rate Limiting (Already Implemented)

```javascript
const RATE_LIMIT = {
  maxSessions: 10,              // 10 sessions per hour per IP
  maxDuration: 10 * 60 * 1000   // 10 minutes max per session
};

// Max cost per user: 10 sessions × 10 min × $0.30/min = $30/hour
```

#### 2. OpenAI Spending Limits

Go to: [https://platform.openai.com/account/limits](https://platform.openai.com/account/limits)

**Recommended limits:**
- **Hard limit:** $100/month (system stops if exceeded)
- **Soft limit:** $50/month (email notification)

This prevents runaway costs from bugs or abuse.

#### 3. Progressive Rollout

```javascript
// Example: Enable voice for only 20% of users initially
const enableVoice = Math.random() < 0.2;

// Or: Require text engagement first
const enableVoice = textMessageCount >= 2;
```

#### 4. Usage Monitoring

```sql
-- Query daily voice usage in Supabase
SELECT 
  DATE(started_at) as date,
  COUNT(*) as sessions,
  SUM(total_duration_ms) / 60000.0 as total_minutes,
  SUM(total_duration_ms) / 60000.0 * 0.30 as estimated_cost
FROM voice_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

**Set up weekly email alert:**
- If weekly cost > $15 → review usage
- If daily cost > $10 → investigate spike

---

## Troubleshooting Guide

### Issue: WebSocket Connection Fails

**Symptoms:**
- Console error: "Failed to connect"
- 426 or 500 status code
- Connection timeout

**Diagnosis:**
```bash
# Check Vercel logs
vercel logs --follow

# Test WebSocket directly
wscat -c "wss://your-app.vercel.app/api/voice-proxy?session_id=sess_test123"
```

**Solutions:**
1. **OPENAI_API_KEY not set**
   - Go to Vercel → Project → Settings → Environment Variables
   - Add OPENAI_API_KEY
   - Redeploy: `vercel --prod`

2. **Wrong runtime (Edge instead of Node.js)**
   - Check `api/voice-proxy.js` has: `export const config = { runtime: 'nodejs18.x' };`
   - Redeploy

3. **Vercel WebSocket not supported (Hobby plan)**
   - Consider alternative: Railway, Render, AWS Lambda + API Gateway
   - Or: Fallback to HTTP polling (classic pipeline)

---

### Issue: Microphone Permission Denied

**Symptoms:**
- Error message: "Microphone access denied"
- Mic button stays in error state
- Browser permission prompt not appearing

**Diagnosis:**
```javascript
// Check permission state in browser console
navigator.permissions.query({ name: 'microphone' }).then(result => {
  console.log('Microphone permission:', result.state);
  // Expected: 'granted', 'denied', or 'prompt'
});
```

**Solutions:**

**Chrome:**
1. Click lock icon in address bar
2. Site settings → Microphone → Allow
3. Refresh page

**Safari:**
1. Safari menu → Settings for This Website
2. Microphone → Allow
3. Refresh page

**Firefox:**
1. Click shield icon in address bar
2. Permissions → Microphone → Allow
3. Refresh page

**iOS Safari:**
- Settings → Safari → Microphone → Ask
- Reload page and accept prompt

---

### Issue: No Audio Plays

**Symptoms:**
- Transcript appears but no sound
- Audio plays in Chrome but not Safari
- Console warning: "AudioContext was not allowed to start"

**Diagnosis:**
```javascript
// Check AudioContext state
console.log('AudioContext state:', voiceChat.audioContext.state);
// Expected: 'running'
// If 'suspended': Autoplay blocked
```

**Solutions:**

1. **Autoplay Policy (Safari)**
   - AudioContext must be resumed on user gesture
   - Solution: Call `audioContext.resume()` in click handler
   - Already implemented in VoiceChat class

2. **Volume/Mute**
   - Check system volume is not muted
   - Check browser tab is not muted
   - Right-click tab → Unmute site

3. **Wrong Audio Output**
   - Check system audio output device
   - Headphones plugged in but not selected?
   - Try playing other audio to verify

---

### Issue: Audio Sounds Garbled/Choppy

**Symptoms:**
- Audio plays but sounds distorted
- Robotic voice
- Crackling or popping

**Diagnosis:**
```javascript
// Check sample rates
console.log('MediaRecorder sample rate:', voiceChat.mediaStream.getAudioTracks()[0].getSettings().sampleRate);
console.log('AudioContext sample rate:', voiceChat.audioContext.sampleRate);
// Both should be 24000 Hz
```

**Solutions:**

1. **Sample Rate Mismatch**
   - Ensure MediaRecorder uses 24kHz: `getUserMedia({ audio: { sampleRate: 24000 } })`
   - Ensure AudioContext uses 24kHz: `new AudioContext({ sampleRate: 24000 })`

2. **PCM16 Conversion Error**
   - Check console for errors during `convertToPCM16()`
   - Verify Base64 encoding is correct
   - Test with smaller audio chunks (50ms instead of 100ms)

3. **Network Issues**
   - Check Network tab → WS frames
   - Look for dropped frames or delays
   - Try reducing recording chunk size

---

### Issue: High Latency (> 2 seconds)

**Symptoms:**
- Long delay between speaking and response
- Processing indicator shows for 2+ seconds
- Poor conversation flow

**Diagnosis:**
```javascript
// Measure latency
const startTime = Date.now();
// ... user releases mic button ...
// ... audio starts playing ...
const latency = Date.now() - startTime;
console.log('Latency:', latency, 'ms');
// Target: < 600ms
```

**Solutions:**

1. **WebSocket Overhead**
   - Check network tab for WebSocket frame delays
   - Reduce chunk size to 50ms for faster streaming
   - Ensure no proxy/VPN introducing latency

2. **Audio Processing Bottleneck**
   - Check CPU usage during recording
   - Simplify PCM16 conversion
   - Use Web Audio API's AudioWorklet instead of MediaRecorder (advanced)

3. **OpenAI API Slowness**
   - Check OpenAI status page: [https://status.openai.com/](https://status.openai.com/)
   - Try different time of day
   - Consider caching common responses (not recommended for dynamic content)

---

### Issue: Rate Limit False Positives

**Symptoms:**
- User blocked after < 10 sessions
- "Voice chat limit reached" appears incorrectly
- Rate limit doesn't reset after 60 minutes

**Diagnosis:**
```javascript
// Check rate limit state (in voice-proxy.js)
console.log('Rate limit map:', rateLimitMap);

// Check Supabase for session count
SELECT user_ip, COUNT(*) as session_count
FROM voice_sessions
WHERE started_at >= NOW() - INTERVAL '1 hour'
GROUP BY user_ip
HAVING COUNT(*) >= 10;
```

**Solutions:**

1. **Shared IP Address**
   - Multiple users behind same NAT/proxy
   - Solution: Use session_id + IP combo
   - Or: Implement user authentication

2. **Cold Start Resets Map**
   - In-memory rate limit map resets on Vercel cold start
   - Solution: Use Redis or Supabase for persistent rate limiting
   - Or: Accept cold start resets (reasonable for burst protection)

3. **Wrong Window Calculation**
   - Check `Date.now() - record.windowStart > RATE_LIMIT.windowMs`
   - Ensure windowMs is in milliseconds (60 * 60 * 1000 = 3,600,000 ms)

---

### Issue: Supabase Logging Fails

**Symptoms:**
- No rows in `voice_sessions` table
- No transcripts in `voice_transcripts`
- Console errors: "Failed to log..."

**Diagnosis:**
```bash
# Test Supabase connection
curl -X POST "https://your-project.supabase.co/rest/v1/voice_sessions" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","user_ip":"127.0.0.1","status":"active"}'

# Expected: 201 Created
```

**Solutions:**

1. **Wrong API Key**
   - Verify SUPABASE_SERVICE_ROLE_KEY (not anon key) in Vercel env vars
   - Check key has correct permissions

2. **Table Doesn't Exist**
   - Run table creation SQL from Step 1.1
   - Check table name spelling (voice_sessions, not voice_session)

3. **RLS Policies Block Insert**
   - Supabase Row Level Security might block service role
   - Disable RLS for these tables (they're internal logs)
   - Or: Add policy to allow service role

```sql
-- Disable RLS (if enabled)
ALTER TABLE voice_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE voice_transcripts DISABLE ROW LEVEL SECURITY;
```

---

## Production Deployment

### Pre-Launch Checklist

- [ ] All tests pass (see Test Plans section)
- [ ] Environment variables set in Vercel production
- [ ] Supabase tables created and indexed
- [ ] OpenAI spending limit configured ($50-100/month)
- [ ] Rate limits tested and working
- [ ] Error handling tested (permission, network, timeout)
- [ ] Cross-browser testing complete (Chrome, Safari, mobile)
- [ ] Latency meets targets (< 600ms)
- [ ] Cost monitoring set up (weekly reports)

### Deployment Steps

```bash
# 1. Install dependencies
cd /path/to/portfolio-chat-backend
npm install ws

# 2. Test locally (optional - requires ngrok for WebSocket testing)
vercel dev
# Test with: wscat -c "ws://localhost:3000/api/voice-proxy?session_id=sess_test"

# 3. Deploy to production
vercel --prod

# 4. Verify deployment
curl https://your-app.vercel.app/api/chat -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# 5. Test WebSocket
wscat -c "wss://your-app.vercel.app/api/voice-proxy?session_id=sess_prod_test"

# 6. Check logs
vercel logs --follow
```

### Rollout Strategy

**Phase 1: Soft Launch (Week 1)**
- Enable voice for 10% of users (feature flag)
- Monitor error rate and latency
- Target: < 5% error rate, < 600ms avg latency

**Phase 2: Beta Expansion (Week 2)**
- Increase to 50% of users
- Collect user feedback
- Optimize based on real-world usage

**Phase 3: Full Launch (Week 3)**
- Enable for 100% of users
- Announce feature (blog post, social media)
- Monitor costs and adjust rate limits if needed

### Feature Flag Implementation

```javascript
// In widget/embed.html VoiceChat constructor:
constructor(endpoint) {
  // ... existing code ...
  
  // Feature flag: Enable voice for 10% of users
  const enableVoice = Math.random() < 0.1;
  
  if (!enableVoice) {
    console.log('Voice chat disabled (feature flag)');
    this.isSupported = false;
    return;
  }
  
  // ... rest of constructor ...
}
```

Or URL-based:

```javascript
// Enable voice if URL has ?voice=1
const urlParams = new URLSearchParams(window.location.search);
const enableVoice = urlParams.get('voice') === '1';

if (!enableVoice && Math.random() > 0.1) {
  this.isSupported = false;
  return;
}
```

---

## Monitoring & Maintenance

### Daily Monitoring

**Check every morning:**

```sql
-- In Supabase SQL Editor

-- Yesterday's usage
SELECT 
  COUNT(*) as sessions,
  SUM(total_duration_ms) / 60000.0 as minutes,
  SUM(total_duration_ms) / 60000.0 * 0.30 as estimated_cost_usd,
  AVG(total_turns) as avg_turns,
  SUM(CASE WHEN status='error' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as error_rate_pct
FROM voice_sessions
WHERE started_at >= CURRENT_DATE - INTERVAL '1 day'
  AND started_at < CURRENT_DATE;

-- Recent errors
SELECT session_id, error_message, started_at
FROM voice_sessions
WHERE status = 'error'
  AND started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 20;
```

**OpenAI Dashboard:**
- Check: [https://platform.openai.com/usage](https://platform.openai.com/usage)
- Verify daily spend matches Supabase estimates
- Look for unexpected spikes

**Vercel Logs:**
```bash
vercel logs --follow
```
- Look for errors or warnings
- Check WebSocket connection counts
- Verify rate limiting is working

### Weekly Review

**Metrics to track:**

| Metric | Target | Action if Off-Target |
|--------|--------|----------------------|
| **Sessions per day** | 10-50 | If 0: Check deployment. If >200: Review costs |
| **Error rate** | < 5% | Investigate errors in Supabase logs |
| **Avg latency** | < 600ms | Check OpenAI status, optimize audio processing |
| **Weekly cost** | < $15 | Adjust rate limits if exceeded |
| **Avg session duration** | 2-5 min | If >10 min: Users hitting timeout |

### Monthly Maintenance

**Tasks:**

1. **Review Analytics**
   ```sql
   SELECT * FROM voice_usage_stats
   WHERE date >= CURRENT_DATE - INTERVAL '30 days'
   ORDER BY date DESC;
   ```

2. **Update Cost Projections**
   - Actual vs projected costs
   - Adjust OpenAI spending limits if needed

3. **Browser Compatibility Check**
   - Test on latest Chrome, Safari, Edge releases
   - Check for new WebRTC/MediaRecorder issues

4. **Security Audit**
   - Review rate limit effectiveness
   - Check for abuse patterns in logs
   - Update API keys if compromised

5. **Feature Improvements**
   - Collect user feedback
   - Plan V2 features (multilanguage, voice selection, etc.)

---

## Future Enhancements (V2+)

### Potential Features

**Voice Selection:**
```javascript
// Allow users to choose AI voice
const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

// In session.update:
session: {
  voice: userSelectedVoice || 'alloy',
  // ...
}
```

**Multilanguage Support:**
```javascript
// Detect user language from browser
const userLang = navigator.language; // e.g., 'es-MX'

// Configure OpenAI:
session: {
  input_audio_transcription: {
    model: 'whisper-1',
    language: userLang.split('-')[0] // 'es'
  }
}
```

**Audio Recording Storage:**
```javascript
// Store audio in Supabase Storage for debugging
async function storeAudioRecording(sessionId, turnId, audioBlob) {
  const supabase = createSupabaseClient();
  
  await supabase.storage
    .from('voice-recordings')
    .upload(`${sessionId}/${turnId}.webm`, audioBlob);
}
```

**Conversation Replay:**
- Store audio responses in Supabase Storage
- Add "replay" button next to transcripts
- Allow users to listen to previous responses

**Advanced VAD Configuration:**
```javascript
// Fine-tune voice activity detection
turn_detection: {
  type: 'server_vad',
  threshold: 0.4,            // Lower = more sensitive
  prefix_padding_ms: 500,    // Capture more context before speech
  silence_duration_ms: 1000  // Wait longer before ending turn
}
```

---

## Summary

This implementation guide provides everything needed to build a production-ready voice chat feature using OpenAI's Realtime API.

**Key Files to Create:**
1. `api/voice-proxy.js` - WebSocket proxy endpoint
2. Modified `widget/embed.html` - Voice UI + VoiceChat class
3. Supabase tables: `voice_sessions`, `voice_transcripts`

**Timeline:**
- **Week 1:** Backend + basic UI (push-to-talk MVP)
- **Week 2:** Cross-browser testing + error handling
- **Week 3:** Hands-free mode + polish
- **Week 4:** Production deployment + monitoring

**Costs:**
- **Development:** 0 (no new subscriptions)
- **Production:** $30-50/month for typical portfolio traffic

**Success Metrics:**
- Latency < 600ms
- Error rate < 5%
- User adoption > 10% of text chat users
- Positive feedback from visitors

**Next Steps:**
1. Create Supabase tables (5 minutes)
2. Create `api/voice-proxy.js` (30 minutes)
3. Modify `widget/embed.html` (1 hour)
4. Test locally (1 hour)
5. Deploy to production (15 minutes)
6. Monitor and iterate

---

**Document Version:** 1.0  
**Last Updated:** January 16, 2026  
**Maintained By:** Portfolio Chat Backend Team
