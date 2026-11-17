/* AI examiner — TCF Canada, Expression orale Tâche 2.
 * Shared by luyen-thi-tcf-task-2.html (vi) and luyen-thi-tcf-task-2-en.html (en).
 * Backend: functions/api/tcf-examiner.js
 */
(function () {
  var isEn = document.documentElement.lang.indexOf('en') === 0;
  var API = '/api/tcf-examiner';
  var PREP_SECONDS = 120;

  var T = isEn
    ? {
        loadErr: 'Could not load the sujets. Please refresh the page.',
        random: 'Random sujet',
        tu: 'tutoiement',
        vous: 'vouvoiement',
        pick: 'Choose',
        prepTitle: 'Preparation',
        showTr: 'Show translation',
        hideTr: 'Hide translation',
        examTitle: 'Interaction with the examiner',
        timeUp: 'Time is up!',
        closing: "Très bien, merci. Le temps est écoulé, l'épreuve est terminée. Au revoir !",
        typing: 'The examiner is answering…',
        paused: 'Clock paused while the examiner answers',
        listening: 'Listening… tap again to send',
        micStart: 'Tap to speak',
        noMic: 'Voice input is not supported in this browser (use Chrome, Edge or Safari) — you can still type your questions.',
        micDenied: 'Microphone access was blocked. Allow it in your browser settings, or type instead.',
        netErr: "The examiner couldn't answer (connection issue). Try sending again.",
        you: 'You',
        examiner: 'Examiner',
        fbLoading: 'The examiner is writing your evaluation…',
        fbErr: "Couldn't generate the evaluation right now. Your transcript is below — try again in a moment.",
        retryFb: 'Try evaluation again',
        turns: function (n) { return n + (n === 1 ? ' question/turn' : ' questions/turns'); },
        confirmEnd: 'End the exam now and get your evaluation?',
        voiceOn: '🔊 Examiner voice: on',
        voiceOff: '🔇 Examiner voice: off',
      }
    : {
        loadErr: 'Không tải được danh sách đề. Bạn tải lại trang nhé.',
        random: 'Chọn đề ngẫu nhiên',
        tu: 'xưng « tu »',
        vous: 'xưng « vous »',
        pick: 'Chọn',
        prepTitle: 'Chuẩn bị',
        showTr: 'Xem bản dịch',
        hideTr: 'Ẩn bản dịch',
        examTitle: 'Tương tác với giám khảo',
        timeUp: 'Hết giờ!',
        closing: "Très bien, merci. Le temps est écoulé, l'épreuve est terminée. Au revoir !",
        typing: 'Giám khảo đang trả lời…',
        paused: 'Đồng hồ tạm dừng khi giám khảo đang trả lời',
        listening: 'Đang nghe… bấm lần nữa để gửi',
        micStart: 'Bấm để nói',
        noMic: 'Trình duyệt này chưa hỗ trợ nói bằng giọng (hãy dùng Chrome, Edge hoặc Safari) — bạn vẫn có thể gõ câu hỏi.',
        micDenied: 'Micro đang bị chặn. Hãy cho phép micro trong cài đặt trình duyệt, hoặc gõ chữ.',
        netErr: 'Giám khảo chưa trả lời được (lỗi kết nối). Bạn thử gửi lại nhé.',
        you: 'Bạn',
        examiner: 'Giám khảo',
        fbLoading: 'Giám khảo đang viết nhận xét cho bạn…',
        fbErr: 'Chưa tạo được nhận xét lúc này. Bản ghi cuộc thi ở bên dưới — bạn thử lại sau ít phút nhé.',
        retryFb: 'Thử chấm lại',
        turns: function (n) { return n + ' lượt hỏi/đáp'; },
        confirmEnd: 'Kết thúc bài thi ngay và nhận nhận xét?',
        voiceOn: '🔊 Giọng giám khảo: bật',
        voiceOff: '🔇 Giọng giám khảo: tắt',
      };

  function $(id) { return document.getElementById(id); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  var scenarios = [];
  var current = null;
  var history = [];
  var examSeconds = 210;
  var remaining = 0;
  var timerId = null;
  var phase = 'pick'; // pick | prep | exam | done
  var waiting = false;
  var voiceOn = store('oa_tcf_voice') !== '0';

  // ---------- screens ----------
  function show(id) {
    document.querySelectorAll('.t2-screen').forEach(function (s) { s.classList.remove('active'); });
    $(id).classList.add('active');
    var card = $('t2Card');
    if (card && card.getBoundingClientRect().top < 0) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ---------- sujet picker ----------
  function renderList() {
    var list = $('t2List');
    list.innerHTML = '';
    scenarios.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 't2-sujet';
      b.innerHTML =
        '<span class="t2-sujet-meta"><span class="t2-num">' + (i + 1) + '</span>' +
        '<span class="t2-theme"></span><span class="t2-reg"></span></span>' +
        '<span class="t2-sujet-text"></span>';
      b.querySelector('.t2-theme').textContent = s.theme;
      b.querySelector('.t2-reg').textContent = s.tu ? T.tu : T.vous;
      b.querySelector('.t2-sujet-text').textContent = s.consigne;
      b.addEventListener('click', function () { startPrep(s); });
      list.appendChild(b);
    });
  }

  function loadScenarios() {
    fetch(API)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        scenarios = (d && d.scenarios) || [];
        if (!scenarios.length) throw new Error('empty');
        renderList();
        $('t2Random').disabled = false;
      })
      .catch(function () { $('t2List').innerHTML = '<p class="t2-note">' + T.loadErr + '</p>'; });
  }

  // ---------- prep ----------
  function fillConsigne(prefix) {
    $(prefix + 'Consigne').textContent = current.consigne;
    $(prefix + 'Tr').textContent = isEn ? current.en : current.vi;
    $(prefix + 'Reg').textContent = current.tu ? T.tu : T.vous;
  }

  function startPrep(s) {
    current = s;
    history = [];
    phase = 'prep';
    examSeconds = parseInt($('t2Duration').value, 10) || 210;
    fillConsigne('t2Prep');
    $('t2PrepTr').hidden = true;
    $('t2PrepTrBtn').textContent = T.showTr;
    show('t2ScreenPrep');
    remaining = PREP_SECONDS;
    $('t2PrepClock').textContent = fmt(remaining);
    clearInterval(timerId);
    var last = Date.now();
    timerId = setInterval(function () {
      var now = Date.now();
      remaining -= (now - last) / 1000;
      last = now;
      $('t2PrepClock').textContent = fmt(remaining);
      if (remaining <= 0) startExam();
    }, 250);
    primeSpeech();
  }

  // ---------- exam ----------
  function startExam() {
    clearInterval(timerId);
    phase = 'exam';
    fillConsigne('t2Exam');
    $('t2Notes2').textContent = $('t2Notes').value;
    $('t2Notes2Wrap').hidden = !$('t2Notes').value.trim();
    $('t2Log').innerHTML = '';
    $('t2Input').value = '';
    $('t2Input').disabled = false;
    $('t2Send').disabled = false;
    $('t2End').disabled = false;
    if (micBtn) micBtn.disabled = false;
    show('t2ScreenExam');
    remaining = examSeconds;
    updateClock();
    addMsg('assistant', current.opening);
    history.push({ role: 'assistant', content: current.opening });
    speak(current.opening);
    var last = Date.now();
    timerId = setInterval(function () {
      var now = Date.now();
      if (!waiting) remaining -= (now - last) / 1000;
      last = now;
      updateClock();
      if (remaining <= 0) finishExam(true);
    }, 250);
    $('t2Input').focus({ preventScroll: true });
  }

  function updateClock() {
    var el = $('t2Clock');
    el.textContent = fmt(remaining);
    el.classList.toggle('warn', remaining <= 30);
    $('t2Bar').style.width = Math.max(0, (remaining / examSeconds) * 100) + '%';
    $('t2Paused').hidden = !waiting;
  }

  function addMsg(role, text, cls) {
    var row = document.createElement('div');
    row.className = 't2-msg ' + (role === 'user' ? 'me' : 'ex') + (cls ? ' ' + cls : '');
    var who = document.createElement('span');
    who.className = 't2-who';
    who.textContent = role === 'user' ? T.you : T.examiner;
    var p = document.createElement('div');
    p.className = 't2-bubble';
    p.textContent = text;
    row.appendChild(who);
    row.appendChild(p);
    var log = $('t2Log');
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || phase !== 'exam' || waiting) return;
    stopSpeaking();
    $('t2Input').value = '';
    addMsg('user', text);
    history.push({ role: 'user', content: text.slice(0, 700) });
    requestTurn();
  }

  function requestTurn() {
    waiting = true;
    updateClock();
    $('t2Send').disabled = true;
    var typing = addMsg('assistant', T.typing, 'typing');
    var sentFor = current.id;
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'turn', scenarioId: current.id, history: history, lang: isEn ? 'en' : 'vi' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        typing.remove();
        waiting = false;
        if (phase !== 'exam' || sentFor !== current.id) return;
        if (!d || !d.reply) throw new Error('no reply');
        addMsg('assistant', d.reply);
        history.push({ role: 'assistant', content: d.reply });
        speak(d.reply);
      })
      .catch(function () {
        typing.remove();
        waiting = false;
        if (phase !== 'exam') return;
        // Drop the unanswered line so the next send retries cleanly.
        var lastUser = history.pop();
        addMsg('assistant', T.netErr, 'err');
        $('t2Input').value = lastUser ? lastUser.content : '';
        var rows = $('t2Log').querySelectorAll('.t2-msg.me');
        if (rows.length) rows[rows.length - 1].remove();
      })
      .then(function () {
        if (phase === 'exam') $('t2Send').disabled = false;
        updateClock();
      });
  }

  function finishExam(timeUp) {
    if (phase !== 'exam') return;
    phase = 'done';
    clearInterval(timerId);
    stopListening();
    $('t2Input').disabled = true;
    $('t2Send').disabled = true;
    $('t2End').disabled = true;
    if (micBtn) micBtn.disabled = true;
    $('t2Clock').textContent = '0:00';
    $('t2Bar').style.width = '0%';
    if (timeUp) {
      addMsg('assistant', T.closing);
      speak(T.closing);
    }
    setTimeout(showResult, timeUp ? 1800 : 200);
  }

  // ---------- result + feedback ----------
  function esc(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderMarkdown(md) {
    var html = '';
    var inList = false;
    md.split(/\r?\n/).forEach(function (line) {
      var l = line.trim();
      if (!l) { if (inList) { html += '</ul>'; inList = false; } return; }
      var inline = esc(l).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
      if (/^#{1,4}\s+/.test(l)) {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<h3>' + inline.replace(/^#{1,4}\s+/, '') + '</h3>';
      } else if (/^[-*•]\s+/.test(l) || /^\d+[.)]\s+/.test(l)) {
        if (!inList) { html += '<ul>'; inList = true; }
        html += '<li>' + inline.replace(/^([-*•]|\d+[.)])\s+/, '') + '</li>';
      } else {
        if (inList) { html += '</ul>'; inList = false; }
        html += '<p>' + inline + '</p>';
      }
    });
    if (inList) html += '</ul>';
    return html;
  }

  function showResult() {
    show('t2ScreenResult');
    $('t2ResSujet').textContent = current.consigne;
    var userTurns = history.filter(function (m) { return m.role === 'user'; }).length;
    $('t2ResStats').textContent = T.turns(userTurns);
    var tr = $('t2Transcript');
    tr.innerHTML = '';
    history.forEach(function (m) {
      var p = document.createElement('p');
      var b = document.createElement('strong');
      b.textContent = (m.role === 'user' ? T.you : T.examiner) + ' : ';
      p.appendChild(b);
      p.appendChild(document.createTextNode(m.content));
      tr.appendChild(p);
    });
    requestFeedback();
  }

  function requestFeedback() {
    var box = $('t2Feedback');
    box.innerHTML = '<p class="t2-loading"><span class="t2-dot"></span>' + T.fbLoading + '</p>';
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'feedback', scenarioId: current.id, history: history, lang: isEn ? 'en' : 'vi' }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.feedback) throw new Error('no feedback');
        box.innerHTML = renderMarkdown(d.feedback);
      })
      .catch(function () {
        box.innerHTML = '<p class="t2-note">' + T.fbErr + '</p>';
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 't2-btn ghost';
        b.textContent = T.retryFb;
        b.addEventListener('click', requestFeedback);
        box.appendChild(b);
      });
  }

  // ---------- examiner voice (speech synthesis) ----------
  var synth = window.speechSynthesis || null;
  var frVoice = null;
  function pickVoice() {
    if (!synth) return;
    var voices = synth.getVoices() || [];
    var fr = voices.filter(function (v) { return /^fr(-|_|$)/i.test(v.lang); });
    frVoice =
      fr.filter(function (v) { return /fr[-_]FR/i.test(v.lang) && /google|natural|premium|enhanced|amélie|thomas/i.test(v.name); })[0] ||
      fr.filter(function (v) { return /fr[-_]FR/i.test(v.lang); })[0] ||
      fr[0] || null;
  }
  if (synth) {
    pickVoice();
    if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = pickVoice;
  }
  function primeSpeech() {
    // iOS only allows speech after a user gesture; an empty utterance unlocks it.
    if (!synth) return;
    try { var u = new SpeechSynthesisUtterance(''); synth.speak(u); } catch (e) {}
  }
  function speak(text) {
    if (!synth || !voiceOn) return;
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = frVoice ? frVoice.lang : 'fr-FR';
      if (frVoice) u.voice = frVoice;
      u.rate = 0.95;
      synth.speak(u);
    } catch (e) {}
  }
  function stopSpeaking() { if (synth) try { synth.cancel(); } catch (e) {} }

  function renderVoiceBtn() { $('t2Voice').textContent = voiceOn ? T.voiceOn : T.voiceOff; }

  // ---------- candidate voice (speech recognition) ----------
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  var micBtn = $('t2Mic');
  var rec = null;
  var listening = false;
  var finalText = '';
  var sendOnEnd = false;

  if (!Rec) {
    micBtn.hidden = true;
    $('t2MicNote').textContent = T.noMic;
    $('t2MicNote').hidden = false;
  }

  function startListening() {
    if (!Rec || listening || phase !== 'exam') return;
    stopSpeaking();
    rec = new Rec();
    rec.lang = 'fr-FR';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    finalText = $('t2Input').value ? $('t2Input').value.trim() + ' ' : '';
    sendOnEnd = true;
    rec.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      $('t2Input').value = (finalText + interim).replace(/\s+/g, ' ').trimStart();
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        sendOnEnd = false;
        $('t2MicNote').textContent = T.micDenied;
        $('t2MicNote').hidden = false;
      }
    };
    rec.onend = function () {
      listening = false;
      micBtn.classList.remove('on');
      $('t2MicLabel').textContent = T.micStart;
      if (sendOnEnd && phase === 'exam') send($('t2Input').value);
    };
    try {
      rec.start();
      listening = true;
      micBtn.classList.add('on');
      $('t2MicLabel').textContent = T.listening;
    } catch (e) {}
  }

  function stopListening(discard) {
    if (!rec || !listening) return;
    if (discard) sendOnEnd = false;
    try { rec.stop(); } catch (e) {}
  }

  micBtn.addEventListener('click', function () {
    if (listening) stopListening();
    else startListening();
  });

  // ---------- wiring ----------
  $('t2Random').addEventListener('click', function () {
    if (!scenarios.length) return;
    startPrep(scenarios[Math.floor(Math.random() * scenarios.length)]);
  });
  $('t2PrepTrBtn').addEventListener('click', function () {
    var tr = $('t2PrepTr');
    tr.hidden = !tr.hidden;
    this.textContent = tr.hidden ? T.showTr : T.hideTr;
  });
  $('t2ExamTrBtn').addEventListener('click', function () {
    var tr = $('t2ExamTr');
    tr.hidden = !tr.hidden;
    this.textContent = tr.hidden ? T.showTr : T.hideTr;
  });
  $('t2StartNow').addEventListener('click', startExam);
  $('t2BackPick').addEventListener('click', function () {
    clearInterval(timerId);
    phase = 'pick';
    show('t2ScreenPick');
  });
  $('t2Form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (listening) { stopListening(); return; }
    send($('t2Input').value);
  });
  $('t2Input').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      if (listening) stopListening();
      else send(this.value);
    }
  });
  $('t2End').addEventListener('click', function () {
    if (window.confirm(T.confirmEnd)) finishExam(false);
  });
  $('t2Voice').addEventListener('click', function () {
    voiceOn = !voiceOn;
    store('oa_tcf_voice', voiceOn ? '1' : '0');
    if (!voiceOn) stopSpeaking();
    renderVoiceBtn();
  });
  $('t2Again').addEventListener('click', function () { startPrep(current); });
  $('t2New').addEventListener('click', function () {
    phase = 'pick';
    $('t2Notes').value = '';
    show('t2ScreenPick');
  });
  var savedDur = store('oa_tcf_dur');
  if (savedDur && $('t2Duration').querySelector('option[value="' + savedDur + '"]')) $('t2Duration').value = savedDur;
  $('t2Duration').addEventListener('change', function () { store('oa_tcf_dur', this.value); });
  window.addEventListener('beforeunload', function (e) {
    if (phase === 'exam') { e.preventDefault(); e.returnValue = ''; }
  });

  renderVoiceBtn();
  $('t2MicLabel').textContent = T.micStart;
  loadScenarios();
})();
