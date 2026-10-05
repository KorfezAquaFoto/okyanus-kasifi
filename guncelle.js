(() => {
  const button=document.getElementById('update-game'),status=document.getElementById('update-status');
  button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Yeni rota hazırlanıyor. Pasaportunu silmiyoruz…';
    try{
      if(!('serviceWorker' in navigator)||!isSecureContext){location.replace(new URL('./',location.href));return;}
      const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      await registration.update();
      await Promise.race([new Promise((resolve,reject)=>{
        const finish=()=>{const worker=registration.waiting||registration.installing;if(registration.waiting)return resolve(registration.waiting);if(!worker)return resolve(null);if(worker.state==='installed')return resolve(registration.waiting||worker);if(worker.state==='redundant')return reject(Error('install'));worker.addEventListener('statechange',()=>{if(worker.state==='installed')resolve(registration.waiting||worker);if(worker.state==='redundant')reject(Error('install'));});};
        finish();
      }).then(async worker=>{
        if(!worker)return;
        await new Promise(resolve=>{if(worker.state==='activated')return resolve();navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();});worker.postMessage({type:'ACTIVATE_UPDATE'});});
      }),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),22000))]);
      location.replace(new URL('./',location.href));
    }catch{button.disabled=false;status.textContent='Güncelleme tamamlanamadı. İnternetini kontrol edip yeniden dene. Pasaportun duruyor.';}
  });
})();
