
(function(){
  var d = document;
  function $(s, c){ return (c || d).querySelector(s); }
  function $$(s, c){ return Array.prototype.slice.call((c || d).querySelectorAll(s)); }

  /* nav */
  var nav = $('.nav'), burger = $('.burger');
  function onScroll(){ nav.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  if (burger) burger.addEventListener('click', function(){
    d.body.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', d.body.classList.contains('nav-open') ? 'true' : 'false');
  });
  $$('.menu a').forEach(function(a){ a.addEventListener('click', function(){ d.body.classList.remove('nav-open'); }); });

  /* reliable in-page jumps on phones: lazy images and reveal effects shift the layout while a
     smooth scroll is running, so jump straight to the target and correct once the page settles */
  function jumpTo(id, push){
    var el = id && id !== 'top' ? d.getElementById(id) : null;
    if (!el && id !== '' && id !== 'top') return false;
    var go = function(){
      var off = (nav ? nav.offsetHeight : 70) + 8;
      var y = el ? el.getBoundingClientRect().top + window.pageYOffset - off : 0;
      var de = d.documentElement, prev = de.style.scrollBehavior;
      de.style.scrollBehavior = 'auto'; window.scrollTo(0, Math.max(0, y)); de.style.scrollBehavior = prev;
    };
    go(); setTimeout(go, 350); setTimeout(go, 1100);
    if (push && history.pushState) { try { history.pushState(null, '', id ? '#' + id : location.pathname + location.search); } catch (e) {} }
    return true;
  }
  $$('a[href^="#"]').forEach(function(a){
    a.addEventListener('click', function(e){
      var h = a.getAttribute('href') || '';
      if (h === '#' || h === '#top') { e.preventDefault(); d.body.classList.remove('nav-open'); jumpTo('', true); return; }
      var id = decodeURIComponent(h.slice(1));
      if (d.getElementById(id) && jumpTo(id, true)) e.preventDefault();
    });
  });
  if (location.hash.length > 1 && location.hash !== '#top'){
    var hid = decodeURIComponent(location.hash.slice(1));
    window.addEventListener('load', function(){ jumpTo(hid, false); });
  }

  /* phones: leave a page cleanly (menu closed instantly, never restored open by Back) */
  window.addEventListener('pageshow', function(){
    d.body.classList.remove('nav-open', 'nav-leaving');
    if (burger) burger.setAttribute('aria-expanded', 'false');
  });
  $$('.menu a').forEach(function(a){
    a.addEventListener('click', function(){
      var h = a.getAttribute('href') || '';
      if (h.charAt(0) === '#') return;
      d.body.classList.add('nav-leaving'); d.body.classList.remove('nav-open');
    });
  });

  /* map: keep page scrolling on touch screens until the visitor taps the map */
  var lock = $('.map-lock');
  if (lock){
    lock.addEventListener('click', function(){ lock.parentNode.classList.add('unlocked'); });
    document.addEventListener('touchstart', function(e){
      var m = lock.parentNode;
      if (m.classList.contains('unlocked') && !m.contains(e.target)) m.classList.remove('unlocked');
    }, {passive:true});
  }

  /* year */
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* reveal on scroll */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(el){
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * .98 && r.bottom > 0){ el.classList.add('rv-now', 'in'); } else { io.observe(el); }
    });
  } else { rv.forEach(function(el){ el.classList.add('in'); }); }

  /* count-up */
  var counts = $$('.count');
  function fmt(n){ return n >= 1000 ? n.toLocaleString('en-IN') : String(n); }
  function run(el){
    var to = +el.getAttribute('data-to'), t0 = null, dur = 1700;
    function step(ts){
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ('IntersectionObserver' in window && counts.length){
    var co = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ run(e.target); co.unobserve(e.target); } });
    }, {threshold:.6});
    counts.forEach(function(c){ co.observe(c); });
  }

  /* project filter */
  var chips = $$('.chip'), cards = $$('.pcard');
  chips.forEach(function(ch){
    ch.addEventListener('click', function(){
      var f = ch.getAttribute('data-f');
      chips.forEach(function(c){ c.classList.toggle('on', c === ch); });
      cards.forEach(function(c){
        c.classList.toggle('hide', f !== 'all' && c.getAttribute('data-cat') !== f);
      });
    });
  });

  /* lightbox markup is added on pages that do not carry it (category pages) */
  if (!$('#lb') && $('.cat-grid')){
    var lbEl = d.createElement('div');
    lbEl.className = 'lb'; lbEl.id = 'lb'; lbEl.setAttribute('aria-hidden', 'true'); lbEl.setAttribute('role', 'dialog'); lbEl.setAttribute('aria-modal', 'true');
    lbEl.innerHTML = "<button aria-label='Close' class='lb-x' type='button'>&#215;</button><button aria-label='Previous' class='lb-p' type='button'>&#8592;</button><button aria-label='Next' class='lb-n' type='button'>&#8594;</button><img alt='' id='lbimg' src='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='/><div class='lb-cap' id='lbcap'></div>";
    d.body.appendChild(lbEl);
  }
  /* lightbox */
  var lb = $('#lb'), lbimg = $('#lbimg'), lbcap = $('#lbcap'), cur = 0, list = [];
  function show(i){
    cur = (i + list.length) % list.length;
    var c = list[cur];
    lbimg.src = c.full; lbimg.alt = c.title;
    lbcap.textContent = c.title + '  /  ' + c.cat + (c.n ? '  /  ' + c.n : '');
  }
  function openLb(card){
    var g = card.getAttribute('data-gallery'), t = card.getAttribute('data-title'), k = card.getAttribute('data-cat'), start = 0;
    if (g){
      var u = g.split('|');
      list = u.map(function(x, i){ return {full:x, title:t, cat:k, n:(i + 1) + ' / ' + u.length}; });
    } else {
      var vis = cards.filter(function(c){ return !c.classList.contains('hide'); });
      list = vis.map(function(c){ return {full:c.getAttribute('data-full'), title:c.getAttribute('data-title'), cat:c.getAttribute('data-cat')}; });
      start = vis.indexOf(card);
    }
    lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    show(start);
  }
  function closeLb(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); d.body.classList.remove('lb-lock'); }
  cards.forEach(function(c){ c.addEventListener('click', function(){ openLb(c); }); });
  /* category pages: every photo opens in the lightbox with swipe / arrows */
  var catLinks = $$('.cat-grid a');
  if (catLinks.length){
    var kind = ((location.pathname.split('/').pop() || '').replace('.html', '') || 'projects');
    catLinks.forEach(function(a, i){
      a.setAttribute('aria-label', 'View larger: ' + ((a.querySelector('img') || {}).alt || 'project photo'));
      a.removeAttribute('target');
      a.addEventListener('click', function(e){
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        list = catLinks.map(function(l, j){
          var im = l.querySelector('img');
          return {full:l.href, title:(im && im.alt) || 'Project', cat:kind, n:(j + 1) + ' / ' + catLinks.length};
        });
        lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); d.body.classList.add('lb-lock');
        show(i);
      });
    });
  }
  var tx = null;
  if (lb){
    lb.addEventListener('touchstart', function(e){ tx = e.changedTouches[0].clientX; }, {passive:true});
    lb.addEventListener('touchend', function(e){ if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); }, {passive:true});

    $('.lb-x').addEventListener('click', closeLb);
    $('.lb-p').addEventListener('click', function(){ show(cur - 1); });
    $('.lb-n').addEventListener('click', function(){ show(cur + 1); });
    lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });
    d.addEventListener('keydown', function(e){
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  /* crop empty margins around a logo so every logo fills its tile equally */
  function trimLogo(im, done){
    var finished = false, fin = function(){ if (!finished){ finished = true; done(); } };
    setTimeout(fin, 3500);
    try {
      var c = new Image(); c.crossOrigin = 'anonymous';
      c.onload = function(){
        try {
          var k = Math.min(1, 360 / Math.max(c.naturalWidth, c.naturalHeight));
          var w = Math.max(1, Math.round(c.naturalWidth * k)), h = Math.max(1, Math.round(c.naturalHeight * k));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var cx = cv.getContext('2d'); cx.drawImage(c, 0, 0, w, h);
          var d = cx.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (var y = 0; y < h; y++) for (var x = 0; x < w; x++){
            var i = (y * w + x) * 4;
            if (d[i+3] > 24 && (d[i] < 238 || d[i+1] < 238 || d[i+2] < 238)){
              if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
            }
          }
          if (x1 > x0 && y1 > y0 && (x1 - x0) * (y1 - y0) > w * h * 0.02){
            var p = 2; x0 = Math.max(0, x0 - p); y0 = Math.max(0, y0 - p); x1 = Math.min(w - 1, x1 + p); y1 = Math.min(h - 1, y1 + p);
            var o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
            var ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height);
            ox.drawImage(cv, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
            im.src = o.toDataURL('image/png');
          }
        } catch (e) {}
        fin();
      };
      c.onerror = fin;
      c.src = im.currentSrc || im.src;
    } catch (e) { fin(); }
  }

  /* client logos: drop any that fail to load, then scroll right to left */
  $$('.logo-marquee').forEach(function(box, idx){
    var t = $('.logo-track', box); if (!t) return;
    var items = $$('.logo-item', t), pending = items.length, built = false;
    function build(){
      if (built) return; built = true;
      if (!$$('.logo-item', t).length){ box.style.display = 'none'; return; }
      var base = t.innerHTML, w = t.scrollWidth, vw = box.clientWidth || window.innerWidth;
      var reps = Math.max(1, Math.ceil(vw / Math.max(w, 1)));
      var set = ''; for (var i = 0; i < reps; i++) set += base;
      t.innerHTML = set + set;
      box.style.setProperty('--dur', Math.max(20, Math.round(t.scrollWidth / 2 / 55)) + 's');
      box.classList.add('ready');
    }
    function settle(){ if (--pending <= 0) build(); }
    if (!items.length){ box.style.display = 'none'; return; }
    items.forEach(function(it){
      var im = it.querySelector('img');
      function bad(){ if (it.parentNode) it.parentNode.removeChild(it); settle(); }
      var ok = function(){ trimLogo(im, settle); };
      if (im.complete){ im.naturalWidth > 0 ? ok() : bad(); }
      else { im.addEventListener('load', function(){ im.naturalWidth > 0 ? ok() : bad(); }, {once:true}); im.addEventListener('error', bad); }
    });
    setTimeout(function(){
      $$('.logo-item img', t).forEach(function(im){ if (!im.complete || !im.naturalWidth){ var p = im.parentNode; if (p.parentNode) p.parentNode.removeChild(p); } });
      build();
    }, 9000);
  });

})();
