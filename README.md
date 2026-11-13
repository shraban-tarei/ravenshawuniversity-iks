# Ravenshaw University – Indian Knowledge System Portal

Responsive IKS portal concept using the campus assets already supplied in this project and the four original photographs supplied with the update. No generated or stock profile photographs are used for the three faculty cards.

## Included features
- Heritage-inspired English/Odia IKS landing page, history and Computer Science department About/Vision/Mission.
- Homepage auto slideshow using the supplied Priyanka Kujur, Dr. Om Prakash Jena and Himanshu Sekhar Acharya photographs; NAAC A++ artwork appears separately as the static accreditation mark.
- Student and guest self-registration; student, faculty, guest and admin sign-in. Faculty accounts can be assigned by an administrator; faculty can publish media and create exams.
- Admin bottom icon dock for Home, media publishing, exams, results, profile search, admin/faculty appointments, messages, feedback, gallery and video library.
- Home feed with recent posts; searchable profiles, media and posts; profile activity and avatar display.
- Direct text and photo messaging through Cloudinary; user feedback inbox for administrators.
- Photo gallery with download links; video library categories for Yoga, Chants, IKS Lectures, Cultural Heritage, Seminars, Workshops and Events.
- Admin photo/video/notice/PDF publishing, post likes/comments, MCQ exam creation, timed attempts, server-side scoring and results.
- TiDB Cloud / MySQL database schema and startup migrations for new roles, media categories, messaging, feedback and admin audit.

## Setup
1. Use Node.js 20+ and create a TiDB Cloud database.
2. Run `database/schema.sql` in the database. The server also creates the new feedback, messaging and admin audit tables and extends the role enum at startup.
3. Copy `.env.example` to `.env` and fill the DB credentials, a random `JWT_SECRET` of at least 32 characters, Cloudinary credentials and the two configured super-admin phone/hash pairs.
4. Generate bcrypt hashes with `node -e "require('bcryptjs').hash('YOUR_LONG_PASSWORD',12).then(console.log)"`.
5. Run `npm install`, then `npm start`; open the URL shown in the console.

## Environment variables
`DB_HOST`, `DB_PORT` (TiDB commonly uses 4000), `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `PORT`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SUPER_ADMIN_PHONES`, `SUPER_ADMIN_HASH_1`, and `SUPER_ADMIN_HASH_2`.

## Roles
- Student: self-registers with department and roll number.
- Guest: self-registers with name, phone and password.
- Faculty: created by an administrator promoting a registered profile through Search.
- Admin: configured super-admin accounts or appointed by an existing administrator.

## Important notes
- This is an independent student portal concept, not an official Ravenshaw University service. Obtain institutional approval before public institutional deployment.
- Photo downloads and media uploads depend on Cloudinary configuration and the access settings of uploaded assets.
- Messaging is database-backed and supports text and image attachments; it is not real-time socket chat.
- Public profile activity currently displays posts published by that profile plus their comments and likes.
- Before production, add moderation, account recovery, upload signature scanning, quotas, pagination, backups, monitoring, stricter CORS, HTTPS and security testing.


Sign-out behavior: logout clears the local authentication token, hides and clears the private dashboard view, returns to the public homepage, resets browser history state, and guards against browser back/forward cache restoration.


### Direct message retention
Direct messages are visible in Previous conversations for 14 days. The server deletes message rows older than 14 days at startup and every 15 minutes; message-history API responses also exclude messages older than 14 days.


## HabitUp community experience

HabitUp opens as a focused workspace without the IKS dashboard navigation. Its internal navigation contains Home, Category and Profile. The Profile item displays the signed-in user's details and photo-upload control inside HabitUp.

The public homepage and HabitUp landing page include visual step-by-step guides. The admin HabitUp publishing menu and publishing API have been retired; existing HabitUp category content remains available for reading.

Messaging permissions are enforced by the server: faculty may message other accounts, while non-faculty accounts may message faculty only. Non-faculty accounts cannot start or open student-to-student conversations.

The homepage features eight dedicated profile cards. Ravenshaw alumni are distinguished from Odisha heritage figures who were not alumni; Jayadeva is explicitly identified as a 12th-century cultural figure, and Paramahamsa Prajnanananda is described as a former Ravenshaw College Economics professor rather than incorrectly labelled an alumnus.
