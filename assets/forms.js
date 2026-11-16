/* S.Kumar & Associates - website forms (contact enquiry + job application).
   Posts to our own Google Apps Script (assets/config.js). No outside form service. */
(function () {
  'use strict';
  var CFG = window.SKA_FORMS || {};
  var MAX_BYTES = 5 * 1024 * 1024, OK_EXT = ['pdf', 'doc', 'docx', 'rtf', 'odt'];

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function setup(form) {
    var type = form.getAttribute('data-ska-form');
    var btn = form.querySelector('button[type=submit]');
    var note = document.createElement('div');
    note.className = 'f-note'; note.setAttribute('role', 'status'); note.setAttribute('aria-live', 'polite');
    form.appendChild(note);
    var opened = Date.now();
    var say = function (kind, html) { note.className = 'f-note show ' + kind; note.innerHTML = html; if (kind !== 'wait') { try { note.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) {} } };
    var val = function (n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; };

    function mailtoFallback(d) {
      var lines = type === 'job'
        ? ['Name: ' + d.name, 'E-mail: ' + d.email, 'Phone: ' + d.phone, 'Position: ' + d.position, 'Experience: ' + d.experience, 'City: ' + d.city, 'Portfolio / LinkedIn: ' + d.link, '', d.note, '', '(Please attach your resume to this e-mail.)']
        : [d.message, '', 'Name: ' + d.name, 'Phone: ' + d.phone, 'Email: ' + d.email];
      var subject = type === 'job' ? 'Job application: ' + d.position + ' - ' + d.name : 'Website enquiry from ' + d.name;
      return 'mailto:' + (CFG.mailto || 'info@ska-architects.com') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
    }

    function readFile(file) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
        r.onerror = function () { reject(new Error('read')); };
        r.readAsDataURL(file);
      });
    }

    var fileInput = form.elements['resume'];
    var fileName = form.querySelector('.file-name');
    if (fileInput && fileName) {
      fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        fileName.textContent = f ? f.name + ' (' + (f.size / 1048576).toFixed(1) + ' MB)' : '';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (val('website')) return;                                   /* honeypot */
      var d = type === 'job'
        ? { name: val('name'), email: val('email'), phone: val('phone'), position: val('position'), experience: val('experience'), city: val('city'), link: val('link'), note: val('note'), consent: !!(form.elements['consent'] && form.elements['consent'].checked) }
        : { name: val('name'), phone: val('phone'), email: val('email'), message: val('msg') };

      /* checks that give a friendly message before anything is sent */
      var problem = '';
      if (type === 'job') {
        var f = fileInput && fileInput.files && fileInput.files[0];
        if (!f) problem = 'Please attach your resume.';
        else if (OK_EXT.indexOf(f.name.split('.').pop().toLowerCase()) < 0) problem = 'The resume must be a PDF, DOC, DOCX, RTF or ODT file.';
        else if (f.size > MAX_BYTES) problem = 'The resume must be smaller than 5 MB.';
        else if (!d.consent) problem = 'Please tick the consent box.';
        else if (d.link && !/^https?:\/\//i.test(d.link)) problem = 'The portfolio link must start with http:// or https://';
      } else if (!d.email && !d.phone) problem = 'Please give an e-mail address or a phone number so that we can reply.';
      if (problem) { say('err', esc(problem)); return; }

      if (!CFG.endpoint) {                                          /* not connected yet: use the visitor's mail app */
        say('err', 'Online sending is not switched on yet. <a href="' + mailtoFallback(d) + '">Click here to send this by e-mail</a>' + (type === 'job' ? ' and attach your resume.' : '.'));
        return;
      }

      var label = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = 'Sending&hellip;';
      say('wait', type === 'job' ? 'Uploading your application&hellip; please keep this page open.' : 'Sending your message&hellip;');

      var prep = type === 'job'
        ? readFile(fileInput.files[0]).then(function (b64) { d.file = { name: fileInput.files[0].name, data: b64 }; })
        : Promise.resolve();
      prep.then(function () {
        d.type = type; d.elapsed = Date.now() - opened; d.website = '';
        return fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) });
      }).then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok) {
            form.reset(); if (fileName) fileName.textContent = ''; opened = Date.now();
            say('ok', type === 'job'
              ? '<b>Thank you, ' + esc(d.name) + '!</b> Your application has been received. Reference <b>' + esc(j.ref || '') + '</b>. We will contact you if there is a suitable opening.'
              : '<b>Thank you, ' + esc(d.name) + '!</b> Your message has been sent to S.Kumar &amp; Associates. Reference <b>' + esc(j.ref || '') + '</b>. We will get back to you shortly.');
          } else {
            say('err', esc((j && j.error) || 'Sorry, we could not send this just now.') + ' You can also <a href="' + mailtoFallback(d) + '">e-mail us directly</a>.');
          }
        })
        .catch(function () {
          say('err', 'Sorry, we could not send this just now. Please <a href="' + mailtoFallback(d) + '">click here to e-mail us</a> or write to ' + esc(CFG.mailto || 'info@ska-architects.com') + '.');
        })
        .then(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  }

  Array.prototype.forEach.call(document.querySelectorAll('form[data-ska-form]'), setup);
})();
