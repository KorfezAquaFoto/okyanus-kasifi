(() => {
  'use strict';
  const input=document.getElementById('game-url'), warning=document.getElementById('url-warning'), grid=document.getElementById('qr-grid');
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let gameUrl=new URL('./',location.href).href;
  function qrSvg(data) { const qr=qrcode(0,'M'); qr.addData(data,'Byte'); qr.make(); return qr.createSvgTag({cellSize:5,margin:20,scalable:true}); }
  function render() {
    const cards=[{id:'giris',title:'Okyanus Kaşifi',zone:'GİRİŞ · KEŞFE BAŞLA',payload:gameUrl,code:'',text:'Telefonunun kamerasıyla okut. Pasaportunu oluştur ve hazır mesajını bekle.'},...AQUA_CONFIG.stations.map(s=>({id:s.id,title:s.title,zone:s.zone,payload:`AQUA|1|${s.id}`,code:s.code,text:'Oyunda “Kod okut” düğmesini kullan. Kamera çalışmazsa kısa kodu gir.'}))];
    grid.innerHTML=cards.map(c=>`<article class="qr-card"><p class="eyebrow">${escape(c.zone)}</p><h2>${escape(c.title)}</h2>${qrSvg(c.payload)}${c.code?`<strong>${c.code}</strong>`:''}<p>${c.text}</p>${c.id==='giris'?`<small>${escape(gameUrl)}</small>`:''}<button class="secondary" data-id="${c.id}">QR görselini indir</button></article>`).join('');
    grid.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{const card=cards.find(c=>c.id===button.dataset.id);const blob=new Blob([qrSvg(card.payload)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`okyanus-qr-${card.id}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}));
    const url=new URL(gameUrl); warning.textContent=['localhost','127.0.0.1'].includes(url.hostname)?'Bu adres yalnızca bu bilgisayarda açılır. Telefonla denemek için oyunu herkese açık bir HTTPS adresine yükleyip buraya yaz.':'Giriş adresinin ziyaretçilere giriş yapmadan açıldığını bir gizli sekmede kontrol et. Özel önizleme adresleri ziyaretçi kullanımı için uygun değildir.';
  }
  input.value=gameUrl;render();
  document.getElementById('url-form').addEventListener('submit',event=>{event.preventDefault();try{const url=new URL(input.value.trim());if(url.username||url.password||url.href.length>1500||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw Error();gameUrl=url.href;render();}catch{warning.textContent='Geçerli, herkese açık bir HTTPS adresi gir.';}});
  document.getElementById('print-cards').addEventListener('click',()=>window.print());
})();
