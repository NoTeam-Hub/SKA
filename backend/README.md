# Website forms - setup (about 10 minutes, one time)

The Contact form (home page) and the Job application form (Join Us page) send their data to a small
script that runs **inside your own Google account**. It e-mails every submission to the office, stores it
in a Google Sheet, and saves each resume in a Google Drive folder. No outside form service is used.

## 1. Create the Sheet and paste the script
1. Sign in to the Google account that should own the data (for example the office Gmail).
2. Create a new Google Sheet and name it **SKA Website Submissions**.
3. In the Sheet choose **Extensions > Apps Script**.
4. Delete the sample code, paste the whole of `backend/Code.gs`, press **Save**.
5. At the top of the script check `NOTIFY_TO` (default `info@ska-architects.com`).

## 2. Authorise it
1. In the function list choose **setup** and press **Run**.
2. Google asks for permission (Gmail send, Drive, Sheets). Choose your account, **Advanced > Go to project (unsafe)**, **Allow**.
   (The warning appears because the script is your own and has not been through Google review.)
3. A test mail arrives at `NOTIFY_TO`, and the sheets *Enquiries* and *Applications* and the Drive folder *SKA Website - Resumes* are created.

## 3. Publish it as a web app
1. **Deploy > New deployment > type: Web app**.
2. *Execute as*: **Me**. *Who has access*: **Anyone**. Press **Deploy**.
3. Copy the **Web app URL** (ends in `/exec`).

## 4. Connect the website
1. Open `assets/config.js` in the GitHub repo, click the pencil icon, and paste the URL between the quotes after `endpoint:`.
2. Commit. After the site redeploys, send a test enquiry and a test application.

## Good to know
- Changing `Code.gs` later: **Deploy > Manage deployments > edit > New version > Deploy** (the URL stays the same).
- Limits: a normal Gmail account can send about 100 mails a day, Google Workspace about 1,500; far more than needed.
- Resumes are limited to 5 MB (PDF, DOC, DOCX, RTF, ODT). The limit is set by `MAX_FILE_BYTES`.
- Spam protection: a hidden field, a minimum time to fill the form, and a limit of 5 submissions per hour per e-mail address.
- Until `endpoint` is filled, the forms fall back to opening the visitor's e-mail app.
