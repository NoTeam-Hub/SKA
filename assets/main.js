
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

  /* year */
  var yr = $('#yr'); if (yr) yr.textContent = new Date().getFullYear();

  /* reveal on scroll */
  var rv = $$('.rv');
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, {threshold:.12, rootMargin:'0px 0px -6% 0px'});
    rv.forEach(function(el){ io.observe(el); });
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
  function closeLb(){ lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); }
  cards.forEach(function(c){ c.addEventListener('click', function(){ openLb(c); }); });
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
      if (im.complete){ im.naturalWidth > 0 ? settle() : bad(); }
      else { im.addEventListener('load', function(){ im.naturalWidth > 0 ? settle() : bad(); }); im.addEventListener('error', bad); }
    });
    setTimeout(function(){
      $$('.logo-item img', t).forEach(function(im){ if (!im.complete || !im.naturalWidth){ var p = im.parentNode; if (p.parentNode) p.parentNode.removeChild(p); } });
      build();
    }, 9000);
  });

  /* enquiry form -> opens the visitor's mail app */
  var f = $('#enq');
  if (f) f.addEventListener('submit', function(e){
    e.preventDefault();
    var g = function(n){ return f.elements[n].value; };
    var body = g('msg') + '\n\nName: ' + g('name') + '\nPhone: ' + g('phone') + '\nEmail: ' + g('email');
    window.location.href = 'mailto:info@ska-architects.com?subject=' +
      encodeURIComponent('Project enquiry from ' + g('name')) + '&body=' + encodeURIComponent(body);
  });
})();
