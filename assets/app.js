/* ARCHETYP GABINET — skrypt tylko tej strony. Bez zależności.
 *
 * Zgłoszenie na wizytę działa BEZ SERWERA: formularz waliduje, składa czytelną
 * wiadomość i przekazuje ją na telefon rejestracji (WhatsApp, SMS jako zapas).
 *
 * Świadomie NIE pytamy o nic medycznego poza ogólnym powodem wizyty. Strona
 * statyczna nie jest miejscem na dane o zdrowiu, a wiadomość i tak przechodzi
 * przez komunikator pacjenta.
 */
(function () {
  'use strict';

  var T = {}, D = {};
  try { T = JSON.parse(document.getElementById('i18n').textContent) || {}; } catch (e) {}
  try { D = JSON.parse(document.getElementById('dane').textContent) || {}; } catch (e) {}
  var t = function (k, d) { return T[k] || d || ''; };
  var spokojnie = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };

  var belka = $('.belka');
  if (belka) {
    var cien = function () { belka.classList.toggle('przewiniety', window.scrollY > 30); };
    cien(); window.addEventListener('scroll', cien, { passive: true });
  }

  var btnMenu = $('.ham'), menu = document.getElementById('mm');
  if (btnMenu && menu) {
    var etyk = btnMenu.getAttribute('aria-label');
    btnMenu.addEventListener('click', function () {
      var otwarte = menu.classList.toggle('otwarte');
      btnMenu.setAttribute('aria-expanded', String(otwarte));
      btnMenu.setAttribute('aria-label', otwarte ? t('closeMenu', etyk) : etyk);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('otwarte'); btnMenu.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('otwarte')) btnMenu.click();
    });
  }

  /* Tylko jedno pytanie FAQ otwarte naraz — lista sześciu rozwiniętych
     odpowiedzi przestaje być listą i staje się ścianą tekstu. */
  var pytania = [].slice.call(document.querySelectorAll('.pytanie'));
  pytania.forEach(function (p) {
    p.addEventListener('toggle', function () {
      if (!p.open) return;
      pytania.forEach(function (inne) { if (inne !== p) inne.open = false; });
    });
  });

  if ('IntersectionObserver' in window && !spokojnie) {
    var cele = document.querySelectorAll('.cennik tbody tr, .lekarz, .krok, .pytanie, .opinia, .atuty li');
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        w.target.style.transition = 'opacity .55s ease, transform .55s cubic-bezier(.2,.7,.3,1)';
        w.target.style.opacity = 1; w.target.style.transform = 'none';
        io.unobserve(w.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .05 });
    [].forEach.call(cele, function (el, i) {
      el.style.opacity = 0; el.style.transform = 'translateY(12px)';
      el.style.transitionDelay = (i % 5) * 55 + 'ms';
      io.observe(el);
    });
  }

  [].forEach.call(document.querySelectorAll('a.lang'), function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('jezyk', (a.getAttribute('hreflang') || a.textContent).trim().toLowerCase().slice(0, 2)); } catch (e) {}
    });
  });

  /* ============================================================= wizyta */
  var form = document.getElementById('wizyta-form');
  if (!form || !D.wiz) return;

  var polePowod = document.getElementById('pole-powod');
  var polePacjent = document.getElementById('pole-pacjent');
  var polePora = document.getElementById('pole-pora');
  var poleData = document.getElementById('pole-data');
  var komunikat = document.getElementById('wizyta-komunikat');
  var jezyk = document.documentElement.lang || 'pl';

  function wypelnij(select, lista, zPusta) {
    select.innerHTML = '';
    if (zPusta) {
      var p = document.createElement('option');
      p.value = ''; p.textContent = (D.slowa && D.slowa.choose) || '—';
      select.appendChild(p);
    }
    (lista || []).forEach(function (v) {
      var o = document.createElement('option');
      o.value = v; o.textContent = v;
      select.appendChild(o);
    });
  }
  wypelnij(polePowod, D.wiz.powody, true);
  wypelnij(polePacjent, D.wiz.pacjent, false);
  wypelnij(polePora, D.pory, false);

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
      '-' + String(d.getDate()).padStart(2, '0');
  }
  var dzis = new Date();
  poleData.min = iso(dzis);
  poleData.max = iso(new Date(dzis.getTime() + (D.wiz.dniNaprzod || 21) * 864e5));

  function pokaz(txt, zle) {
    komunikat.textContent = txt;
    komunikat.className = 'wizyta-komunikat ' + (zle ? 'zle' : 'ok');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var powod = polePowod.value;
    var imie = document.getElementById('pole-imie').value.trim();
    var tel = document.getElementById('pole-tel').value.trim();

    if (!powod) { pokaz(t('gFill'), true); return; }
    if (!imie || tel.replace(/\D/g, '').length < 9) { pokaz(t('gPhone'), true); return; }

    var kiedy = '';
    if (poleData.value) {
      kiedy = new Intl.DateTimeFormat(jezyk, { weekday: 'long', day: 'numeric', month: 'long' })
        .format(new Date(poleData.value + 'T00:00:00'));
    }

    var tresc = [
      D.firma, '---',
      powod,
      polePacjent.value,
      [kiedy, polePora.value].filter(Boolean).join(', '),
      '---', imie, tel
    ].filter(Boolean).join('\n');

    var numer = String(D.tel || '').replace(/\D/g, '');
    if (!numer) { pokaz(t('gNoChannel'), true); return; }

    pokaz(t('gOpening'), false);
    var okno = window.open('https://wa.me/' + numer + '?text=' + encodeURIComponent(tresc), '_blank', 'noopener');
    if (!okno) location.href = 'sms:+' + numer + '?body=' + encodeURIComponent(tresc);
    setTimeout(function () { pokaz(t('gDone'), false); }, 900);
  });

  /* Kartka "otwarte teraz" nad zdjeciem. Liczona z prawdziwych godzin —
     jesli dzis i najblizsze siedem dni nie ma ZNANYCH godzin, kartka zostaje
     ukryta. Lepiej nie powiedziec nic niz odeslac kogos pod zamkniete drzwi. */
  (function(){
    var k=document.getElementById('kartka-stan');
    if(!k||!D.godziny||!D.stan) return;
    var g=D.godziny, teraz=new Date(), dzis=(teraz.getDay()+6)%7;
    var minuty=teraz.getHours()*60+teraz.getMinutes();
    var hhmm=function(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
    var tytul=k.querySelector('[data-stan-tytul]'), opis=k.querySelector('[data-stan-opis]');

    var dzisiaj=g[dzis];
    if(dzisiaj && minuty>=dzisiaj[0] && minuty<dzisiaj[1]){
      tytul.textContent=D.stan.terazOtwarte;
      opis.textContent=D.stan.doGodz.replace('{g}',hhmm(dzisiaj[1]));
      k.hidden=false; k.classList.add('kartka--otwarte');
      return;
    }
    // Szukamy najblizszego dnia z godzinami — dzis (jesli jeszcze przed otwarciem)
    // albo ktorys z kolejnych szesciu.
    for(var i=0;i<7;i++){
      var d=(dzis+i)%7, z=g[d];
      if(!z) continue;
      if(i===0 && minuty>=z[0]) continue;
      tytul.textContent=D.stan.zamkniete;
      opis.textContent=D.stan.otwieramy
        .replace('{d}', i===0 ? '' : (D.dniTyg&&D.dniTyg[d]||''))
        .replace('{g}', hhmm(z[0])).replace(/s+/g,' ').trim();
      k.hidden=false;
      return;
    }
  })();

  /* Dzisiejsze wiersze w obu kolumnach godzin. Liczy przegladarka. */
  (function(){
    var i=(new Date().getDay()+6)%7;
    [].forEach.call(document.querySelectorAll('.gw[data-dzien="'+i+'"]'),function(el){
      el.classList.add('dzis');
    });
  })();
})();
