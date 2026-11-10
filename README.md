# Ravenshaw University – Indian Knowledge System Portal

Responsive portal concept using the supplied Ravenshaw campus photos, emblem and student portrait.

## Features
- Heritage/IKS landing page, history poem, campus gallery and first-semester student contributor card.
- Student registration with department and roll-number validation (`12ABC123`).
- Phone/password login, two configurable super-admin phone accounts.
- Profile search and profile photograph upload.
- Admin photo/video/notice/PDF publishing to Cloudinary.
- Student media feeds, likes and comments.
- MCQ exam creation, scheduled availability, single attempt, timed submission, server-side scoring and leaderboard.
- TiDB/MySQL schema.

## Setup
1. Use Node.js 20+ and create a TiDB Cloud database.
2. Run `database/schema.sql` in the database.
3. Copy `.env.example` to `.env`; set `DATABASE_URL` using the TiDB-provided TLS connection string, a long random `JWT_SECRET`, Cloudinary credentials, two super-admin phone numbers and two bcrypt hashes.
4. Generate password hashes with `node -e "require('bcryptjs').hash('YOUR_LONG_PASSWORD',12).then(console.log)"`.
5. Run `npm install`, then `npm start`; open `http://localhost:3000`.

## Super-admin setup
`SUPER_ADMIN_PHONES` contains exactly two phone numbers, in the same order as `SUPER_ADMIN_HASH_1` and `SUPER_ADMIN_HASH_2`. The hashes are stored, not plaintext passwords. Each account is provisioned on its first successful login.

## Important production/security notes
- This is an independent student portal concept, not an official Ravenshaw University service. Obtain permission before using official marks/seals or publishing as an institutional service.
- Browser-only anti-cheating cannot guarantee exam integrity. Another device, screenshots, extensions or remote help can bypass client-side restrictions. For high-stakes tests, use supervised invigilation and identity verification.
- Before production, add exam autosave, server-enforced hard deadline validation on every request, audit logs, admin moderation, account recovery, upload MIME/signature scanning, quotas, pagination, backups, monitoring, restrictive CORS, HTTPS and security testing.
- Configure Cloudinary delivery/privacy according to the sensitivity of uploaded PDFs and media.
- Verified photos were not supplied for the historical figures, so initial-based cards are used rather than invented portraits.

## Historical sources
Ravenshaw University institutional history: https://www.ravenshawuniversity.ac.in/control.php?value=1
Ravenshaw University 2026 PG information brochure: https://www.ravenshawuniversity.ac.in/prospectus/2026PGInformationBrochure.pdf
