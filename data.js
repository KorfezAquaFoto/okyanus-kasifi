/* Akvaryum adı, istasyonlar, sorular, ipuçları ve keşif notları buradan düzenlenir. */
window.AQUA_CONFIG = {
  aquarium: 'Akvaryum',
  edition: 'İlk keşif',
  avatars: [
    { id: 'turtle', name: 'Kaplumbağa', file: 'assets/v3/turtle.webp', alias: 'Mavi Kaşif' },
    { id: 'octopus', name: 'Ahtapot', file: 'assets/v3/octopus.webp', alias: 'Derinlik Kaşifi' },
    { id: 'fish', name: 'Balık', file: 'assets/v3/fish.webp', alias: 'Mercan Kaşifi' }
  ],
  stations: [
    { id: 'ray', code: 'KESIF01', title: 'Vatozu keşfet', category: 'GÖZLEM', zone: 'Vatoz bölümü', description: 'Canlıya dikkatlice bak. Bir ayrıntı, keşif kaydını tamamlasın.', icon: 'eye', color: 'mint', stamp: 'Dikkatli Gözlemci', duration: '1 dakika' },
    { id: 'match', code: 'DALGA02', title: 'Canlıların izinde', category: 'EŞLEŞTİRME', zone: 'Canlılar bölümü', description: 'Üç canlı, üç ipucu. Doğru eşleştirmeleri bir araya getir.', icon: 'cards', color: 'blue', stamp: 'Canlı Uzmanı', duration: '2 dakika' },
    { id: 'ocean', code: 'MAVI03', title: 'Okyanusu koru', category: 'MİNİ OYUN', zone: 'Okyanus bölümü', description: 'Sanal denizdeki insan kaynaklı atıkları temizle.', icon: 'waves', color: 'gold', stamp: 'Okyanus Koruyucusu', duration: '1 dakika' }
  ]
};


