/**
 * S.Kumar & Associates - website forms backend (Google Apps Script)
 * ------------------------------------------------------------------
 * Receives the Contact enquiry and the Job application from the website,
 * e-mails them to the office, saves them in a Google Sheet and stores the
 * uploaded resume in a Google Drive folder. Runs inside YOUR Google account;
 * no outside form service is involved.
 *
 * Setup: see backend/README.md
 */
var CFG = {
  NOTIFY_TO: 'info@ska-architects.com',     // where enquiries / applications are delivered
  SITE_NAME: 'S.Kumar & Associates',
  SHEET_CONTACT: 'Enquiries',
  SHEET_JOBS: 'Applications',
  DRIVE_FOLDER: 'SKA Website - Resumes',
  MAX_FILE_BYTES: 5 * 1024 * 1024,           // 5 MB resume limit
  ALLOWED_EXT: ['pdf', 'doc', 'docx', 'rtf', 'odt'],
  MIN_FILL_MS: 4000,                         // forms filled faster than this are treated as bots
  MAX_PER_HOUR: 5,                           // per e-mail address / phone, against abuse
  AUTOREPLY: true                            // send a "we received it" mail to the sender
};

function doGet() {
  return json_({ ok: true, service: 'SKA website forms' });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw) return json_({ ok: false, error: 'Empty request.' });
    if (raw.length > 9 * 1024 * 1024) return json_({ ok: false, error: 'The submission is too large.' });
    var d = JSON.parse(raw);

    if (d.website) return json_({ ok: true, ref: 'SKA-OK' });                         // honeypot field filled: bot
    if (Number(d.elapsed || 0) < CFG.MIN_FILL_MS) return json_({ ok: false, error: 'Please take a moment to fill in the form and try again.' });

    var type = d.type === 'job' ? 'job' : 'contact';
    var rec = type === 'job' ? readJob_(d) : readContact_(d);
    if (rec.error) return json_({ ok: false, error: rec.error });

    var key = 'rl:' + String(rec.email || rec.phone).toLowerCase();
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get(key) || 0);
    if (n >= CFG.MAX_PER_HOUR) return json_({ ok: false, error: 'Too many submissions. Please try again later.' });
    cache.put(key, String(n + 1), 3600);

    lock.waitLock(15000);
    rec.ref = makeRef_(type);
    var blob = null, fileUrl = '';
    if (type === 'job' && rec.file) {
      blob = Utilities.newBlob(Utilities.base64Decode(rec.file.data), rec.file.mime, rec.ref + '_' + safeName_(rec.name) + '.' + rec.file.ext);
      fileUrl = getFolder_().createFile(blob).getUrl();
    }
    logRow_(type, rec, fileUrl);
    notify_(type, rec, blob, fileUrl);
    if (CFG.AUTOREPLY && rec.email) autoreply_(type, rec);
    return json_({ ok: true, ref: rec.ref });
  } catch (err) {
    console.error(err && err.stack || err);
    return json_({ ok: false, error: 'Something went wrong on our side. Please e-mail ' + CFG.NOTIFY_TO + '.' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ---------- reading and validating ---------- */
function readContact_(d) {
  var r = { name: clean_(d.name, 120), phone: clean_(d.phone, 30), email: clean_(d.email, 160), message: clean_(d.message, 4000) };
  if (!r.name) return { error: 'Please enter your name.' };
  if (!r.message) return { error: 'Please tell us about your project.' };
  if (r.email && !isEmail_(r.email)) return { error: 'Please enter a valid e-mail address.' };
  if (!r.email && !r.phone) return { error: 'Please give an e-mail address or a phone number so that we can reply.' };
  return r;
}

function readJob_(d) {
  var r = {
    name: clean_(d.name, 120), email: clean_(d.email, 160), phone: clean_(d.phone, 30),
    position: clean_(d.position, 80), experience: clean_(d.experience, 40), city: clean_(d.city, 80),
    link: clean_(d.link, 300), note: clean_(d.note, 3000)
  };
  if (!r.name) return { error: 'Please enter your name.' };
  if (!isEmail_(r.email)) return { error: 'Please enter a valid e-mail address.' };
  if (String(r.phone).replace(/\D/g, '').length < 7) return { error: 'Please enter a valid phone number.' };
  if (!r.position) return { error: 'Please choose the position you are applying for.' };
  if (!d.consent) return { error: 'Please tick the consent box.' };
  if (r.link && !/^https?:\/\//i.test(r.link)) return { error: 'The portfolio link must start with http:// or https://' };
  var f = d.file;
  if (!f || !f.data || !f.name) return { error: 'Please attach your resume.' };
  var ext = String(f.name).split('.').pop().toLowerCase();
  if (CFG.ALLOWED_EXT.indexOf(ext) < 0) return { error: 'Resume must be a PDF, DOC, DOCX, RTF or ODT file.' };
  var size = Math.floor(String(f.data).length * 3 / 4);
  if (size > CFG.MAX_FILE_BYTES) return { error: 'The resume must be smaller than ' + Math.round(CFG.MAX_FILE_BYTES / 1048576) + ' MB.' };
  r.file = { data: String(f.data), ext: ext, mime: mime_(ext), size: size };
  return r;
}

/* ---------- storage and mail ---------- */
function logRow_(type, r, fileUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var isJob = type === 'job';
  var name = isJob ? CFG.SHEET_JOBS : CFG.SHEET_CONTACT;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(isJob
      ? ['Received', 'Ref', 'Name', 'E-mail', 'Phone', 'Position', 'Experience', 'City', 'Link', 'Note', 'Resume']
      : ['Received', 'Ref', 'Name', 'Phone', 'E-mail', 'Message']);
    sh.setFrozenRows(1);
  }
  sh.appendRow(isJob
    ? [new Date(), r.ref, r.name, r.email, r.phone, r.position, r.experience, r.city, r.link, r.note, fileUrl]
    : [new Date(), r.ref, r.name, r.phone, r.email, r.message]);
}

function notify_(type, r, blob, fileUrl) {
  var isJob = type === 'job';
  var rows = isJob
    ? [['Reference', r.ref], ['Name', r.name], ['E-mail', r.email], ['Phone', r.phone], ['Applying for', r.position], ['Experience', r.experience], ['City', r.city], ['Portfolio / LinkedIn', r.link], ['Note', r.note], ['Resume in Drive', fileUrl]]
    : [['Reference', r.ref], ['Name', r.name], ['Phone', r.phone], ['E-mail', r.email], ['Message', r.message]];
  var html = '<table cellpadding="8" style="border-collapse:collapse;font:14px Arial,sans-serif">' + rows.map(function (x) {
    return '<tr><td style="border:1px solid #ddd;background:#f6f3ec;font-weight:bold;vertical-align:top">' + esc_(x[0]) + '</td><td style="border:1px solid #ddd;white-space:pre-wrap">' + esc_(x[1] || '-') + '</td></tr>';
  }).join('') + '</table>';
  var opt = {
    to: CFG.NOTIFY_TO, name: CFG.SITE_NAME + ' website',
    subject: (isJob ? 'Job application: ' + r.position + ' - ' : 'Website enquiry - ') + r.name + ' [' + r.ref + ']',
    htmlBody: html
  };
  if (r.email) opt.replyTo = r.email;
  if (blob) opt.attachments = [blob];
  MailApp.sendEmail(opt);
}

function autoreply_(type, r) {
  var isJob = type === 'job';
  var body = 'Dear ' + r.name + ',\n\n' +
    (isJob ? 'Thank you for applying to ' + CFG.SITE_NAME + '. We have received your application and resume and will contact you if there is a suitable opening.'
           : 'Thank you for writing to ' + CFG.SITE_NAME + '. We have received your message and will get back to you shortly.') +
    '\n\nReference: ' + r.ref + '\n\n' + CFG.SITE_NAME + '\nB-33, 2nd Floor, Shivalik, New Delhi - 110017\n' + CFG.NOTIFY_TO;
  MailApp.sendEmail({ to: r.email, replyTo: CFG.NOTIFY_TO, name: CFG.SITE_NAME, subject: 'We received your ' + (isJob ? 'application' : 'message') + ' [' + r.ref + ']', body: body });
}

function getFolder_() {
  var it = DriveApp.getFoldersByName(CFG.DRIVE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(CFG.DRIVE_FOLDER);
}

/* Run once from the editor to create the folder, the sheets and to grant permissions. */
function setup() {
  getFolder_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  [[CFG.SHEET_CONTACT, ['Received', 'Ref', 'Name', 'Phone', 'E-mail', 'Message']],
   [CFG.SHEET_JOBS, ['Received', 'Ref', 'Name', 'E-mail', 'Phone', 'Position', 'Experience', 'City', 'Link', 'Note', 'Resume']]].forEach(function (s) {
    if (!ss.getSheetByName(s[0])) { var sh = ss.insertSheet(s[0]); sh.appendRow(s[1]); sh.setFrozenRows(1); }
  });
  MailApp.sendEmail(CFG.NOTIFY_TO, 'SKA website forms are ready', 'This is a test message from the website forms script. If you can read it, e-mail delivery works.');
}

/* ---------- helpers ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean_(s, max) { return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max); }
function isEmail_(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s); }
function esc_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function safeName_(s) { return String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'applicant'; }
function makeRef_(type) {
  return 'SKA-' + (type === 'job' ? 'J' : 'C') + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyMMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
}
function mime_(ext) {
  return { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', rtf: 'application/rtf', odt: 'application/vnd.oasis.opendocument.text' }[ext] || 'application/octet-stream';
}
