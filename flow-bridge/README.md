# Vidbucks Flow Bridge

Kendi Google Flow hesabın ve kredilerinle, konudan videoya otomatik hat. **Token harcamaz**: Claude yalnızca konuyu, karakterleri ve promptları (brief.yaml) yazar; üretimi eklenti, indirmeyi ve montajı Python + ffmpeg yapar.

```
Claude (sadece brief.yaml yazar)  ->  Python köprüsü  ->  Chrome eklentisi  ->  Flow (senin hesabın)
                                                                   |
 out/<ad>/<ad>.mp4  <-  ffmpeg (birleştir, ses -16 LUFS)  <-  720p klipler iner
```
Üçüncü kişi sunucusu yok; her şey `127.0.0.1` üzerinde. API anahtarı gerekmez.

## Kurulum (her ekip arkadaşı için bir kez, ~5 dk)
Gerekenler: Chrome, Python 3.9+, ffmpeg.
1. Klasörü aç (zip'i çıkar), terminalde: `python3 setup.py`
2. Chrome > `chrome://extensions` > **Geliştirici modu** aç > **Paketlenmemiş öğe yükle** > `extension` klasörü.
3. Chrome Ayarlar > İndirilenler: "Her dosyanın nereye kaydedileceğini sor" **kapalı** olsun. Chrome "flow.google.com birden çok dosya indirmek istiyor" derse **İzin ver**. (İzin yoksa Flow'un 720p indirmesi sessizce hiç inmez.)
4. https://flow.google.com'da bir proje aç, sonra: `python3 doctor.py` -> hepsi OK olmalı.
5. Chrome üstünde "Vidbucks ... hata ayıklamaya başladı" şeridi çıkabilir: eklenti gerçek tıklama/yazma için `debugger` iznini kullanıyor, normal.

## Arayüz (önerilen)
`python3 ui.py` -> tarayıcıda http://127.0.0.1:8770 açılır. Brief'i formla düzenle (karakterler, sahneler, **sahne başına süre**, model/çözünürlük/en-boy), süre ve kredi tahminini canlı gör, bütçe gir, **Başlat**'a bas; günlüğü izle, bitince videoyu oynat. "Claude ile taslak" düğmesi konudan brief yazar (token kullanır, isteğe bağlı). Eklenti bağlı mı, Flow sekmesi açık mı üstteki rozette görünür.

## Süre, model ve kredi
Sahne süresi seçilebilir. Omni 1.1 Flash: 4, 6, 8 veya 10 sn (360p ya da 720p). Veo 3.1 Lite/Fast/Quality: sadece 8 sn. Kredi süreyle artar (Flow ajanının verdiği liste; yalnızca 360p/10 sn = 7 gerçekte doğrulandı): 360p 4 sn=4, 6 sn=5, 8 sn=6, 10 sn=7; 720p 7/10/12/15; Veo Lite 10, Fast 20, Quality 100. Gerçek fiyatı Flow onay sorusunda gösterir; bütçeyi aşarsa betik onaylamaz. Süre isteği ajana prompt'ta yazılır; ajan uymazsa günlükte uyarı çıkar.

## Günlük kullanım (komut satırı)
1. Claude Code'da `flow-brief` becerisiyle konuyu ver (becerisi: `skills/flow-brief/SKILL.md`, `.claude/skills/` altına kopyala). Claude `briefs/<ad>.yaml` yazar. (Elle de yazabilirsin: `BRIEF.md`.)
2. Tahmini kredi: `python3 make_video.py briefs/<ad>.yaml --plan`
3. Flow proje sekmen açıkken: `python3 make_video.py briefs/<ad>.yaml --max-credits 50 --yes`
4. Sonuç: `out/<ad>/<ad>.mp4` (tek final klip, sahneler arası geçişli) ve ayrı sahne klipleri `out/<ad>/clips/s01.mp4` .... Tek sahneyi yenile: `--only 3`.
Kredi sınırını aşan onayı betik vermez. Hesabına/kredilerine sen karar verirsin.

## Bilinenler ve sınırlar
- Arayüz metinleri `extension/selectors.js` içinde. **Türkçe arayüz doğrulandı, İngilizce tahmin** (ilk kullanımda `doctor.py` dili yazar). Flow arayüzü değişirse bu dosya güncellenir.
- Konum görselleri üretilmez; mekân `lock:` metniyle tarif edilir (karakter tutarlılığı Flow Characters ile sağlanır).
- Kalite kontrolü (`qa.mode: claude`) varsayılan **kapalı**; açarsan `claude` girişi ve token kullanır. Kapalıyken klipleri kontak sayfasından gözle kontrol et.
- Ses/dudak eşleşmesi otomatik doğrulanmaz.
- Flow'un otomasyon kullanım şartları ekibin sorumluluğundadır; kendi hesabında, normal hızda kullan.
- Bir seferde tek Flow sekmesi sürülür; çalışırken o sekmede elle işlem yapma.
- **Flow sekmesi görünür kalsın.** Chrome arka plandaki/örtülü sekmelerde zamanlayıcıları yavaşlatır; gönderme ve beklemeler dakikalar sürer, hatta zaman aşımına düşer. Flow'u kendi penceresinde aç, çalışma boyunca küçültme ve başka pencerenin altında bırakma.


## Geçişler
Brief'te `transition` (varsayılan `fade`, 0,4 sn) tüm sahne aralarına uygulanır; sahne bazında `transition_in: dissolve` / `transition_duration: 0.6` ile o sahneye giren geçiş değiştirilir (`none` = sert kesme). Konuşmalı sahnelerde kısa `fade`/`dissolve`, mekân değişiminde `fadeblack` veya `wipeleft` iyi gider.

## Windows notları
- Python: `py -3 setup.py`, `py -3 ui.py` (veya `python`). ffmpeg: `winget install ffmpeg` (PATH'e girmeli, `py -3 doctor.py` kontrol eder).
- Chrome'un indirme klasörü farklıysa `config.yaml` içine `downloads_dir: C:\\Users\\<ad>\\Downloads` yaz.
- Tüm dosyalar UTF-8 okunur/yazılır; Türkçe karakterli briefler Windows'ta da çalışır. Not: Windows'ta test edilmedi, ilk denemede `doctor.py` çıktısını bana gönder.

## Toplu (agent) üretim ve otomatik toparlama
- Varsayılan artık `batch: 1`: **üret, indir, sonrakine geç** (VEO3 eklentisi gibi, sahneler arası 8-20 sn rastgele bekleme). Hızlı mod için `batch: 3` veya `5` yaz: sahneler gruplar halinde **tek agent mesajıyla** gönderilir, Flow hepsini paralel üretir; tek kredi onayı istenir (bütçe sınırı içinde otomatik verilir). Biten klip hemen indirilir. `batch: 1` eski "sahne sahne" yolunu açar.
- Karakterler görselleri beklenmeden oluşturulur ve adlandırılır.
- Adım hata verirse program sayfayı toparlar (menüleri kapatır, projeyi yeniden yükler, gerekirse Flow sekmesini açar) ve adımı yeniden dener; eklenti takılırsa kendini yeniden başlatır.

## Her video için yeni proje + hızlı indirme
- `project: new` (varsayılan): her yeni video için Flow ana sayfasında "Yeni proje" açılır, adresi brief'e yazılır; yeniden çalıştırınca aynı proje kullanılır. Mevcut bir projede devam etmek için brief'e o projenin adresini yaz.
- Biten klipler **paralel** indirilir (Flow'un 720p dosyası adındaki etiketle sahneye eşlenir); eşleşmeyen tek tek indirilir.

## Takılma ve hata durumları (v2.1)
- **Önce istemleri kontrol et (ücretsiz):** `python3 make_video.py briefs/benim.yaml --lint`. Şiddet/marka/gerçek kişi adı, ekrana yazı isteyen kelimeler, çok uzun sahne ve karakter adı olmayan sahneleri kredi harcamadan gösterir. Çalıştırınca da aynı kontrol otomatik yapılır.
- **Flow bir sahneyi üretemezse** ("Tekrar dene" düğmesi veya "Yardım Merkezi" cevabı) eklenti artık saatlerce beklemez: o grubu bırakır, başarısız sahneleri 2. turda 3'erli, 3. turda tek tek yeniden dener. Bir sahne 3 turda da olmazsa, hangi sahne olduğunu söyleyip durur; biten klipler `clips/` içinde kalır, tekrar çalıştırınca yalnızca eksikler üretilir.
- Takılırsan arayüzdeki günlüğü (veya `doctor.py` çıktısını) gönder.

## "Olağan dışı etkinlik" uyarısı (v2.2)
Flow bazen hesabı "olağan dışı etkinlik" diye işaretler veya ajanı genel bir hata verir ("Yardım Merkezi", "Tekrar dene"). Eklenti artık **aynı isteği tekrar tekrar göndermez**: uyarıyı görünce hemen durur ve 45 dakika boyunca yeni çalıştırmayı reddeder (`.flow_block` dosyası; zorlamak için dosyayı sil veya `--force`).
- Durunca Flow'u tarayıcıda aç, **elle bir üretim** dene; çalışıyorsa 45 dk bekleyip tekrar çalıştır.
- Hızı insan temposuna yaklaştırdık: varsayılan tek tek (üret, indir, sonrakine geç), gruplu modda mesajlar arası ve indirmeler arası rastgele bekleme, yazma/gönderme öncesi kısa duraklama, hata sonrası 40-90 sn soğuma.
- Aynı gün çok sayıda video/proje açmamak, uyarı ihtimalini azaltır. Uyarı geliyorsa `batch: 1` (varsayılan, tek tek) kullan ve gün içinde az sayıda video üret; `batch: 3-5` yalnızca hız içindir.
- Eklentiyi güncelledikten sonra `chrome://extensions` içinde **yenile** (↻) düğmesine bas.

## Standart mod (ajansız) - alternatif
Ajan modu "olağan dışı etkinlik" uyarısı verirse brief'e `mode: standard` yaz: eklenti ajanı kapatır, Flow'un normal üretim kutusunu kullanır (Video, 360p, 8 sn, x1), her istemi tek tek ve 8-20 sn rastgele beklemeyle gönderir. Kredi fiyatı Flow'un ayar çipinde okunur (örn. 8 sn 360p = 6 kredi). Bu mod yeni; ilk denemede 3 sahneyle (`briefs/std-test.yaml`) deneyin.

## v2.4: ajansız tek tek üretim (varsayılan) ve toplu indirme
- `batch: 1` (varsayılan) ve model `omni-flash` ise eklenti **ajanı kapatır** ve Flow'un normal üretim kutusunu kullanır: ayarları (Video, 360p, süre, 16:9) kendisi seçer, modeli Omni 1.1 Flash yapar, Flow'un gösterdiği krediyi okur (beklenen fiyattan farklıysa **göndermeden durur**, yeni projelerde Flow Veo x2 = 20 kredi ile başlayabiliyor), istemi gönderir, üretimi bekler.
- İndirmeler **5'erli gruplar halinde** yapılır (`download_every: 5`): klipler art arda üretilir, grup bitince indirmeler aralıklı başlar, 720p upscale Flow'da paralel yürür. Klip başına yaklaşık %35 zaman kazandırır. `download_every: 1` her klipten hemen sonra indirir.
- Bir hata olursa üretilmiş ama indirilmemiş klipler durmadan önce indirilir (yeniden çalıştırmada kredi boşa gitmesin).
- Birden çok sahneyi tek mesajla göndermek (`batch: 3-5`) veya Veo modelleri hâlâ ajan modunu kullanır.

## v2.5: gerçek girdi, kalıcı hata ayıklama oturumu, kurtarma
- **Flow "olağandışı etkinlik" diyordu (standart modda da, ~6-7 klipten sonra):** Eklentinin içerik betiği klip başına ~15 *sahte* (JavaScript ile üretilmiş) tıklama yapıyordu; Flow'un hata mesajı "sayfayı değiştiren eklentiler" diyor. Artık **bütün tıklama, tuş, üzerine gelme, yazma ve temizleme gerçek (güvenilir) girdi** olarak servis işçisinden gidiyor (referans VEO3 eklentisi gibi). Hata ayıklama oturumu her tıklamada açılıp kapanmıyor, açık kalıp 45 sn boşta kalınca kapanıyor; tıklamalar arasında kısa, rastgele insan boşlukları var.
- **Kurtarma:** Engel veya hata anında Flow'da biten ama indirilmemiş klipler `out/<ad>/pending.json` dosyasına yazılır. Bir sonraki çalıştırma (engelden 45 dk sonra) **önce onları indirir**, kredi tekrar harcanmaz. Engel sürerken indirme denenmez (Flow'u daha da zorlamamak için).
- Sayfada "unusual activity" yazısı veya "Failed" kutucuğu görülürse eklenti durur.
- Ortak kuralı değişmedi: uyarı gelince 45 dk bekle, bir üretimi elle dene, sonra yeniden çalıştır.