/* Soru, ipucu ve açıklamalar burada düzenlenir. Kimlikleri kayıt uyumu için koruyun. */
Object.assign(window.AQUA_CONFIG, {
  edition: 'Mercan Rotası',
  mission: 'Okyanusun keşif günlüğünde üç sayfa eksik. Canlıları gözlemle, ipuçlarını çöz ve bu sayfaları tamamla.',
  quizzes: {
    ray: [
      { id:'shape', label:'GÖZLEMLE', question:'Vatozu hangi özelliklerle tanırsın?', prompt:'Telefonu bir an indir. Gövdesinin biçimine ve iki yanına bak.', choices:[['a','Yassı gövde ve iki yana uzanan geniş yüzgeçler.'],['b','Sert bir kabuk ve dört bacak.'],['c','Yuvarlak gövde ve sekiz kol.']], correct:'a', hint:'Gövdesi geniş ve yassı. Yanlarındaki geniş parçaları takip et.', explanation:'Gövde biçimi ve geniş yüzgeçler, vatozu tanımak için birlikte kullanabileceğin iki ipucudur.' },
      { id:'evidence', label:'İPUCUNU DEĞERLENDİR', question:'Bir canlıyı tanımak için en güçlü gözlem hangisi?', prompt:'Bir önceki gözleminden yola çık. Tek bir ayrıntı bazen yanıltabilir.', choices:[['a','Yalnızca diğer ziyaretçilerin ona verdiği isim.'],['b','Gövde biçimi, yüzgeçleri ve tabeladaki bilgiyi birlikte karşılaştırmak.'],['c','Yalnızca o an gördüğün renk.']], correct:'b', hint:'Birbirini destekleyen birkaç ipucu kullan.', explanation:'Birden çok özelliği karşılaştırmak, tek bir ayrıntıdan sonuç çıkarmaktan daha güçlü bir gözlem yöntemidir.' },
      { id:'respect', label:'KEŞİF KARARI', question:'Canlıyı rahatsız etmeden nasıl gözlemlersin?', prompt:'Vatoz sana yaklaşmadı. Daha iyi görmek istiyorsun.', choices:[['a','Dikkatini çekmek için cama vururum.'],['b','İzin olmadan suya dokunurum.'],['c','Sessizce bekler, görüş açımı değiştirir ve alanın kurallarına uyarım.']], correct:'c', hint:'Keşif yaparken canlının alanına saygı duy.', explanation:'İyi bir kaşif sabırla gözlemler. Canlının sana yaklaşması zorunlu değildir; alanın kurallarına uymak keşfin bir parçasıdır.' }
    ],
    match: [
      { id:'breath', label:'BİLGİDEN SONUCA', question:'Deniz kaplumbağası neden yüzeye çıkar?', prompt:'Suda yaşamak, suyun altında nefes alabilmekle aynı şey değildir.', choices:[['a','Kabuğunu her seferinde değiştirmek için.'],['b','Nefes almak için hava yüzeyine ulaşması gerekir.'],['c','Yalnızca ziyaretçileri görmek için.']], correct:'b', hint:'Deniz kaplumbağası hava solur.', explanation:'Deniz kaplumbağası su altında nefes alamaz. Hava solumak için yüzeye çıkması gerekir.' },
      { id:'camouflage', label:'UYUMU KEŞFET', question:'Rengini çevresine uyduran bir ahtapot ne kazanabilir?', prompt:'Kayalık zeminin yanında onu görmek zorlaştığını düşün.', choices:[['a','Kamuflaj sayesinde fark edilmesi zorlaşabilir.'],['b','Bir anda sert bir kabuk oluşur.'],['c','Canlı bir balığa dönüşür.']], correct:'a', hint:'Çevresiyle benzer görünmek fark edilmeyi etkiler.', explanation:'Kamuflaj, canlının çevresiyle benzer görünmesini sağlar. Renk ve desen değişimi bazı ahtapotların savunma yollarından biridir.' }
    ],
    ocean: [
      { id:'microplastic', label:'GÖRÜNMEYEN SORUN', question:'Denizdeki plastik küçük parçalara ayrılırsa ne olur?', prompt:'Büyük plastik parçalarını topladın. Peki küçülen parçalar?', choices:[['a','Her zaman tamamen ve zararsızca yok olur.'],['b','Deniz canlıları için besine dönüşür.'],['c','Küçük plastik parçaları çevrede kalabilir; sorun bitmiş olmaz.']], correct:'c', hint:'Küçülmek ile tamamen yok olmak aynı şey değildir.', explanation:'Büyük plastikler daha küçük parçalara ayrılabilir. Mikroplastikler, sorunun gözle zor görülür hale gelmiş parçalarıdır.' },
      { id:'prevention', label:'OKYANUS İÇİN SEÇ', question:'Atığın denize ulaşmasını azaltmak için hangi plan daha güçlü?', prompt:'Sahile gideceksin. Bir arkadaşın da sana katılacak.', choices:[['a','Tek kullanımlık şeyleri çoğaltıp sonradan birinin toplamasını beklemek.'],['b','Yeniden kullanılabilir ürünleri tercih etmek ve atıkları uygun toplama noktalarına bırakmak.'],['c','Poşetleri küçük parçalara bölüp rüzgâra bırakmak.']], correct:'b', hint:'Sorunu kaynağında azaltmayı ve doğru toplama noktasını düşün.', explanation:'Temizlemek değerlidir. Atık oluşumunu azaltmak ve doğru yere bırakmak, denize ulaşmadan önce harekete geçmeni sağlar.' }
    ]
  },
  fieldNotes: {
    ray:['Bir canlının gövdesi ve yüzgeçleri birlikte önemli ipuçları verir.','Birden fazla özelliği karşılaştırmak gözlemini güçlendirir.','Sessiz ve sabırlı gözlem, canlının alanına saygı gösterir.'],
    match:['Deniz kaplumbağaları hava solumak için yüzeye çıkar.','Kamuflaj, canlının çevresinde fark edilmesini zorlaştırabilir.','Canlıları yalnızca renklerine göre tanımlamak yanıltıcı olabilir.'],
    ocean:['Deniz canlıları ve doğal parçalar atık değildir.','Plastik küçülse bile çevrede kalabilir.','Atık azaltmak ve doğru toplama noktasını kullanmak denizi korumaya yardımcı olur.']
  }
});
AQUA_CONFIG.stations.forEach(s => { s.duration=s.id==='match'?'3 dakika':'2–3 dakika'; });
AQUA_CONFIG.stations[0].description='Vatozu gözlemle. Özelliklerini karşılaştır ve iyi bir kaşifin nasıl davranacağına karar ver.';
AQUA_CONFIG.stations[1].description='Canlı dosyalarını eşleştir. Nefes alma ve kamuflaj ipuçlarından sonuç çıkar.';
AQUA_CONFIG.stations[2].description='Atıkları topla. Mikroplastikleri düşün ve kirliliği önlemek için bir plan seç.';
