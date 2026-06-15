// Apex follow-up phone overlay — listens for apex-lead, renders mock SMS thread
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.createElement('div');
  root.className = 'fu-overlay';
  root.id = 'fu-overlay';
  root.hidden = true;
  root.innerHTML = `
    <div class="fu-phone">
      <div class="fu-top"><span class="fu-notch"></span></div>
      <div class="fu-head"><div class="fu-from">Apex Auto Group</div><div class="fu-sub" id="fu-sub">TEXT MESSAGE</div></div>
      <div class="fu-thread" id="fu-thread"></div>
      <div class="fu-actions">
        <button class="btn btn-red fu-ff" id="fu-ff" type="button">Fast-forward 7 days</button>
        <button class="fu-close" id="fu-close" type="button" aria-label="Close">&times;</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const thread = document.getElementById('fu-thread');
  const sub = document.getElementById('fu-sub');
  const ffBtn = document.getElementById('fu-ff');
  let current = null; // current followups pack

  function smsBubble(text, stamp) {
    const b = document.createElement('div');
    b.className = 'fu-bubble';
    b.innerHTML = `<div class="fu-text"></div><div class="fu-stamp">${stamp}</div>`;
    b.querySelector('.fu-text').textContent = text;
    thread.appendChild(b);
    thread.scrollTop = thread.scrollHeight;
    return b;
  }
  function emailCard(subject, stamp) {
    const c = document.createElement('div');
    c.className = 'fu-email';
    c.innerHTML = `<div class="fu-email-h">Email sent</div><div class="fu-email-s"></div><div class="fu-stamp">${stamp}</div>`;
    c.querySelector('.fu-email-s').textContent = subject;
    thread.appendChild(c);
    thread.scrollTop = thread.scrollHeight;
    return c;
  }

  function open(pack) {
    current = pack;
    thread.innerHTML = '';
    sub.textContent = 'TEXT MESSAGE';
    root.hidden = false;
    ffBtn.disabled = false;
    ffBtn.textContent = 'Fast-forward 7 days';
    ffBtn.hidden = !(pack && Array.isArray(pack.drip) && pack.drip.length);
    if (!pack || !pack.sms) {
      smsBubble("Thanks. A salesperson will reach out within a minute.", 'received now');
      ffBtn.hidden = true;
      return;
    }
    const bubble = smsBubble('', 'received 0:41 after inquiry');
    const target = pack.sms;
    const el = bubble.querySelector('.fu-text');
    if (reduce) { el.textContent = target; return; }
    let i = 0;
    (function type() {
      el.textContent = target.slice(0, i++);
      thread.scrollTop = thread.scrollHeight;
      if (i <= target.length) setTimeout(type, 14);
    })();
  }

  function fastForward() {
    if (!current || !current.drip) return;
    ffBtn.disabled = true;
    let n = 0;
    const items = current.drip;
    (function next() {
      if (n >= items.length) { ffBtn.textContent = 'Replayed 7 days'; return; }
      const d = items[n++];
      const stamp = 'Day ' + d.day;
      if (d.channel === 'email') emailCard(d.subject || 'Following up', stamp);
      else smsBubble(d.text, stamp);
      setTimeout(next, reduce ? 0 : 1100);
    })();
  }

  ffBtn.addEventListener('click', fastForward);
  document.getElementById('fu-close').addEventListener('click', () => { root.hidden = true; });
  document.addEventListener('apex-lead', e => { if (e.detail && e.detail.followups) open(e.detail.followups); });
  document.addEventListener('apex-replay', e => { if (e.detail) open(e.detail); });
})();
