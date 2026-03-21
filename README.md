# EimemesChat AI

A fast, intelligent AI chat assistant built with React, TypeScript, and powered by Groq LLM API. Supports document reading, image analysis, personalization, and PWA installation.

**Live:** [eimemes-chat-ai.vercel.app](https://eimemes-chat-ai.vercel.app)

---

## Features

- **AI Chat** — Streaming responses powered by Groq (Llama 3)
- **File Attachments** — Upload and analyze PDFs, Word docs, images, and text files
- **Personalization** — Set your tone, nickname, occupation and custom AI instructions
- **Conversation History** — All chats saved and synced via Firebase Firestore
- **PWA** — Installable on Android and iOS, works offline
- **Dark / Light Mode** — Follows system preference or manual override
- **Secure** — Firebase Auth, per-user Firestore rules, server-side token verification
- **SEO Ready** — Structured data, Open Graph, Google Search Console indexed

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Vercel Serverless Functions (Node.js) |
| AI | Groq API — `llama-3.3-70b-versatile`, `llama-3.1-8b-instant` |
| Auth | Firebase Authentication (Google Sign-In) |
| Database | Firebase Firestore |
| Deployment | Vercel |
| PWA | Service Worker, Web App Manifest |

---

## Project Structure

```
EimemesChat-React/
├── api/
│   └── chat.js              # Serverless AI endpoint (SSE streaming)
├── public/
│   ├── sw.js                # Service worker
│   ├── manifest.json        # PWA manifest
│   └── icons/               # App icons
├── src/
│   ├── components/          # UI components
│   ├── hooks/               # Custom React hooks
│   ├── context/             # App-wide state (AppContext)
│   ├── lib/                 # Utilities (markdown, fileReader)
│   ├── styles/              # Global CSS variables and animations
│   └── types.ts             # TypeScript types
├── knowledge.js             # Static Kuki cultural knowledge base
├── shield.js                # System prompt protection layer
├── vercel.json              # Vercel config
└── index.html               # Entry point with SEO meta tags
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project with Auth and Firestore enabled
- Groq API key ([console.groq.com](https://console.groq.com))

### Installation

```bash
git clone https://github.com/michaelkilong/EimemesChat-React.git
cd EimemesChat-React
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

For Vercel serverless functions, add in Vercel dashboard:

```env
GROQ_API_KEY=your_groq_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Deploy

Push to `main` branch — Vercel auto-deploys.

```bash
git add .
git commit -m "your message"
git push origin main
```

---

## Security

- All API requests require a valid Firebase Auth token verified server-side
- Firestore rules enforce strict owner-only access per user
- System prompt protected with n-gram fingerprinting against extraction
- File attachments processed in-memory only — never stored
- Daily message limits enforced both client and server side

---

## Roadmap

- [ ] Voice input (Web Speech API)
- [ ] Conversation search
- [ ] Landing page (on custom domain)
- [ ] Thadou Kuki language support (fine-tuned model)
- [ ] Native Android app

---

## License

MIT License

Copyright (c) 2026 Michael Kilong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Credits

**Built by Michael Kilong**

- GitHub: [@michaelkilong](https://github.com/michaelkilong)
- App: [eimemes-chat-ai.vercel.app](https://eimemes-chat-ai.vercel.app)

---

*EimemesChat AI — Eimemes AI Team © 2026*
