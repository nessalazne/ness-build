/**
 * AISocialHub Chat Widget
 * Set WORKER_URL to your deployed Cloudflare Worker URL after deployment.
 */
(function () {
  const WORKER_URL = 'https://aisocialhub-chat.nessalazne.workers.dev';

  const GREETING = "Hey! I'm the AISocialHub assistant. Ask me anything about the products, pricing, or what's included.";

  const CSS = `
    #aish-chat-bubble {
      position: fixed;
      bottom: 90px;
      right: 24px;
      z-index: 300;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #DEB4B4;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 24px rgba(222,180,180,0.45);
      transition: transform 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s;
      flex-shrink: 0;
    }
    #aish-chat-bubble:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(222,180,180,0.6);
    }
    #aish-chat-bubble svg { width: 24px; height: 24px; fill: #000; flex-shrink: 0; }

    #aish-chat-panel {
      position: fixed;
      bottom: 160px;
      right: 24px;
      z-index: 300;
      width: 360px;
      max-height: 520px;
      background: #111111;
      border: 1px solid #1a1a1a;
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0,0,0,0.7);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      color: #f0e8e8;
      transition: opacity 0.2s, transform 0.2s cubic-bezier(0.16,1,0.3,1);
    }
    #aish-chat-panel.hidden {
      opacity: 0;
      transform: translateY(12px) scale(0.97);
      pointer-events: none;
    }

    #aish-chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: #0a0a0a;
      border-bottom: 1px solid #1a1a1a;
      flex-shrink: 0;
    }
    #aish-chat-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #aish-chat-header-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #50e3c2;
      box-shadow: 0 0 8px rgba(80,227,194,0.6);
      flex-shrink: 0;
    }
    #aish-chat-header-title {
      font-weight: 600;
      font-size: 13px;
      color: #f0e8e8;
      letter-spacing: 0.01em;
    }
    #aish-chat-header-sub {
      font-size: 11px;
      color: #9a8f8f;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.06em;
    }
    #aish-chat-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #9a8f8f;
      padding: 4px;
      display: flex;
      align-items: center;
      border-radius: 6px;
      transition: color 0.15s;
    }
    #aish-chat-close:hover { color: #f0e8e8; }
    #aish-chat-close svg { width: 16px; height: 16px; }

    #aish-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      scrollbar-width: thin;
      scrollbar-color: #1a1a1a transparent;
    }
    #aish-chat-messages::-webkit-scrollbar { width: 4px; }
    #aish-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #aish-chat-messages::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 4px; }

    .aish-msg {
      max-width: 82%;
      padding: 10px 13px;
      border-radius: 12px;
      line-height: 1.55;
      font-size: 13.5px;
      word-break: break-word;
    }
    .aish-msg-user {
      align-self: flex-end;
      background: #DEB4B4;
      color: #000;
      border-radius: 12px 12px 2px 12px;
      font-weight: 500;
    }
    .aish-msg-bot {
      align-self: flex-start;
      background: #1a1a1a;
      color: #f0e8e8;
      border-radius: 12px 12px 12px 2px;
    }
    .aish-msg-typing {
      align-self: flex-start;
      background: #1a1a1a;
      border-radius: 12px 12px 12px 2px;
      padding: 12px 16px;
      display: flex;
      gap: 5px;
      align-items: center;
    }
    .aish-typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #9a8f8f;
      animation: aish-bounce 1.2s ease-in-out infinite;
    }
    .aish-typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .aish-typing-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes aish-bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
      40% { transform: translateY(-5px); opacity: 1; }
    }

    #aish-chat-input-area {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-top: 1px solid #1a1a1a;
      background: #0a0a0a;
      flex-shrink: 0;
    }
    #aish-chat-input {
      flex: 1;
      background: #111111;
      border: 1px solid #1a1a1a;
      border-radius: 10px;
      padding: 9px 13px;
      color: #f0e8e8;
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
      resize: none;
      min-height: 38px;
      max-height: 90px;
    }
    #aish-chat-input::placeholder { color: #9a8f8f; }
    #aish-chat-input:focus { border-color: #DEB4B4; }
    #aish-chat-send {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #DEB4B4;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.2s, transform 0.15s;
    }
    #aish-chat-send:hover { background: #c49a9a; transform: scale(1.05); }
    #aish-chat-send:disabled { background: #2a2a2a; cursor: not-allowed; transform: none; }
    #aish-chat-send svg { width: 16px; height: 16px; fill: #000; }
    #aish-chat-send:disabled svg { fill: #9a8f8f; }

    @media (max-width: 440px) {
      #aish-chat-panel { width: calc(100vw - 24px); right: 12px; bottom: 148px; }
      #aish-chat-bubble { right: 12px; }
    }
  `;

  const BUBBLE_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  const CLOSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const SEND_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>`;

  function inject() {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const bubble = document.createElement('button');
    bubble.id = 'aish-chat-bubble';
    bubble.setAttribute('aria-label', 'Open chat');
    bubble.innerHTML = BUBBLE_ICON;

    const panel = document.createElement('div');
    panel.id = 'aish-chat-panel';
    panel.classList.add('hidden');
    panel.innerHTML = `
      <div id="aish-chat-header">
        <div id="aish-chat-header-left">
          <div id="aish-chat-header-dot"></div>
          <div>
            <div id="aish-chat-header-title">AISocialHub Assistant</div>
            <div id="aish-chat-header-sub">Ask me anything</div>
          </div>
        </div>
        <button id="aish-chat-close" aria-label="Close chat">${CLOSE_ICON}</button>
      </div>
      <div id="aish-chat-messages"></div>
      <div id="aish-chat-input-area">
        <textarea id="aish-chat-input" placeholder="Ask about pricing, what's included…" rows="1"></textarea>
        <button id="aish-chat-send" aria-label="Send message" disabled>${SEND_ICON}</button>
      </div>
    `;

    document.body.appendChild(bubble);
    document.body.appendChild(panel);

    const messagesEl = document.getElementById('aish-chat-messages');
    const inputEl = document.getElementById('aish-chat-input');
    const sendBtn = document.getElementById('aish-chat-send');
    const MAX_MESSAGES = 10;
    let history = [];
    let isOpen = false;
    let greeted = false;
    let userMessageCount = 0;

    function scrollBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function addMessage(role, text) {
      const el = document.createElement('div');
      el.className = role === 'user' ? 'aish-msg aish-msg-user' : 'aish-msg aish-msg-bot';
      el.textContent = text;
      messagesEl.appendChild(el);
      scrollBottom();
      return el;
    }

    function showTyping() {
      const el = document.createElement('div');
      el.className = 'aish-msg-typing';
      el.innerHTML = `<div class="aish-typing-dot"></div><div class="aish-typing-dot"></div><div class="aish-typing-dot"></div>`;
      messagesEl.appendChild(el);
      scrollBottom();
      return el;
    }

    function lockInput() {
      inputEl.disabled = true;
      sendBtn.disabled = true;
      inputEl.placeholder = 'Message limit reached.';
      const el = document.createElement('div');
      el.className = 'aish-msg aish-msg-bot';
      el.textContent = 'You\'ve reached the message limit for this session. For more help, email ness@digicuratoragency.com directly.';
      messagesEl.appendChild(el);
      scrollBottom();
    }

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;

      inputEl.value = '';
      inputEl.style.height = 'auto';
      sendBtn.disabled = true;

      userMessageCount++;
      history.push({ role: 'user', content: text });
      addMessage('user', text);

      const typing = showTyping();

      try {
        const resp = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history }),
        });

        if (!resp.ok) throw new Error('Request failed');

        const data = await resp.json();
        const reply = data.reply || "Sorry, I couldn't get a response. Try again!";
        history.push({ role: 'assistant', content: reply });
        typing.remove();
        addMessage('assistant', reply);
        if (userMessageCount >= MAX_MESSAGES) lockInput();
      } catch {
        typing.remove();
        addMessage('assistant', 'Something went wrong — please try again or email ness@digicuratoragency.com.');
      }
    }

    function openPanel() {
      isOpen = true;
      panel.classList.remove('hidden');
      bubble.setAttribute('aria-label', 'Close chat');

      if (!greeted) {
        greeted = true;
        addMessage('assistant', GREETING);
      }

      setTimeout(() => inputEl.focus(), 50);
    }

    function closePanel() {
      isOpen = false;
      panel.classList.add('hidden');
      bubble.setAttribute('aria-label', 'Open chat');
    }

    bubble.addEventListener('click', () => (isOpen ? closePanel() : openPanel()));
    document.getElementById('aish-chat-close').addEventListener('click', closePanel);

    inputEl.addEventListener('input', () => {
      sendBtn.disabled = inputEl.value.trim().length === 0;
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 90) + 'px';
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) sendMessage();
      }
    });

    sendBtn.addEventListener('click', sendMessage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
