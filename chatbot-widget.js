(function () {
  var isEn = document.documentElement.lang.indexOf('en') === 0;
  var ENDPOINT = 'https://ouiacademy.net/api/chat';
  var STR = isEn
    ? {
        toggleLabel: 'Ask the AI assistant',
        title: 'Oui Academy Assistant',
        placeholder: 'Type a message...',
        send: 'Send',
        close: 'Close',
        greeting:
          "Hi! I'm the Oui Academy assistant. Ask me about courses, pricing, or the teacher — for anything I'm not sure about, I'll point you to a real person.",
        error: 'Sorry, something went wrong. Message us on WhatsApp/Zalo at 0631823901 instead.',
        typing: 'Typing...',
      }
    : {
        toggleLabel: 'Hỏi trợ lý AI',
        title: 'Trợ lý Oui Academy',
        placeholder: 'Nhập tin nhắn...',
        send: 'Gửi',
        close: 'Đóng',
        greeting:
          'Chào bạn! Mình là trợ lý AI của Oui Academy. Hỏi mình về khóa học, học phí, hoặc giáo viên nhé — với những gì mình chưa chắc, mình sẽ hướng bạn liên hệ trực tiếp.',
        error: 'Xin lỗi, có lỗi xảy ra. Bạn nhắn tin qua Zalo/WhatsApp 0631823901 nhé.',
        typing: 'Đang trả lời...',
      };

  var style = document.createElement('style');
  style.textContent =
    '.ai-chat-toggle{width:46px;height:46px;border-radius:50%;border:none;cursor:pointer;' +
    'background:var(--ink,var(--navy,#141311));color:var(--yellow,#F4E600);' +
    'display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.22);}' +
    '@media (hover:hover){.ai-chat-toggle:hover{transform:translateY(-3px);}}' +
    '.ai-chat-toggle svg{width:22px;height:22px;}' +
    '.ai-chat-panel{position:fixed;z-index:90;right:20px;bottom:20px;' +
    'width:min(340px,calc(100vw - 40px));max-height:min(480px,calc(100vh - 100px));' +
    'background:var(--paper,#fff);border:2px solid var(--ink,var(--navy,#141311));border-radius:8px;' +
    'box-shadow:0 8px 30px rgba(0,0,0,0.25);display:flex;flex-direction:column;overflow:hidden;' +
    "font-family:'Be Vietnam Pro','Plus Jakarta Sans',sans-serif;font-size:14px;}" +
    '.ai-chat-panel[hidden]{display:none;}' +
    '.ai-chat-header{background:var(--ink,var(--navy,#141311));color:#fff;padding:12px 14px;' +
    'display:flex;align-items:center;justify-content:space-between;font-weight:700;}' +
    '.ai-chat-header button{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;padding:2px 6px;}' +
    '.ai-chat-messages{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;}' +
    '.ai-chat-msg{max-width:85%;padding:8px 11px;border-radius:10px;line-height:1.45;white-space:pre-wrap;}' +
    '.ai-chat-msg.bot{background:var(--cream,var(--ivory,#f4f1e7));align-self:flex-start;border:1px solid var(--line,var(--hair,#eae5d2));}' +
    '.ai-chat-msg.user{background:var(--yellow,#F4E600);color:var(--ink,var(--navy,#141311));align-self:flex-end;}' +
    '.ai-chat-msg.typing{color:var(--grey,var(--navy-soft,var(--ink-soft,#6e6b60)));font-style:italic;}' +
    '.ai-chat-input-row{display:flex;border-top:1px solid var(--line,var(--hair,#eae5d2));}' +
    '.ai-chat-input-row input{flex:1;border:none;padding:11px 12px;font-size:14px;font-family:inherit;outline:none;}' +
    '.ai-chat-input-row button{border:none;background:var(--ink,var(--navy,#141311));color:var(--yellow,#F4E600);' +
    'padding:0 16px;font-weight:700;cursor:pointer;}' +
    '@media (max-width:480px){.ai-chat-panel{right:12px;left:12px;width:auto;bottom:12px;}}';
  document.head.appendChild(style);

  var toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'ai-chat-toggle';
  toggle.setAttribute('aria-label', STR.toggleLabel);
  toggle.title = STR.toggleLabel;
  toggle.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12 3a9 9 0 1 0 6.4 15.4L21 21l-1.1-3.2A9 9 0 0 0 12 3z"/>' +
    '<circle cx="8.5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="15.5" cy="12" r="1"/></svg>';

  var fab = document.querySelector('.chat-fab');
  if (fab) {
    fab.appendChild(toggle);
  } else {
    toggle.style.position = 'fixed';
    toggle.style.left = '20px';
    toggle.style.bottom = '20px';
    toggle.style.zIndex = '75';
    document.body.appendChild(toggle);
  }

  var panel = document.createElement('div');
  panel.className = 'ai-chat-panel';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="ai-chat-header"><span>' + STR.title + '</span>' +
    '<button type="button" aria-label="' + STR.close + '">✕</button></div>' +
    '<div class="ai-chat-messages"></div>' +
    '<form class="ai-chat-input-row">' +
    '<input type="text" placeholder="' + STR.placeholder + '" autocomplete="off">' +
    '<button type="submit" aria-label="' + STR.send + '">→</button></form>';
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector('.ai-chat-messages');
  var form = panel.querySelector('form');
  var input = panel.querySelector('input');
  var closeBtn = panel.querySelector('.ai-chat-header button');
  var history = [];
  var greeted = false;

  function addMsg(role, text) {
    var div = document.createElement('div');
    div.className = 'ai-chat-msg ' + (role === 'user' ? 'user' : 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function openPanel() {
    panel.hidden = false;
    if (!greeted) {
      addMsg('bot', STR.greeting);
      greeted = true;
    }
    input.focus();
  }

  toggle.addEventListener('click', function () {
    if (panel.hidden) openPanel();
    else panel.hidden = true;
  });
  closeBtn.addEventListener('click', function () {
    panel.hidden = true;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMsg('user', text);
    history.push({ role: 'user', content: text });

    var typing = document.createElement('div');
    typing.className = 'ai-chat-msg bot typing';
    typing.textContent = STR.typing;
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: history.slice(-8) }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        typing.remove();
        var reply = data && data.reply ? data.reply : STR.error;
        addMsg('bot', reply);
        history.push({ role: 'assistant', content: reply });
      })
      .catch(function () {
        typing.remove();
        addMsg('bot', STR.error);
      });
  });
})();
