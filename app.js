(() => {
  'use strict';
  const config = window.AQUA_CONFIG;
  const root = document.getElementById('main');
  const nav = document.getElementById('bottom-nav');
  const modal = document.getElementById('modal');
  const storageKey = 'okyanus-kasifi:passport:v1';
  let saveAvailable = true, offlineStatus = 'loading', state = null;
  let view = 'welcome', taskId = null, avatarId = 'turtle';
  let quizIndex = null, replay = null;
  let passportOpened = false, passportPage = 0;
  let selectedAnimal = null, scannerTarget = null, scannerStream = null;
  let scannerFrame = null, scannerGeneration = 0, toastTimer, importCandidate, lastFocused;
  const paths = {
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    cards: '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12M7 12h5M7 16h3"/>',
    waves: '<path d="M2 6q3-3 6 0t6 0 6 0M2 12q3-3 6 0t6 0 6 0M2 18q3-3 6 0t6 0 6 0"/>',
    pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
    scan: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5M3 12h18"/>',
    book: '<path d="M12 5v16M12 5C8 2 3 4 3 4v15s5-2 9 2c4-4 9-2 9-2V4s-5-2-9 1Z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    back: '<path d="m14 5-7 7 7 7M7 12h14"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    camera: '<path d="M8 5 6 8H3v12h18V8h-3l-2-3Z"/><circle cx="12" cy="13" r="4"/>',
    offline: '<path d="M3 8a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".5"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.star}</svg>`;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const station = id => config.stations.find(item => item.id === id);
  const avatar = id => config.avatars.find(item => item.id === id) || config.avatars[0];
  const count = () => state?.completed.length || 0;
  const normalName = value => String(value || '').normalize('NFC').replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, 24);


  const progress = () => replay || state;
  const persistProgress = () => { if(!replay) save(); };
  const rank = () => ['Meraklı Kaşif','İpucu Avcısı','Deniz Gözlemcisi','Okyanus Kaşifi'][count()];
  const points = () => count() * 100;
  function questionIds(id) { return config.quizzes[id].map(q => q.id); }
  function taskProgress(id) {
    if(state.completed.includes(id)) return 100;
    const stage = id==='match' ? state.pairs.length/3 : id==='ocean' ? state.cleaned.length/3 : 0;
    const total = config.quizzes[id].length + (id==='ray'?0:1);
    return Math.round(((state.answers[id].length+stage)/total)*100);
  }
  function validState(value) {
    if (!value || value.version !== 1 || !/^OK-[A-F0-9]{8}$/.test(value.id || '') || typeof value.name !== 'string' || value.name.length > 24 || !config.avatars.some(a => a.id === value.avatar)) return null;
    if (!Number.isFinite(value.createdAt) || value.createdAt < 0 || value.createdAt > Date.now() + 60000) return null;
    const arrays = [['completed', config.stations.map(s => s.id)], ['unlocked', config.stations.map(s => s.id)], ['pairs', ['turtle','octopus','fish']], ['cleaned', ['bottle','bag','can']]];
    for (const [key, allowed] of arrays) if (!Array.isArray(value[key]) || value[key].length > allowed.length || value[key].some(x => !allowed.includes(x)) || new Set(value[key]).size !== value[key].length) return null;
    const answers={ray:[],match:[],ocean:[]};
    if(value.answers != null) {
      if(typeof value.answers!=='object'||Array.isArray(value.answers)) return null;
      for(const id of ['ray','match','ocean']) {
        const list=value.answers[id];
        if(!Array.isArray(list)||list.length>questionIds(id).length||list.some(x=>!questionIds(id).includes(x))||new Set(list).size!==list.length) return null;
        answers[id]=[...list];
      }
    } else if(value.rayCorrect) answers.ray=['shape'];
    return {version:1, id:value.id, name:normalName(value.name) || avatar(value.avatar).alias, avatar:value.avatar, createdAt:value.createdAt, completed:[...value.completed], unlocked:[...new Set([...value.unlocked, ...value.completed])], pairs:[...value.pairs], cleaned:[...value.cleaned], rayCorrect:!!value.rayCorrect,answers};
  }
  function readState() {
    try { const saved = localStorage.getItem(storageKey); return saved ? validState(JSON.parse(saved)) : null; }
    catch { saveAvailable = false; return null; }
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(state)); saveAvailable = true; }
    catch { saveAvailable = false; toast('Bu tarayıcı ilerlemeyi saklayamıyor. Pasaportundan bir yedek indir.'); }
  }
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
  }
  function announce(message) { document.getElementById('announcement').textContent = message; }
  function strip() {
    const ready = offlineStatus === 'ready';
    const message = ready ? (navigator.onLine ? 'Keşif hazır. İnternet olmadan da oynayabilirsin.' : 'Çevrimdışısın. Keşfin devam ediyor.') : offlineStatus === 'loading' ? 'Çevrimdışı keşif hazırlanıyor…' : 'Çevrimdışı hazırlık tamamlanamadı. Bağlantını kontrol et.';
    return `<div class="connection-strip ${ready ? 'ready' : ''}"><span class="status-title">${icon(ready ? 'check' : 'offline')}${message}</span>${offlineStatus === 'error' ? '<button data-action="retry-offline">Tekrar dene</button>' : '<span>Uygulama indirmeden</span>'}</div>`;
  }
  function stamps(large = false) {
    return config.stations.map(s => {
      const done = state.completed.includes(s.id);
      const seal = `<div class="stamp-slot ${done ? 'earned ' + s.color : ''}" aria-label="${escape(s.stamp)}: ${done ? 'kazanıldı' : 'henüz kazanılmadı'}">${icon(s.icon)}</div>`;
      return large ? `<article>${seal}<h3>${escape(s.stamp)}</h3><p>${done ? 'Damga kazanıldı' : 'Keşfini bekliyor'}</p></article>` : seal;
    }).join('');
  }
  function renderWelcome() {
    root.innerHTML = `<section class="intro expedition-intro"><div class="intro-copy"><p class="eyebrow">MERCAN ROTASI / 01</p><div class="live-pill"><i></i> KEŞİF SEZONU AÇILDI</div><h1>Bir okyanus.<br>Bin hikâye.<br><em>Senin keşfin.</em></h1><p class="lead">${escape(config.mission)}</p><div class="mission-tags"><span>${icon('pin')}3 istasyon</span><span>${icon('compass')}7 keşif sorusu</span><span>${icon('star')}300 puan</span></div><p class="brief-note">Bak. Merak et. Kendi izini bırak.</p><div class="hero-coordinate" aria-hidden="true">36° N &nbsp; / &nbsp; 29° E &nbsp; — &nbsp; HAYALİNİN DERİNLİKLERİ</div></div><form class="passport-create" id="start-form"><div class="card-topline"><span class="eyebrow">YOLCULUĞUN BURADA BAŞLIYOR</span><span class="mini-seal">≈</span></div><h2>Keşif arkadaşını seç.</h2><div class="avatar-picker">${config.avatars.map(a=>`<button type="button" class="avatar-option" data-avatar="${a.id}" aria-pressed="${avatarId===a.id}"><img src="${a.file}" alt="">${escape(a.name)}</button>`).join('')}</div><label class="form-label" for="explorer-name">Keşif adın <span style="font-weight:400;color:var(--muted)">(isteğe bağlı)</span></label><input id="explorer-name" class="text-input" placeholder="${escape(avatar(avatarId).alias)}" maxlength="24" autocomplete="off"><p class="field-help">Gerçek adın yerine bir takma ad kullan.</p><button class="primary full-width" id="start-button" ${offlineStatus==='loading'?'disabled':''}>${offlineStatus==='loading'?'Keşif hazırlanıyor…':'Maceraya başla'} ${icon('compass')}</button><p class="privacy-note">${icon('shield')}Hesap açmadan, uygulama indirmeden.</p><p class="field-help" id="prepare-note">${offlineStatus==='ready'?'Hazır! İçeride internet kesilse de oynayabilirsin.':offlineStatus==='error'?'Şu an internetle oynayabilirsin. Çevrimdışı hazırlık için yardım ekranını aç.':'İçeride de oynayabilmen için görevleri telefonuna hazırlıyoruz.'}</p></form></section><section class="intro-stops"><div class="intro-stop"><span class="icon-tile">${icon('eye')}</span><div><h3>Bir ayrıntı fark et.</h3><p>Gözlemini bir ipucuna dönüştür.</p></div></div><div class="intro-stop"><span class="icon-tile blue">${icon('cards')}</span><div><h3>Bir bağlantı kur.</h3><p>Canlıların özelliklerini karşılaştır.</p></div></div><div class="intro-stop"><span class="icon-tile gold">${icon('waves')}</span><div><h3>Bir karar ver.</h3><p>Okyanus için harekete geç.</p></div></div></section>`;
  }

  function renderHome() {
    const a=avatar(state.avatar), next=config.stations.find(s=>!state.completed.includes(s.id));
    root.innerHTML=`${strip()}<section class="expedition-banner"><div><p class="eyebrow">MERCAN ROTASI · ${escape(rank().toLocaleUpperCase('tr-TR'))}</p><h1>${count()===3?'Keşif günlüğü tamam!':`Rotan hazır, ${escape(state.name)}.`}</h1><p>${count()===3?'Üç istasyonu keşfettin. Şimdi öğrendiklerini pasaportunda sakla.':'Okyanusun üç eksik sayfasını tamamla. Her istasyon yeni bir ipucu ve 100 keşif puanı kazandırır.'}</p><div class="mission-tags"><span>${icon('star')}${points()} / 300 puan</span><span>${icon('book')}${count()} / 3 damga</span></div></div><img src="${a.file}" alt="${escape(a.name)} keşif arkadaşın"></section><div class="route-map"><div class="map-heading"><span class="eyebrow">KEŞİF HARİTAN</span><span>03 DURAK / SINIRSIZ MERAK</span></div><div class="route-path" aria-label="Keşif rotası">${config.stations.map((s,i)=>`<button data-station="${s.id}" class="route-step ${state.completed.includes(s.id)?'done':''}" aria-label="${escape(s.title)} istasyonunu aç"><span>${state.completed.includes(s.id)?'✓':String(i+1).padStart(2,'0')}</span><img src="assets/v3/${['turtle','octopus','fish'][i]}.webp" alt=""><strong>${['Gözlemle','Bağlantı kur','Koru'][i]}</strong><small>${state.completed.includes(s.id)?'KEŞFEDİLDİ':'KEŞFE AÇIK'}</small></button>`).join('')}</div></div><div class="dashboard-grid"><section><div class="section-topline"><h2>Keşif görevlerin</h2><span class="progress-count">Sıra sana ait</span></div><div class="station-list">${config.stations.map((s,i)=>{
      const done=state.completed.includes(s.id), opened=state.unlocked.includes(s.id), pct=taskProgress(s.id);
      return `<article class="station-card ${done?'completed':''} station-${s.id}"><span class="icon-tile ${s.color}">${icon(s.icon)}</span><div><p class="eyebrow">0${i+1} / ${escape(s.category)} · +100 PUAN</p><h3>${escape(s.title)}</h3><p class="location">${icon('pin')}${escape(s.zone)} · ${escape(s.duration)}</p>${opened&&!done?`<div class="card-task-progress"><div style="width:${pct}%"></div></div><small class="card-progress-label">${pct}% keşfedildi</small>`:''}</div><button class="open-station" data-station="${s.id}" aria-label="${escape(s.title)}: ${done?'tamamlandı':opened?'devam et':'istasyon kodunu aç'}">${done?'✓ Tamam':opened?'Devam':'Aç'}</button></article>`;
    }).join('')}</div><button class="primary scan-cta" data-action="scan">${icon('scan')}İstasyon kodunu okut</button>${next?`<div class="next-discovery"><span class="eyebrow">SIRADAKİ İPUCU</span><p>${escape(next.description)}</p><button class="text-link" data-station="${next.id}">${escape(next.title)} ${icon('back')}</button></div>`:''}<p class="route-note">${icon('compass')}<span>Önce etrafına bak, sonra telefonuna. Görevleri durup güvenli bir yerde tamamla.</span></p></section><aside><section class="pass-preview"><p class="eyebrow">OKYANUS KAŞİFİ PASAPORTU</p><p class="passport-number">${escape(state.id)}</p><div class="pass-person"><img src="${a.file}" alt=""><div><strong>${escape(state.name)}</strong><span>${escape(rank())}</span></div></div><div class="stamp-row">${stamps()}</div><div class="progress-track" role="progressbar" aria-label="Keşif ilerlemesi" aria-valuenow="${count()}" aria-valuemin="0" aria-valuemax="3"><div style="width:${count()/3*100}%"></div></div><p class="progress-copy">${count()===3?'Sertifikan hazır. Okyanus Kaşifi oldun!':`Sertifikana ${3-count()} damga kaldı.`}</p><button class="secondary" data-action="${count()===3?'certificate':'passport'}">${icon('book')}${count()===3?'Sertifikamı gör':'Pasaport ve keşif günlüğü'}</button>${!saveAvailable?'<p class="save-warning">İlerleme saklanamıyor. Pasaport ekranından yedek indir.</p>':''}</section></aside></div>`;
  }

  function head(title, eyebrow = 'KEŞİF GÖREVİ') { return `<div class="view-head"><button class="back-button" data-action="home" aria-label="Keşif rotasına dön">${icon('back')}</button><div><p class="eyebrow">${escape(eyebrow)}</p><h1>${escape(title)}</h1></div></div>`; }
  function quizMarkup(s,p) {
    const questions=config.quizzes[s.id];
    if(quizIndex===null) { const unanswered=questions.findIndex(q=>!p.answers[s.id].includes(q.id)); quizIndex=unanswered<0?questions.length-1:unanswered; }
    quizIndex=Math.min(Math.max(quizIndex,0),questions.length-1);
    const q=questions[quizIndex], answered=p.answers[s.id].includes(q.id), last=quizIndex===questions.length-1;
    return `<div class="question-topline"><span class="eyebrow">${escape(q.label)}</span><span>${quizIndex+1} / ${questions.length} soru</span></div><h2 id="question-title" tabindex="-1">${escape(q.question)}</h2><p>${escape(q.prompt)}</p><div class="answers">${q.choices.map(([id,text])=>`<button class="answer-button ${answered&&id===q.correct?'correct':''}" data-quiz-answer="${id}" data-question="${q.id}" ${answered?'disabled':''}><span class="answer-letter">${id.toUpperCase()}</span>${escape(text)}${answered&&id===q.correct?icon('check'):''}</button>`).join('')}</div><div id="task-feedback" class="feedback" ${answered?'':'hidden'} role="status">${answered?'Keşif notu: '+escape(q.explanation):''}</div>${!answered?'<button class="hint-button" data-action="hint">Bir ipucu al</button>':''}<button class="primary task-action full-width" ${last?`data-complete="${s.id}"`:'data-action="quiz-next"'} ${answered?'':'disabled'}>${last?(replay?'Tekrar keşfi tamamla':'Damgamı al · +100 puan'):'Sıradaki keşif sorusu'} ${icon(last?'check':'compass')}</button>`;
  }
  function renderTask() {
    const s=station(taskId);
    if(!s||!state.unlocked.includes(s.id))return go('home');
    if(replay&&replay.id!==s.id)replay=null;
    if(state.completed.includes(s.id)&&!replay)return renderEarned();
    const p=progress();selectedAnimal=null;let game='', phase='quiz';
    if(s.id==='match'&&p.pairs.length<3){
      phase='matching';
      game=`<div class="question-topline"><span class="eyebrow">CANLI DOSYALARI</span><span>İlk adım</span></div><h2>Üç canlı, üç farklı özellik.</h2><p>Önce canlıyı, sonra ona ait özellik dosyasını seç. Hepsini eşleştirince iki çıkarım sorusu seni bekliyor.</p><div class="match-board"><div class="match-column">${config.avatars.map(a=>`<button class="match-choice ${p.pairs.includes(a.id)?'matched':''}" data-animal="${a.id}" ${p.pairs.includes(a.id)?'disabled':''} aria-pressed="false"><img src="${a.file}" alt="">${escape(a.name)}${p.pairs.includes(a.id)?' ✓':''}</button>`).join('')}</div><div class="match-column">${[['fish','Yüzgeçleri, kuyruğu ve solungaçları var.'],['octopus','Yumuşak gövdesi ve sekiz kolu var.'],['turtle','Kabuğu var; hava solumak için yüzeye çıkar.']].map(([id,text])=>`<button class="match-choice ${p.pairs.includes(id)?'matched':''}" data-clue="${id}" ${p.pairs.includes(id)?'disabled':''}>${escape(text)}${p.pairs.includes(id)?' ✓':''}</button>`).join('')}</div></div><p class="mini-progress">${p.pairs.length} / 3 canlı dosyası eşleştirildi</p><div id="task-feedback" class="feedback" hidden role="status"></div>`;
    }else if(s.id==='ocean'&&p.cleaned.length<3){
      phase='cleanup';
      game=`<div class="question-topline"><span class="eyebrow">SANAL DENİZ ALANI</span><span>İlk adım</span></div><h2>Doğaya ait olanı yerinde bırak.</h2><p>Denizdeki üç insan kaynaklı atığı topla. Sonra görünmeyen plastikler ve atıkları önleme üzerine karar ver.</p><div class="ocean-grid">${[['shell','🐚','Deniz kabuğu'],['bottle','🧴','Plastik şişe'],['fish','🐟','Balık'],['bag','🛍️','Plastik poşet'],['seaweed','🌿','Deniz yosunu'],['can','🥫','Metal kutu']].map(([id,emoji,text])=>`<button class="ocean-item ${p.cleaned.includes(id)?'cleaned':''}" data-object="${id}" ${p.cleaned.includes(id)?'disabled':''}><span class="object" aria-hidden="true">${p.cleaned.includes(id)?'✓':emoji}</span><span>${p.cleaned.includes(id)?'Toplandı':text}</span></button>`).join('')}</div><p class="mini-progress">${p.cleaned.length} / 3 atık toplandı</p><div id="task-feedback" class="feedback" hidden role="status"></div>`;
    }else game=quizMarkup(s,p);
    const done=p.answers[s.id].length+(s.id==='match'?p.pairs.length/3:s.id==='ocean'?p.cleaned.length/3:0), total=config.quizzes[s.id].length+(s.id==='ray'?0:1);
    root.innerHTML=`${head(s.title,replay?'YENİDEN KEŞİF':s.category)}<div class="task-stage-bar" role="progressbar" aria-label="İstasyon ilerlemesi" aria-valuenow="${Math.round(done/total*100)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${done/total*100}%"></span></div><div class="task-layout"><section class="task-panel" data-phase="${phase}">${game}</section><aside class="task-info"><img class="task-creature" src="assets/v3/${s.id==='match'?'octopus':s.id==='ocean'?'fish':'turtle'}.webp" alt=""><span class="icon-tile ${s.color}">${icon(s.icon)}</span><p class="eyebrow">${replay?'PUANIN VE DAMGAN KORUNUR':'+100 KEŞİF PUANI'}</p><h3>${escape(s.stamp)}</h3><p>${escape(s.description)}</p><div class="info-line">${icon('pin')}${escape(s.zone)} · ${escape(s.duration)}</div><p class="field-help">Yanlış cevap bir son değil. İpucu al, düşün ve yeniden dene.</p></aside></div>`;
  }

  function feedback(message, error = false) {
    const box = document.getElementById('task-feedback');
    if (box) { box.hidden = false; box.classList.toggle('error',error); box.textContent = message; }
  }
  function renderEarned() {
    const s=station(taskId), next=config.stations.find(x=>!state.completed.includes(x.id));
    root.innerHTML=`${head('Keşif günlüğüne eklendi.','İSTASYON TAMAMLANDI')}<section class="success-panel">${passportBook(s.id)}<p class="eyebrow">100 PUANLIK KEŞİF · ${points()} / 300 PUAN</p><h2>${escape(s.stamp)}</h2><p>${escape(state.name)}, ${count()===3?'üç sayfayı da tamamladın. Artık bir Okyanus Kaşifisin!':`günlüğünün ${count()}. sayfası tamam. Yeni bir ipucu seni bekliyor.`}</p><div class="earned-notes"><span class="eyebrow">BU KEŞİFTEN YANINDA GÖTÜR</span><p>${escape(config.fieldNotes[s.id][0])}</p></div><button class="primary" data-action="${count()===3?'certificate':'home'}">${count()===3?'Sertifikamı gör':'Rotama dön'} ${icon(count()===3?'star':'compass')}</button>${next?`<p class="field-help">Sıradaki öneri: ${escape(next.title)} · ${escape(next.zone)}</p>`:''}<div class="footer-links"><button data-action="passport">Keşif günlüğümü gör</button><button data-replay="${s.id}">Görevi yeniden oyna</button></div></section>`;
  }

  function bookPage(id, arriving = false) {
    const item=station(id), done=state.completed.includes(id), number=config.stations.findIndex(x=>x.id===id)+1;
    return `<div class="paper-heading"><span>KEŞİF KAYDI</span><span>0${number} / 03</span></div><h2>${escape(item.title)}</h2><div class="ink-stamp ${item.color} ${done?'collected':'uncollected'} ${arriving?'stamp-arrival':''}"><div class="stamp-orbit">${icon(item.icon)}<strong>${done?'KEŞFEDİLDİ':'KEŞFİNİ BEKLİYOR'}</strong><span>MERCAN ROTASI · 0${number}</span></div></div><h3>${escape(item.stamp)}</h3><p class="paper-note">${done?escape(config.fieldNotes[id][0]):'Bu istasyonu keşfet. Kendi izini bu sayfaya bırak.'}</p><div class="paper-footer"><span>${done?'+100 KEŞİF PUANI':'BİR SONRAKİ HİKÂYEN'}</span><span>✦</span></div>`;
  }
  function passportBook(arrivalId = null) {
    const open=arrivalId||passportOpened, page=arrivalId?config.stations.findIndex(x=>x.id===arrivalId):passportPage;
    return `<section class="passport-theatre ${arrivalId?'arrival-theatre':''}" aria-label="Animasyonlu dijital pasaport"><div class="book-caption"><span>MERCAN ROTASI</span><span>${count()} DAMGA · ${points()} PUAN</span></div><div class="passport-book ${open?'is-open':''} ${arrivalId?'book-arrival':''}" id="passport-book"><div class="book-spread" id="book-spread" ${open?'':'inert aria-hidden="true"'}><div class="book-left"><p class="paper-heading">OKYANUS KAŞİFİ / KİMLİK</p><div class="passport-portrait"><img src="${avatar(state.avatar).file}" alt=""></div><span class="paper-label">BU YOLCULUĞUN KAŞİFİ</span><strong class="passport-owner">${escape(state.name)}</strong><p class="paper-rank">${escape(rank())}</p><div class="passport-detail"><span>PASAPORT NO.</span><strong>${escape(state.id)}</strong></div><div class="passport-detail"><span>YOLA ÇIKIŞ</span><strong>${escape(dateLabel())}</strong></div><div class="passport-signature">Okyanus seni bekliyor.</div><div class="passport-mrz" aria-hidden="true">OKYANUS&lt;&lt;KASIFI&lt;&lt;MERCAN<br>${escape(state.id)}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div></div><div class="book-right" id="passport-leaf" aria-live="polite">${bookPage(config.stations[page].id,!!arrivalId)}</div></div><div class="book-cover" aria-hidden="true"><div class="cover-border"><span class="cover-edition">MERCAN ROTASI / 01</span><strong>OKYANUS<br>KAŞİFİ</strong><div class="cover-emblem">${icon('compass')}<span>✦</span></div><span class="cover-title">PASAPORT</span><span class="cover-name">${escape(state.name)}</span><span class="cover-bottom">KEŞFET · ÖĞREN · KORU</span></div></div></div>${arrivalId?'<button class="text-link arrival-skip" data-action="book-skip">Animasyonu geç</button>':`<div class="book-controls"><button class="secondary" data-action="book-toggle" aria-expanded="${!!open}" aria-controls="book-spread">${icon('book')}<span>${open?'Kapağı kapat':'Pasaportu aç'}</span></button><button class="text-link" data-action="book-direct" ${open?'hidden':''}>Damgaları göster</button><div class="page-controls" ${open?'':'hidden'}><button class="page-arrow" data-action="book-prev" aria-label="Önceki pasaport sayfası" ${page===0?'disabled':''}>${icon('back')}</button><span id="page-counter">0${page+1} / 03</span><button class="page-arrow" data-action="book-next" aria-label="Sonraki pasaport sayfası" ${page===2?'disabled':''}>${icon('back')}</button></div></div>`}<p class="book-help">${arrivalId?'Bir keşif daha. Sana ait bir iz daha.':'Her damga, keşfettiğin bir hikâye.'}</p></section>`;
  }
  function toggleBook(direct=false) {
    const book=document.getElementById('passport-book'); if(!book||view!=='passport')return;
    passportOpened=direct||!passportOpened;
    book.classList.toggle('instant',direct); book.classList.toggle('is-open',passportOpened);
    const spread=document.getElementById('book-spread'); spread.inert=!passportOpened;
    if(passportOpened)spread.removeAttribute('aria-hidden');else spread.setAttribute('aria-hidden','true');
    const toggle=root.querySelector('[data-action="book-toggle"]');toggle.setAttribute('aria-expanded',String(passportOpened));toggle.querySelector('span').textContent=passportOpened?'Kapağı kapat':'Pasaportu aç';
    root.querySelector('.page-controls').hidden=!passportOpened;root.querySelector('[data-action="book-direct"]').hidden=passportOpened;
    announce(passportOpened?'Pasaport açıldı. '+station(config.stations[passportPage].id).title:'Pasaport kapandı.');
  }
  function turnPassport(direction) {
    if(view!=='passport'||!passportOpened)return;
    const next=Math.max(0,Math.min(2,passportPage+direction));if(next===passportPage)return;passportPage=next;
    const leaf=document.getElementById('passport-leaf');leaf.getAnimations().forEach(a=>a.cancel());leaf.innerHTML=bookPage(config.stations[next].id);
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches)leaf.animate([{transform:`perspective(900px) rotateY(${direction>0?-65:65}deg)`,opacity:.25},{transform:'perspective(900px) rotateY(0deg)',opacity:1}],{duration:620,easing:'cubic-bezier(.2,.7,.2,1)'});
    document.getElementById('page-counter').textContent=`0${next+1} / 03`;
    root.querySelector('[data-action="book-prev"]').disabled=next===0;root.querySelector('[data-action="book-next"]').disabled=next===2;
  }
  function skipBookAnimation() { root.querySelector('.book-arrival')?.classList.remove('book-arrival');root.querySelector('.stamp-arrival')?.classList.remove('stamp-arrival');root.querySelector('.arrival-skip')?.setAttribute('hidden',''); }

  function renderPassport() {
    const a = avatar(state.avatar);
    root.innerHTML = `<div class="passport-view">${head('Dijital pasaportun','KEŞİF KOLEKSİYONU')}${passportBook()}<div class="passport-actions"><button class="primary" data-action="${count() === 3 ? 'certificate' : 'home'}">${count() === 3 ? 'Sertifikamı gör' : 'Keşfe devam et'} ${icon('compass')}</button><button class="secondary" data-action="backup">${icon('download')}Pasaportumu yedekle</button></div><p class="field-help">Pasaportun bu cihazın bu tarayıcısında tutulur. Tarayıcı verilerini silersen kaybolabilir. Yedeğinle başka cihaza taşıyabilirsin.</p>${!saveAvailable ? '<p class="save-warning">Bu tarayıcı ilerlemeyi saklayamıyor. Ayrılmadan önce yedek indir.</p>' : ''}<section class="field-journal"><div class="section-topline"><h2>Keşif günlüğün</h2><span class="progress-count">${count()} / 3 sayfa</span></div>${config.stations.map(s=>`<details ${state.completed.includes(s.id)?'':'class="journal-locked"'}><summary>${icon(s.icon)}<strong>${escape(s.title)}</strong><span>${state.completed.includes(s.id)?'Kaydı aç':'Henüz keşfedilmedi'}</span></summary>${state.completed.includes(s.id)?`<ul>${config.fieldNotes[s.id].map(note=>`<li>${escape(note)}</li>`).join('')}</ul><button class="quiet-button" data-replay="${s.id}">Görevi yeniden oyna</button>`:'<p>Bu istasyonun damgasını aldığında keşif notların burada açılacak.</p>'}</details>`).join('')}</section><div class="footer-links"><button data-action="import">Yedeğimi aç</button><button data-action="reset">Yeni pasaport oluştur</button></div></div>`;
  }
  function dateLabel() { return new Intl.DateTimeFormat('tr-TR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Istanbul'}).format(state.createdAt); }
  function renderCertificate() {
    if (count() !== 3) return go('passport');
    root.innerHTML = `<div class="passport-view">${head('Keşfin bir hatıraya dönüştü.','ÜÇ DAMGA / BİR SERTİFİKA')}<section class="certificate-card"><p class="eyebrow">${escape(config.aquarium.toLocaleUpperCase('tr-TR'))} · İLK KEŞİF</p><div class="certificate-emblem" aria-hidden="true">✦</div><h2>Okyanus Kaşifi<br>Sertifikası</h2><strong>${escape(state.name)}</strong><p>Gözlemledin, canlıları tanıdın ve okyanusu korumak için bir adım attın.<br>Üç keşif damgası da senin!</p><small>${escape(dateLabel())} · ${escape(state.id)}</small></section><div class="passport-actions"><button class="primary" data-action="download-certificate">${icon('download')}Sertifikamı indir</button><button class="secondary" data-action="print">Yazdır / PDF kaydet</button><button class="quiet-button" data-action="passport">Pasaportumu gör</button></div><p class="field-help">Sertifikanı görsel olarak indirebilirsin. Paylaşım kararını bir yetişkinle birlikte ver.</p></div>`;
  }
  function render() {
    if (!state && view !== 'welcome') view = 'welcome';
    const renderers = {welcome:renderWelcome,home:renderHome,task:renderTask,earned:renderEarned,passport:renderPassport,certificate:renderCertificate};
    document.body.dataset.view=view;
    renderers[view]();
    nav.hidden = !state;
    if (state) nav.innerHTML = `<button data-action="home" ${['home','task','earned'].includes(view) ? 'aria-current="page"' : ''}>${icon('compass')}Keşif</button><button data-action="scan">${icon('scan')}Kod okut</button><button data-action="passport" ${['passport','certificate'].includes(view) ? 'aria-current="page"' : ''}>${icon('book')}Pasaport</button>`;
  }
  function go(next, id = null) { closeModal(); document.querySelectorAll('.confetti').forEach(piece=>piece.remove()); quizIndex=null; if(next!=='task')replay=null; view = next; if(id) taskId = id; render(); root.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
  function startPassport(alias, selectedAvatar) {
    if (state) return false;
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    state = {version:1,id:'OK-'+Array.from(bytes,b => b.toString(16).padStart(2,'0')).join('').toUpperCase(),name:normalName(alias) || avatar(selectedAvatar).alias,avatar:avatar(selectedAvatar).id,createdAt:Date.now(),completed:[],unlocked:[],pairs:[],cleaned:[],rayCorrect:false,answers:{ray:[],match:[],ocean:[]}};
    save(); go('home'); return true;
  }
  function complete(id) {
    if(!state||view!=='task'||taskId!==id||!state.unlocked.includes(id))return;
    const p=progress();
    const done=p.answers[id].length===config.quizzes[id].length&&(id==='ray'||id==='match'&&p.pairs.length===3||id==='ocean'&&p.cleaned.length===3);
    if(!done)return;
    if(replay){replay=null;go('earned',id);toast('Keşfini tazeledin. Mevcut damgan ve puanın korundu.');return;}
    if(state.completed.includes(id))return;
    state.completed.push(id);save();go('earned',id);celebrate();
  }
  function startReplay(id) {
    if(!station(id)||!state?.completed.includes(id))return;
    replay={id,pairs:[],cleaned:[],rayCorrect:false,answers:{ray:[],match:[],ocean:[]}};
    go('task',id);
  }
  function answerQuestion(button) {
    if(view!=='task'||root.querySelector('.task-panel')?.dataset.phase!=='quiz')return;
    const q=config.quizzes[taskId][quizIndex], p=progress();
    if(!q||button.dataset.question!==q.id||p.answers[taskId].includes(q.id))return;
    if(button.dataset.quizAnswer!==q.correct){button.classList.add('wrong');feedback('Henüz değil. '+q.hint,true);return;}
    p.answers[taskId].push(q.id);if(taskId==='ray'&&q.id==='shape')p.rayCorrect=true;
    persistProgress();renderTask();announce('Doğru. '+q.explanation);
    root.querySelector('.task-action').focus({preventScroll:true});
  }

  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for(let i=0;i<22;i++) { const piece=document.createElement('i'); piece.className='confetti'; piece.style.setProperty('--x',`${Math.random()*400-200}px`); piece.style.setProperty('--r',`${Math.random()*180}deg`); piece.style.background=['#55ddd0','#8cbbff','#f6cb79'][i%3]; piece.style.animationDelay=`${Math.random()*.25}s`; document.body.append(piece); setTimeout(()=>piece.remove(),1800); }
  }
  function modalHeader(title) { return `<div class="modal-header"><h2 id="modal-title">${escape(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="Kapat">${icon('close')}</button></div>`; }
  function showModal(html) { closeModal(); lastFocused = document.activeElement; modal.innerHTML = html; modal.showModal(); }
  function closeModal() { stopScanner(); if(modal.open) modal.close(); scannerTarget=null; }
  function openScanner(target = null) {
    if(!state) { toast('Önce pasaportunu oluştur.'); return; }
    showModal(`${modalHeader('İstasyonunu aç')}<p class="modal-copy">${target ? `<strong>${escape(station(target).zone)}</strong> istasyonunun kodunu gir veya QR kodunu oyun içinden okut.` : 'İstasyonun kısa kodunu gir veya QR kodunu oyun içinden okut.'}</p><form class="code-form" id="code-form"><input class="text-input" id="station-code" placeholder="Örn. KESIF01" maxlength="64" aria-label="İstasyon kodu" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="primary" type="submit">Aç</button></form><div id="code-feedback" class="feedback error" hidden role="status"></div><div class="modal-divider">VEYA</div><button class="secondary full-width" data-action="camera" id="camera-button">${icon('camera')}Kamerayla QR okut</button><div class="camera-wrap" id="camera-wrap" hidden><video id="scanner-video" playsinline muted></video><p class="camera-tip">QR kodu çerçevenin ortasına getir. Kamera görüntüsü cihazından gönderilmez.</p><button class="quiet-button camera-stop full-width" data-action="stop-camera">Kamerayı kapat</button></div><details class="demo-codes"><summary>Prototip deneme kodları</summary>${config.stations.map(s=>`<div class="code-entry"><span>${escape(s.title)}</span><button type="button" data-fill-code="${s.code}">${s.code}</button></div>`).join('')}</details>`);
    scannerTarget = target;
  }
  function decodeCode(raw) {
    if(typeof raw !== 'string' || raw.length > 64) return null;
    const value = raw.trim().toUpperCase();
    return config.stations.find(s => s.code === value || `AQUA|1|${s.id.toUpperCase()}` === value) || null;
  }
  function codeError(message) { const el=document.getElementById('code-feedback'); if(el) { el.hidden=false; el.textContent=message; } else toast(message); }
  function submitCode(raw) {
    const s=decodeCode(raw);
    if(!state || !s) { codeError('Bu kodu tanımadık. İstasyonun kısa kodunu kontrol et.'); return false; }
    if(scannerTarget && scannerTarget !== s.id) { codeError(`Bu kod ${s.zone} için. Seçtiğin istasyonun kodunu kullan.`); return false; }
    if(!state.unlocked.includes(s.id)) { state.unlocked.push(s.id); save(); }
    go(state.completed.includes(s.id) ? 'earned' : 'task',s.id); announce(`${s.title} açıldı.`); return true;
  }
  function stopScanner() {
    scannerGeneration++; if(scannerFrame) cancelAnimationFrame(scannerFrame); scannerFrame=null;
    if(scannerStream) scannerStream.getTracks().forEach(track=>track.stop()); scannerStream=null;
    const video=document.getElementById('scanner-video'); if(video) video.srcObject=null;
    const wrap=document.getElementById('camera-wrap'); if(wrap) wrap.hidden=true;
    const button=document.getElementById('camera-button'); if(button) { button.disabled=false; button.innerHTML=icon('camera')+'Kamerayla QR okut'; }
  }
  async function startCamera() {
    if(!modal.open || !isSecureContext || !navigator.mediaDevices?.getUserMedia) { codeError('Kamera için güvenli bir web adresi gerekir. Kısa kodla devam edebilirsin.'); return; }
    stopScanner(); const generation=scannerGeneration;
    const button=document.getElementById('camera-button'); button.disabled=true; button.textContent='Kamera açılıyor…';
    try {
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}});
      if(generation !== scannerGeneration || !modal.open) { stream.getTracks().forEach(track=>track.stop()); return; }
      scannerStream=stream; const video=document.getElementById('scanner-video'); video.srcObject=stream;
      document.getElementById('camera-wrap').hidden=false; await video.play();
      let detector=null; try { if('BarcodeDetector' in window && (await BarcodeDetector.getSupportedFormats()).includes('qr_code')) detector=new BarcodeDetector({formats:['qr_code']}); } catch {}
      const canvas=document.createElement('canvas'), context=canvas.getContext('2d',{willReadFrequently:true}); let last=0;
      async function scan(time) {
        if(generation !== scannerGeneration || !modal.open || !scannerStream) return;
        if(time-last>140 && video.readyState>=2) {
          last=time; let result=null;
          try {
            if(detector) result=(await detector.detect(video))[0]?.rawValue;
            else { canvas.width=Math.min(640,video.videoWidth); canvas.height=Math.round(video.videoHeight*canvas.width/video.videoWidth); context.drawImage(video,0,0,canvas.width,canvas.height); const pixels=context.getImageData(0,0,canvas.width,canvas.height); result=window.jsQR(pixels.data,pixels.width,pixels.height,{inversionAttempts:'attemptBoth'})?.data; }
          } catch {}
          if(generation !== scannerGeneration) return;
          if(result && decodeCode(result) && submitCode(result)) return;
        }
        scannerFrame=requestAnimationFrame(scan);
      }
      scannerFrame=requestAnimationFrame(scan);
    } catch(error) { if(generation===scannerGeneration) { stopScanner(); codeError(error.name==='NotAllowedError' ? 'Kamera izni verilmedi. İstasyonun kısa koduyla devam edebilirsin.' : 'Kamera açılamadı. İstasyonun kısa koduyla devam edebilirsin.'); } }
    finally { if(modal.open && document.getElementById('camera-button')===button) { button.disabled=false; button.innerHTML=icon('camera')+'Kamerayla QR okut'; } }
  }
  function help() {
    showModal(`${modalHeader('Nasıl oynanır?')}<ol class="help-steps"><li><div><strong>Bir kaşif seç.</strong>Takma adınla dijital pasaportunu oluştur. Hazır mesajını girişte bekle.</div></li><li><div><strong>İstasyonunu aç.</strong>Oyundaki “Kod okut” düğmesini kullan. Kamera çalışmazsa kısa kodu yaz.</div></li><li><div><strong>Keşfet ve damganı al.</strong>Üç görevi tamamla, pasaportunu ve sertifikanı indir.</div></li></ol><div class="help-foot"><p>İlk açılışta internet gerekir. Hazırlık tamamlandıktan sonra görevler bu tarayıcıda çevrimdışı çalışır. Gizli sekmede kayıtlar kalıcı olmayabilir.</p><p style="margin-top:12px">Kamera görüntüsü, takma adın ve ilerlemen uygulama tarafından sunucuya gönderilmez. Paylaşımlı telefonlarda ailece tek pasaport kullanılabilir.</p><p style="margin-top:12px">${offlineStatus==='ready' ? 'Çevrimdışı hazırlık tamamlandı.' : 'Çevrimdışı hazırlık henüz doğrulanmadı.'}</p>${offlineStatus!=='ready' ? '<button class="text-link" data-action="retry-offline">Çevrimdışı hazırlığı tekrar dene</button>' : ''}<p style="margin-top:12px"><a href="lisanslar.html" target="_blank" rel="noopener">Görseller ve açık kaynak lisansları</a></p></div>${state ? '<div class="passport-actions"><button class="secondary" data-action="backup">Yedeğimi indir</button><button class="quiet-button" data-action="import">Yedeğimi aç</button></div>' : ''}`);
  }
  function downloadBlob(blob, filename) { const url=URL.createObjectURL(blob), link=document.createElement('a'); link.href=url; link.download=filename; document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),30000); }
  function backup() { if(state) downloadBlob(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`okyanus-pasaport-${state.id}.json`); }
  function importBackup() {
    const input=document.createElement('input'); input.type='file'; input.accept='.json,application/json';
    input.addEventListener('change',async()=>{
      const file=input.files[0]; if(!file) return;
      try { if(file.size>20000) throw Error(); importCandidate=validState(JSON.parse(await file.text())); if(!importCandidate) throw Error();
        showModal(`${modalHeader('Yedek pasaportunu aç')}<p class="modal-copy"><strong>${escape(importCandidate.name)}</strong> · ${importCandidate.completed.length} / 3 damga.<br>Bu yedeği açarsan mevcut pasaportun yerini alır. Önce mevcut pasaportunu yedekleyebilirsin.</p><div class="passport-actions"><button class="primary" data-action="confirm-import">Yedeği aç</button><button class="quiet-button" data-action="close-modal">Vazgeç</button></div>`);
      } catch { importCandidate=null; toast('Bu dosya geçerli bir Okyanus Kaşifi yedeği değil.'); }
    }); input.click();
  }
  function resetConfirm() { showModal(`${modalHeader('Yeni bir keşfe başla')}<p class="modal-copy">Mevcut pasaportun ve damgaların bu tarayıcıdan kaldırılır. Saklamak istersen önce yedeğini indir.</p><div class="passport-actions"><button class="secondary" data-action="backup">Yedeğimi indir</button><button class="primary" data-action="confirm-reset">Yeni pasaport oluştur</button><button class="quiet-button" data-action="close-modal">Vazgeç</button></div>`); }
  function certificatePng() {
    if(count()!==3) return;
    const canvas=document.createElement('canvas'); canvas.width=1600; canvas.height=1120; const ctx=canvas.getContext('2d');
    ctx.fillStyle='#e7f2ee'; ctx.fillRect(0,0,1600,1120); ctx.strokeStyle='#75a29e'; ctx.lineWidth=3; ctx.strokeRect(50,50,1500,1020); ctx.strokeRect(62,62,1476,996);
    ctx.textAlign='center'; ctx.fillStyle='#496c70'; ctx.font='24px Segoe UI, sans-serif'; ctx.fillText(config.aquarium.toLocaleUpperCase('tr-TR')+' · İLK KEŞİF',800,155);
    ctx.fillStyle='#8e7026'; ctx.font='90px Segoe UI, sans-serif'; ctx.fillText('✦',800,300);
    ctx.fillStyle='#12303d'; ctx.font='bold 70px Segoe UI, sans-serif'; ctx.fillText('Okyanus Kaşifi',800,415); ctx.fillText('Sertifikası',800,500);
    let size=60; ctx.font=`bold ${size}px Segoe UI, sans-serif`; while(ctx.measureText(state.name).width>1300 && size>24) { size--; ctx.font=`bold ${size}px Segoe UI, sans-serif`; } ctx.fillText(state.name,800,640);
    ctx.font='30px Segoe UI, sans-serif'; ctx.fillText('Gözlemledin, canlıları tanıdın ve okyanusu korumak için',800,740); ctx.fillText('bir adım attın. Üç keşif damgası da senin!',800,790);
    ctx.strokeStyle='#9ebcb3'; ctx.beginPath(); ctx.moveTo(550,885); ctx.lineTo(1050,885); ctx.stroke();
    ctx.fillStyle='#496c70'; ctx.font='25px Segoe UI, sans-serif'; ctx.fillText(dateLabel()+' · '+state.id,800,965);
    canvas.toBlob(blob=>{ if(blob) downloadBlob(blob,`okyanus-kasifi-${state.id}.png`); else toast('Görsel hazırlanamadı. Yazdır seçeneğiyle PDF kaydedebilirsin.'); },'image/png');
  }
  function updateConnection() {
    const existing=root.querySelector('.connection-strip'); if(existing) existing.outerHTML=strip();
    if(view==='welcome') { const button=document.getElementById('start-button'); button.disabled=offlineStatus==='loading'; button.innerHTML=(offlineStatus==='loading'?'Keşif hazırlanıyor…':'Maceraya başla')+icon('compass'); document.getElementById('prepare-note').textContent=offlineStatus==='ready'?'Hazır! İçeride internet kesilse de oynayabilirsin.':offlineStatus==='loading'?'İçeride de oynayabilmen için görevleri telefonuna hazırlıyoruz.':'Şu an internetle oynayabilirsin. Çevrimdışı hazırlık için yardım ekranını aç.'; }
  }
  async function prepareOffline() {
    offlineStatus='loading'; updateConnection();
    try {
      if(!isSecureContext || !('serviceWorker' in navigator)) throw Error('unsupported');
      if(navigator.onLine||!navigator.serviceWorker.controller)await navigator.serviceWorker.register('./sw.js');
      const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),16000))]);
      const ready=await new Promise((resolve,reject)=>{ const channel=new MessageChannel(); const timer=setTimeout(()=>reject(Error('cache timeout')),6000); channel.port1.onmessage=event=>{clearTimeout(timer); channel.port1.close(); resolve(event.data?.ready===true);}; (navigator.serviceWorker.controller||registration.active).postMessage({type:'CHECK_READY'},[channel.port2]); });
      if(!ready) throw Error('not cached'); offlineStatus='ready';
    } catch { offlineStatus='error'; }
    updateConnection();
  }
  document.addEventListener('submit',event=>{
    if(event.target.id==='start-form') { event.preventDefault(); if(offlineStatus!=='loading') startPassport(document.getElementById('explorer-name').value,avatarId); }
    if(event.target.id==='code-form') { event.preventDefault(); submitCode(document.getElementById('station-code').value); }
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('button'); if(!button || button.disabled) return;
    if(button.dataset.avatar) { avatarId=button.dataset.avatar; document.querySelectorAll('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===avatarId))); document.getElementById('explorer-name').placeholder=avatar(avatarId).alias; }
    if(button.dataset.station) { const id=button.dataset.station; state.unlocked.includes(id)?go(state.completed.includes(id)?'earned':'task',id):openScanner(id); }
    if(button.dataset.fillCode) { const input=document.getElementById('station-code'); input.value=button.dataset.fillCode; input.focus(); }
    if(button.dataset.quizAnswer)answerQuestion(button);
    if(button.dataset.replay)startReplay(button.dataset.replay);
    if(button.dataset.animal&&view==='task') { selectedAnimal=button.dataset.animal;document.querySelectorAll('[data-animal]').forEach(b=>{b.classList.toggle('selected',b.dataset.animal===selectedAnimal);b.setAttribute('aria-pressed',String(b.dataset.animal===selectedAnimal));});feedback('Şimdi bu canlıya ait özellik dosyasını seç.'); }
    if(button.dataset.clue&&view==='task') {
      if(!selectedAnimal)feedback('Önce soldan bir canlı seç.',true);
      else if(selectedAnimal!==button.dataset.clue)feedback('Bu dosya başka bir canlıya ait. Gövdesini ve özelliklerini yeniden karşılaştır.',true);
      else {const p=progress();if(!p.pairs.includes(selectedAnimal))p.pairs.push(selectedAnimal);persistProgress();renderTask();if(p.pairs.length<3)feedback('Doğru dosya! Sıradaki canlıyı seç.');else{feedback('Üç dosya da tamam. Şimdi ipuçlarından bir sonuç çıkar.');document.getElementById('question-title').focus({preventScroll:true});}}
    }
    if(button.dataset.object&&view==='task') {
      const id=button.dataset.object,p=progress();
      if(['bottle','bag','can'].includes(id)){if(!p.cleaned.includes(id))p.cleaned.push(id);persistProgress();renderTask();if(p.cleaned.length<3)feedback('Bir atık daha toplandı. Doğal parçalar yerinde kalsın.');else{feedback('Üç atığı da topladın. Şimdi görünmeyen soruna bakalım.');document.getElementById('question-title').focus({preventScroll:true});}}
      else feedback('Bu, denizin doğal bir parçası. Yerinde bırakalım.',true);
    }
    if(button.dataset.complete) complete(button.dataset.complete);
    const actions={'book-toggle':()=>toggleBook(),'book-direct':()=>toggleBook(true),'book-prev':()=>turnPassport(-1),'book-next':()=>turnPassport(1),'book-skip':skipBookAnimation,hint:()=>{const q=config.quizzes[taskId]?.[quizIndex];if(view==='task'&&q)feedback('İpucu: '+q.hint);},'quiz-next':()=>{const q=config.quizzes[taskId]?.[quizIndex];if(q&&progress().answers[taskId].includes(q.id)&&quizIndex<config.quizzes[taskId].length-1){quizIndex++;renderTask();document.getElementById('question-title').focus({preventScroll:true});}},home:()=>go('home'),passport:()=>go('passport'),certificate:()=>go('certificate'),scan:()=>openScanner(),camera:startCamera,'stop-camera':stopScanner,'close-modal':closeModal,backup,import:importBackup,reset:resetConfirm,'download-certificate':certificatePng,print:()=>window.print(),'retry-offline':()=>{closeModal();prepareOffline();},'confirm-import':()=>{if(importCandidate){state=importCandidate;importCandidate=null;save();go('passport');toast('Yedek pasaportun açıldı.');}},'confirm-reset':()=>{try{localStorage.removeItem(storageKey);}catch{}state=null;avatarId='turtle';passportOpened=false;passportPage=0;go('welcome');}};
    if(actions[button.dataset.action]) actions[button.dataset.action]();
  });
  document.getElementById('help-button').addEventListener('click',help);
  document.querySelector('.brand').addEventListener('click',event=>{event.preventDefault();go(state?'home':'welcome');});
  modal.addEventListener('cancel',stopScanner);
  modal.addEventListener('close',()=>{if(modal.open)return;stopScanner();scannerTarget=null;if(lastFocused?.isConnected)lastFocused.focus({preventScroll:true});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner();});
  window.addEventListener('pagehide',stopScanner);
  window.addEventListener('online',updateConnection); window.addEventListener('offline',updateConnection);
  function registerAgentTools() {
    if(!document.modelContext?.registerTool) return;
    const textResult=value=>({content:[{type:'text',text:JSON.stringify(value)}]});
    try {
      document.modelContext.registerTool({name:'read_exploration',description:'Read the aquarium passport and task progress on this device.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:async()=>textResult({started:!!state,completed:state?.completed||[],unlocked:state?.unlocked||[],offlineReady:offlineStatus==='ready',points:points(),rank:state?rank():null,tasks:config.stations.map(s=>({id:s.id,title:s.title}))})});
      document.modelContext.registerTool({name:'start_exploration',description:'Create a new aquarium passport using an avatar and optional nickname.',inputSchema:{type:'object',properties:{avatar:{type:'string',enum:['turtle','octopus','fish']},alias:{type:'string',maxLength:24}},required:['avatar'],additionalProperties:false},execute:async input=>{if(state) return textResult({error:'A passport already exists.'});if(!input||!config.avatars.some(a=>a.id===input.avatar)||typeof(input.alias??'')!=='string'||(input.alias||'').length>24) return textResult({error:'Invalid input.'}); if(offlineStatus==='loading')return textResult({error:'Wait for preparation.'});startPassport(input.alias,input.avatar);return textResult({started:true});}});
      document.modelContext.registerTool({name:'open_station_by_code',description:'Open an aquarium task using its station code. This does not complete tasks.',inputSchema:{type:'object',properties:{code:{type:'string',maxLength:64}},required:['code'],additionalProperties:false},execute:async input=>{if(!state||typeof input?.code!=='string'||!decodeCode(input.code))return textResult({error:'Create a passport and use a valid station code.'});scannerTarget=null;submitCode(input.code);return textResult({opened:taskId});}});
    } catch { /* Ordinary play remains available on browsers without WebMCP. */ }
  }
  state=readState(); view=state?'home':'welcome';
  render(); registerAgentTools(); prepareOffline();
})();
