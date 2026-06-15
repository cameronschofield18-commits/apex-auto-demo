// Apex chat widget — self-contained, injects its own DOM
(function () {
  const API = '/api/chat';
  const MAX_USER_MESSAGES = 20;
  const state = { open: false, busy: false, messages: [] };

  // restore thread across page navigations
  try { state.messages = JSON.parse(sessionStorage.getItem('apex-chat') || '[]'); } catch {}

  const vehicleContext = location.pathname.endsWith('vehicle.html')
    ? new URLSearchParams(location.search).get('id') : null;

  function greeting() {
    if (vehicleContext) {
      const row = document.getElementById('vd-name');
      const name = row && row.textContent ? row.textContent : 'this car';
      return `Looking at ${name}? Ask me anything, or ask what else we have.`;
    }
    return 'Ask me about any car on the lot. Real answers, under a minute.';
  }

  // ---------- DOM ----------
  const root = document.createElement('div');
  root.innerHTML = `
    <button class="chat-fab" id="chat-fab" aria-label="Chat with Apex">
      <span class="chat-fab-dot"></span>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 4.5h14v9H8l-3.5 3v-3H3v-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
    </button>
    <div class="chat-panel" id="chat-panel" hidden>
      <div class="chat-head">
        <span class="chat-title">APEX <em>AUTO</em> — ask anything</span>
        <button class="chat-close" id="chat-close" aria-label="Close chat">&times;</button>
      </div>
      <div class="chat-log" id="chat-log"></div>
      <form class="chat-form" id="chat-form">
        <input id="chat-input" type="text" maxlength="1000" placeholder="Got anything under $50k?" autocomplete="off">
        <button class="btn btn-red chat-send" type="submit">Send</button>
      </form>
    </div>`;
  document.body.appendChild(root);

  const panel = document.getElementById('chat-panel');
  const log = document.getElementById('chat-log');
  const input = document.getElementById('chat-input');

  function addBubble(role, text) {
    const b = document.createElement('div');
    b.className = 'chat-msg chat-' + role;
    b.textContent = text;
    log.appendChild(b);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  function render() {
    log.innerHTML = '';
    addBubble('assistant', greeting());
    for (const m of state.messages) addBubble(m.role, m.content);
  }

  document.getElementById('chat-fab').addEventListener('click', () => {
    state.open = !state.open;
    panel.hidden = !state.open;
    if (state.open) { render(); input.focus(); }
  });
  document.getElementById('chat-close').addEventListener('click', () => {
    state.open = false; panel.hidden = true;
  });

  document.getElementById('chat-form').addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || state.busy) return;
    const userCount = state.messages.filter(m => m.role === 'user').length;
    if (userCount >= MAX_USER_MESSAGES) {
      addBubble('assistant', 'Let us pick this up properly — drop your name and number in the form on any vehicle page and we will call you.');
      return;
    }
    input.value = '';
    state.messages.push({ role: 'user', content: text });
    addBubble('user', text);

    state.busy = true;
    const typing = document.createElement('div');
    typing.className = 'chat-msg chat-assistant chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    log.appendChild(typing);
    log.scrollTop = log.scrollHeight;

    try {
      const resp = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: state.messages, vehicleContext })
      });
      typing.remove();
      if (!resp.ok) throw new Error('bad status ' + resp.status);
      const data = await resp.json();
      state.messages.push({ role: 'assistant', content: data.reply });
      addBubble('assistant', data.reply);
      if (data.lead) recordLead(data.lead, data.followups);
    } catch (err) {
      typing.remove();
      addBubble('assistant', 'Connection hiccup — give it another try in a second.');
      state.messages.pop(); // let them resend
    } finally {
      state.busy = false;
      sessionStorage.setItem('apex-chat', JSON.stringify(state.messages));
    }
  });

  function recordLead(lead, followups) {
    const entry = { ...lead, followups: followups || null, ts: new Date().toISOString(), source: 'chat' };
    try {
      const all = JSON.parse(localStorage.getItem('apex-leads') || '[]');
      all.push(entry);
      localStorage.setItem('apex-leads', JSON.stringify(all));
    } catch {}
    document.dispatchEvent(new CustomEvent('apex-lead', { detail: entry }));
  }
})();
