# KUSOPPA website (React + Django)

Public site, member accounts with M-Pesa membership payments, and an admin dashboard.

## Run locally
**Backend**
```
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate             # also upgrades an existing database
python manage.py createsuperuser      # use an email address as the username
python manage.py runserver            # API at http://localhost:8000/api/
python manage.py test                 # optional: runs the backend tests
```

**Frontend**
```
cd frontend
cp .env.example .env
npm install && npm run dev            # http://localhost:5173
```

## Google sign-in setup
Create a Google OAuth **Web application** client ID in Google Cloud Console. Add the exact frontend origin(s) used in development and deployment to its Authorized JavaScript origins (for example `http://localhost:5173` and your Netlify site URL). Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` before building the frontend, and set the same value as `GOOGLE_OAUTH_CLIENT_ID` in `backend/.env` or the backend environment. The backend loads its optional `.env` file for local development; deployed environments can set the variable directly. The client ID is public configuration; do not put a client secret in the frontend. Rebuild/redeploy the frontend after changing its environment variable. Google sign-in is available on both the login and account-creation pages.

## Install KUSOPPA on a phone
The site is a Progressive Web App. Deploy it over HTTPS, then use **Install app** in the header on supported browsers. On iPhone or iPad, open the site in Safari, tap Share, choose **Add to Home Screen**, and tap **Add**. The installed app opens in standalone mode; its app shell can load offline, while live account and membership data still require an internet connection.

## First-time setup (as the admin)
1. Log in at `/login` with the superuser account. You are taken to the dashboard at `/admin`.
2. **Settings:** add the Pochi la Biashara number and name, check the fees (150 new, 50 renewal), add the WhatsApp number, and add the current **semester** (members cannot pay until one exists).
3. **Users and roles:** add the treasurer (payments and settings) and secretary (members and content).
4. **Links:** add the WhatsApp group invite (members only) and any public links.
5. **Members:** import the club's existing Excel sheet (see below). Imported members link to their account when registration number or a unique phone number matches.

## Excel import and export (Members page)
- **Import from Excel** (admin and treasurer): upload an `.xlsx` or `.csv`. The site finds the heading row, guesses the columns (you can correct any guess), and shows a **preview** with counts and row-by-row problems. Nothing is saved until you confirm. Matching is by member ID, registration number, then a unique phone number. Missing registration numbers and phones are allowed; those historical records are kept and are never linked to an account by name alone. Re-uploading the same source sheet does not duplicate rows without identifiers. Phone numbers that lost their leading zero are fixed. The first payment becomes the joining payment and later semesters become renewals. Every import can be **undone** as a whole from the wizard.
- Options in the preview: choose the semester for rows that do not name one, replace existing details with the sheet's values (off by default: only blanks are filled), and count every row as paid (for older records with no M-Pesa code).
- **Download Excel** (all officials): Members sheet for everyone; Payments and Summary sheets for admin and treasurer. Edit the file and import it back to update many records at once.
- If the real sheet is laid out differently (for example one column per semester), the column matching in `backend/core/excel.py` is where to adapt it.

## How membership works
Register (name, reg no., phone, email, leadership interest) → pay by M-Pesa to the Pochi number shown → submit the M-Pesa code → treasurer approves in **Payments** → member is active for the semester. Renewal is Ksh 50 each new semester. When the treasurer changes, update the number in **Settings**; every admin is emailed about the change and it is recorded in the audit log.

Roles: **admin** (everything), **treasurer** (payments, settings, audit), **secretary** (members, events, briefs, board, links, messages).

## Deploy
- **Netlify (frontend):** base directory `frontend`, build `npm run build`, publish `dist`. Set `VITE_API_URL=https://<your-pythonanywhere-domain>/api`.
- **PythonAnywhere (backend):** upload `backend`, create a virtualenv, `pip install -r requirements.txt`, point the WSGI file at `config.wsgi`, run `migrate` and `collectstatic`, and map `/static/` to `staticfiles` and `/media/` to `media` in the Web tab. Environment variables: `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=0`, `DJANGO_ALLOWED_HOSTS`, `CORS_ORIGINS=https://<your-netlify-site>`, `FRONTEND_URL=https://<your-netlify-site>`, and SMTP settings (`EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`, `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`) so approval and password-reset emails are sent.

## Before launch
1. The logos in `public/brand/` are transparent PNGs from the supplied files. Replace them with SVGs when available.
2. Confirm the figures in `src/config.js` (`STATS`) with the executive.
3. Enter real events, briefs and board members (with photos) in the dashboard.
4. Confirm Derrick Odhiambo's official title.
5. Registration collects personal data (Kenya Data Protection Act). Have the club confirm the consent wording on the register page.
6. This is a client-side React app. For stronger search visibility, add pre-rendering later.

## Troubleshooting a blank page
- Open the site from the dev server (`npm run dev`, then http://localhost:5173) or a deployed host, not by double-clicking `index.html`.
- Run `npm install` inside `frontend` first, and use Node 18 or newer.
- A crash now shows an on-screen error. Otherwise press F12 and check the Console.
- If the API is unreachable, public pages fall back to the placeholder content in `src/sample.js`. Logging in and payments need the API.
