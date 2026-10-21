// Kategori: virgülle ayrılmış kelimeler. Yeni kelime eklemek için listeye yazman yeterli.
const LISTS = {
  'Hayvan': `kedi, köpek, aslan, kaplan, fil, zürafa, zebra, maymun, ayı, kurt, tilki, tavşan, kaplumbağa,
    yılan, timsah, kartal, baykuş, penguen, yunus, köpekbalığı, ahtapot, deve, at, eşek, inek, koyun, keçi,
    tavuk, horoz, ördek, kaz, papağan, arı, kelebek, karınca, örümcek, sivrisinek, kanguru, sincap, kirpi,
    salyangoz, hamster, flamingo, balina, yengeç, ateşböceği, denizanası, leylek, karga, güvercin`,

  'Yiyecek & İçecek': `pizza, hamburger, lahmacun, döner, kebap, mantı, baklava, künefe, simit, poğaça, börek,
    menemen, sucuk, pastırma, dondurma, çikolata, pamuk şeker, patlamış mısır, makarna, pilav, mercimek çorbası,
    karpuz, muz, çilek, kiraz, limon, portakal, elma, nar, incir, ayran, çay, kahve, limonata, şalgam, boza,
    salep, turşu, zeytin, peynir, bal, reçel, yumurta, ekmek, kokoreç, midye, sarma, lokum, aşure, gözleme,
    tost, patates kızartması, çiğ köfte, iskender, suşi, kumpir, pişmaniye, cips`,

  'Meslek': `doktor, öğretmen, polis, itfaiyeci, aşçı, garson, pilot, hostes, berber, dişçi, avukat, hâkim,
    mühendis, mimar, ressam, şarkıcı, oyuncu, yönetmen, gazeteci, fotoğrafçı, postacı, çiftçi, balıkçı, kasap,
    fırıncı, terzi, marangoz, elektrikçi, tesisatçı, astronot, dedektif, sihirbaz, palyaço, cankurtaran,
    taksici, kaptan, hemşire, veteriner, eczacı, programcı, youtuber, simitçi, bekçi, hakem, dj`,

  'Ev & Eşya': `buzdolabı, çamaşır makinesi, bulaşık makinesi, televizyon, kumanda, koltuk, yastık, yorgan,
    battaniye, ayna, çalar saat, şemsiye, makas, cetvel, silgi, kalem, defter, anahtar, kilit, kapı zili,
    ampul, priz, şarj aleti, süpürge, ütü, tencere, tava, çaydanlık, kaşık, çatal, bıçak, tabak, bardak,
    termos, sandalye, masa, dolap, perde, halı, duş, havlu, diş fırçası, tarak, saç kurutma makinesi, mum,
    vazo, çöp kutusu, valiz, cüzdan, gözlük, terlik, nazar boncuğu, cezve, semaver, mandal, merdiven`,

  'Yer': `okul, hastane, havalimanı, otogar, plaj, orman, çöl, kutup, sinema, tiyatro, müze, kütüphane, market,
    pazar, lunapark, hayvanat bahçesi, stadyum, spor salonu, cami, kale, saray, köprü, tünel, metro, asansör,
    mutfak, çatı, bodrum, mağara, ada, şelale, volkan, uzay, hapishane, karakol, düğün salonu, otel, kamp,
    pastane, eczane, banka, hamam, çarşı, iskele, deniz feneri, tuvalet, otopark, benzinlik`,

  'Şehir & Ülke & Yapı': `istanbul, ankara, izmir, kapadokya, antalya, trabzon, paris, londra, roma, venedik,
    new york, mısır, japonya, çin, hindistan, brezilya, italya, almanya, rusya, amerika, avustralya, meksika,
    ispanya, yunanistan, hollanda, eyfel kulesi, galata kulesi, kız kulesi, ayasofya, piramitler, çin seddi,
    özgürlük heykeli, pamukkale, efes, boğaz köprüsü`,

  'Spor & Oyun': `futbol, basketbol, voleybol, tenis, yüzme, boks, güreş, yağlı güreş, kayak, sörf, maraton,
    satranç, tavla, okey, iskambil, saklambaç, körebe, yakar top, bilardo, bowling, golf, dart, karate, yoga,
    penaltı, ofsayt, kaleci, gol, olimpiyat, madalya, kupa, dama, sudoku, bulmaca, yapboz, tombala,
    sobe, ip atlama, uçurtma, langırt`,

  'Taşıt': `araba, otobüs, minibüs, dolmuş, taksi, tren, uçak, helikopter, gemi, vapur, sandal, denizaltı,
    roket, motosiklet, bisiklet, kaykay, paten, ambulans, itfaiye aracı, traktör, tır, teleferik,
    sıcak hava balonu, scooter, yat, tramvay, kamyon, gondol`,

  'Vücut': `göz, kulak, burun, ağız, diş, dil, saç, kaş, bıyık, sakal, parmak, tırnak, diz, dirsek, omuz, kalp,
    beyin, mide, göbek, topuk, bilek, boyun, sırt, kirpik, gamze`,

  'Doğa & Hava': `güneş, yağmur, kar, dolu, şimşek, gökkuşağı, rüzgâr, fırtına, sis, deprem, tsunami, kasırga,
    bulut, yıldız, gezegen, kuyruklu yıldız, deniz, göl, nehir, dağ, ağaç, çiçek, gül, lale, papatya, kaktüs,
    mantar, yaprak, kum, buzul, ay tutulması, kardan adam, çığ, gün batımı, palmiye`,

  'Teknoloji': `telefon, bilgisayar, tablet, kulaklık, hoparlör, mikrofon, kamera, drone, robot, yapay zekâ,
    internet, wi-fi, şifre, emoji, selfie, instagram, whatsapp, youtube, oyun konsolu, klavye, fare, yazıcı,
    bluetooth, akıllı saat, uygulama, bilgisayar virüsü, bitcoin, podcast, influencer, tiktok, powerbank,
    şarjı bitmek, otomatik düzeltme`,

  'Kavram & Duygu': `aşk, kıskançlık, utanç, korku, mutluluk, özlem, sabır, hayal, rüya, kabus, sır, yalan, şans,
    kader, intikam, barış, özgürlük, zaman, para, hediye, sürpriz, doğum günü, düğün, nişan, bayram, yılbaşı,
    tatil, sınav, karne, mezuniyet, maaş, kira, trafik, kuyruk, diyet, uykusuzluk, nazar, dedikodu, pazartesi,
    hafta sonu, gece yarısı, deja vu, ilk görüşte aşk, ev arkadaşı, kayınvalide, görücü usulü`,

  'Eylem': `uyumak, koşmak, zıplamak, dans etmek, şarkı söylemek, ağlamak, gülmek, hapşırmak, esnemek, horlamak,
    ıslık çalmak, alkışlamak, sarılmak, öpmek, tartışmak, pazarlık yapmak, fotoğraf çekmek, yemek pişirmek,
    bulaşık yıkamak, ütü yapmak, alışveriş yapmak, saklanmak, beklemek, düşmek, kaymak, uçmak, dalmak,
    tırmanmak, fısıldamak, bağırmak, göz kırpmak, hıçkırmak, kopya çekmek, selfie çekmek, sakız çiğnemek`,

  'Kültür & Karakter': `nasreddin hoca, keloğlan, karagöz, hacivat, temel, dede korkut, mevlana, tarkan,
    barış manço, kemal sunal, harry potter, süpermen, batman, örümcek adam, mickey mouse, şirinler, pokemon,
    süper mario, sherlock holmes, titanik, yüzüklerin efendisi, star wars, noel baba, denizkızı, vampir,
    zombi, cadı, hayalet, korsan, ninja, kovboy, prenses, ejderha, uzaylı, dinozor, mumya, mona lisa, oscar,
    eurovision, masterchef, survivor, pinokyo, kırmızı başlıklı kız, aladdin, külkedisi, rapunzel`,

  'Müzik & Sanat': `gitar, piyano, keman, davul, bağlama, ney, darbuka, zurna, konser, opera, bale, heykel, tablo,
    rap, rock, halay, zeybek, horon, göbek dansı, karaoke, mehter, orkestra, akordeon, flüt`,

  'Giyim & Aksesuar': `ceket, mont, kazak, gömlek, kravat, papyon, pijama, mayo, şapka, bere, atkı, eldiven, çorap,
    bot, topuklu ayakkabı, kemer, yüzük, kolye, küpe, sırt çantası, takım elbise, gelinlik, etek, şalvar,
    güneş gözlüğü, kol saati, peruk, takma kirpik`,
};

const words = new Map();
for (const [category, list] of Object.entries(LISTS)) {
  for (const w of list.split(',').map(s => s.trim()).filter(Boolean)) {
    words.set(w, { text: w.toLocaleUpperCase('tr-TR'), category });
  }
}

module.exports = [...words.values()];
