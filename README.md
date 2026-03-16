# 🎯 LoL Dodge Antrenmanı (League of Dodging)

League of Legends oyuncuları için özel olarak geliştirilmiş, refleksleri ve yetenek atışlarından kaçınma (dodging) becerilerini geliştirmeyi hedefleyen web tabanlı bir hayatta kalma oyunudur. Tamamen **Vanilla JavaScript** ve **HTML5 Canvas API** kullanılarak, hiçbir harici oyun motoru (Unity, Godot vb.) olmadan sıfırdan kodlanmıştır.

## 🚀 Oyunun Amacı
Sihirdar Vadisi'nde Ezreal'ı kontrol ederek üzerinize gelen ölümcül Brand Q (Sear) yeteneklerinden ve kırmızı minyonlardan kaçmaya çalışın. Hayatta kaldığınız her saniye puan kazanırsınız. Sadece kaçmakla kalmayın; kendi yeteneklerinizi kullanarak düşmanları alt edin ve kombo çarpanınızı artırarak en yüksek skora ulaşın!

## ✨ Özellikler
* **Akıcı Kontroller:** LoL'ün orijinal sağ tıkla yürüme mekaniğine sadık kalınmıştır.
* **Kombo Sistemi:** Minyonları Q yeteneği ile vurdukça kombo çarpanı artar (x2, x3...).
* **Dinamik Zorluk:** Oyunda kaldıkça her saniye hayatta kalma puanı eklenir.
* **Özel Çizim Motoru (Canvas):** Görsel kalabalık yaratmadan, kod tabanlı Canvas çizimleriyle (gradyanlar, dış parlamalar) yüksek performanslı görseller.
* **Yetenek Bekleme Süreleri (Cooldown):** Ekranda anlık olarak takip edilebilen dinamik yetenek arayüzü (HUD).

## 🎮 Kontroller

| Tuş / Fare | Aksiyon | Açıklama |
| :--- | :--- | :--- |
| **Sağ Tık (Basılı Tut)** | Hareket Et | Karakter farenin imlecini takip eder. |
| **S** | Dur | Karakteri olduğu yerde anında durdurur. |
| **Q** | Gizemli Atış (Mystic Shot) | Farenin olduğu yöne doğru mavi bir enerji ışını fırlatır. Minyonları yok eder. (Bekleme Süresi: 0.5s) |
| **E** | Sihir Geçişi (Arcane Shift) | Karakteri anında farenin olduğu konuma (belirli bir menzil içinde) ışınlar. Zor anlarda hayat kurtarır! (Bekleme Süresi: 3.0s) |

## 🛠️ Kurulum ve Çalıştırma
Oyunu oynamak için herhangi bir sunucu kurmanıza veya program indirmenize gerek yoktur.

1. Projeyi bilgisayarınıza klonlayın veya `.zip` olarak indirin.
2. Klasörün içindeki `index.html` dosyasına çift tıklayarak modern bir web tarayıcısında (Chrome, Edge, Safari vb.) açın.
3. Oynamaya başlayın!

## 🔮 Gelecek Planları (Roadmap)
- [ ] Firebase entegrasyonu ile Global Liderlik Tablosu (High Score) eklenmesi.
- [ ] Farklı düşman tipleri (Örn: Jinx roketi, Blitzcrank kancası).
- [ ] Farklı harita temaları.
- [ ] Mobil cihazlar için dokunmatik ekran desteği.

## ⚠️ Yasal Uyarı
Bu proje tamamen eğitim ve kişisel gelişim amacıyla, açık kaynaklı olarak geliştirilmiş bir "Fan Made" (Hayran yapımı) projedir. League of Legends, Ezreal, Brand ve Sihirdar Vadisi gibi tüm isim hakları, görsel ve fikir mülkiyetleri **Riot Games**'e aittir. Bu proje üzerinden herhangi bir ticari gelir elde etme amacı güdülmemektedir. Riot Games'in "Legal Jibber Jabber" politikasına saygı duyulmaktadır.
