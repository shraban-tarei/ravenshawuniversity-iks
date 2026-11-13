
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);

// =====================================================
// 1. ENVIRONMENT CONFIGURATION
// =====================================================

const requiredEnv = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET'
];

const missingEnv = requiredEnv.filter(key => !process.env[key]);

if (missingEnv.length) {
    console.error('Missing environment variables:', missingEnv.join(', '));
    process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
    console.error('JWT_SECRET must contain at least 32 characters.');
    process.exit(1);
}

// =====================================================
// 2. TIDB CLOUD CONNECTION
// =====================================================

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    timezone: 'Z'
});

// =====================================================
// 3. MIDDLEWARE
// =====================================================

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: {
        policy: 'cross-origin'
    }
}));

app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 250,
    standardHeaders: 'draft-7',
    legacyHeaders: false
}));

// =====================================================
// 4. CLOUDINARY AND FILE UPLOAD
// =====================================================

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024,
        files: 1
    }
});

async function cloudUpload(file, folder) {
    if (!file) {
        throw new Error('File is missing.');
    }

    const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/webm',
        'application/pdf'
    ];

    if (!allowed.includes(file.mimetype)) {
        throw new Error('Unsupported file type.');
    }

    const data =
        `data:${file.mimetype};base64,` +
        file.buffer.toString('base64');

    return cloudinary.uploader.upload(data, {
        folder: `ravenshaw-iks/${folder}`,
        resource_type: 'auto'
    });
}

function asyncRoute(handler) {
    return (req, res, next) => {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
}

// =====================================================
// 5. COMMON CONFIGURATION
// =====================================================

const departments = [
    'Odia',
    'English',
    'History',
    'BCA',
    'MCA',
    'BBA',
    'MBA',
    'ITM',
    'Computer Science',
    'Economics',
    'Zoology',
    'Botany',
    'Microbiology',
    'Education',
    'Physics',
    'Chemistry',
    'Commerce',
    'Philosophy',
    'Mathematics',
    'Statistics',
    'Psychology',
    'Journalism and Mass Communication'
];

const validRoll = /^\d{2}[A-Z]{3}\d{3}$/;

function sign(user) {
    return jwt.sign(
        {
            id: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
    );
}

// =====================================================
// 6. AUTHENTICATION
// =====================================================

function auth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const match = header.match(/^Bearer\s+(.+)$/i);

        if (!match) {
            return res.status(401).json({
                error: 'Please sign in again.'
            });
        }

        req.user = jwt.verify(
            match[1],
            process.env.JWT_SECRET
        );

        next();
    } catch (error) {
        return res.status(401).json({
            error: 'Your session has expired. Please sign in again.'
        });
    }
}

const optionalAuth = (req, res, next) => {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) return next();

    try {
        req.user = jwt.verify(
            match[1],
            process.env.JWT_SECRET
        );
    } catch (error) {
        req.user = null;
    }

    next();
};

const only = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({
            error: 'Not permitted.'
        });
    }

    next();
};

const memberOnly = only('admin', 'faculty', 'student');

// =====================================================
// 7. REGISTRATION
// =====================================================

app.post('/api/auth/register', asyncRoute(async (req, res) => {
    const {
        fullName,
        phone,
        password,
        department,
        rollNo,
        role: requestedRole
    } = req.body;

    const name = String(fullName || '').trim();
    const mobile = String(phone || '').trim();
    const roll = String(rollNo || '').trim().toUpperCase();

    const accountRole =
        requestedRole === 'guest' ? 'guest' : 'student';

    if (
        name.length < 2 ||
        name.length > 100 ||
        !/^\d{10}$/.test(mobile) ||
        typeof password !== 'string' ||
        password.length < 10 ||
        password.length > 128 ||
        (
            accountRole === 'student' &&
            (
                !departments.includes(department) ||
                !validRoll.test(roll)
            )
        )
    ) {
        return res.status(400).json({
            error: 'Check your name, phone number, password, department and roll number.'
        });
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await db.execute(
        `INSERT INTO users
        (full_name, phone, password_hash, department, roll_no, role)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            name,
            mobile,
            hash,
            accountRole === 'student' ? department : null,
            accountRole === 'student' ? roll : null,
            accountRole
        ]
    );

    const user = {
        id: result.insertId,
        full_name: name,
        phone: mobile,
        department: accountRole === 'student' ? department : null,
        roll_no: accountRole === 'student' ? roll : null,
        role: accountRole
    };

    res.status(201).json({
        token: sign(user),
        user
    });
}));

// =====================================================
// 8. LOGIN
// =====================================================

app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const { phone, password, role } = req.body;

    if (
        !phone ||
        typeof password !== 'string' ||
        !['student', 'faculty', 'guest', 'admin'].includes(role)
    ) {
        return res.status(400).json({
            error: 'Enter valid login details.'
        });
    }

    const mobile = String(phone).trim();

    const [rows] = await db.execute(
        `SELECT *
         FROM users
         WHERE phone = ? AND role = ?
         LIMIT 1`,
        [mobile, role]
    );

    let user = rows[0];

    if (role === 'admin' && !user) {
        const phones = (
            process.env.SUPER_ADMIN_PHONES || ''
        ).split(',').map(x => x.trim());

        const hashes = [
            process.env.SUPER_ADMIN_HASH_1,
            process.env.SUPER_ADMIN_HASH_2
        ];

        const index = phones.indexOf(mobile);

        if (
            index >= 0 &&
            hashes[index] &&
            await bcrypt.compare(password, hashes[index])
        ) {
            const name = `Super Administrator ${index + 1}`;

            const [result] = await db.execute(
                `INSERT INTO users
                (full_name, phone, password_hash, role)
                VALUES (?, ?, ?, 'admin')`,
                [name, mobile, hashes[index]]
            );

            user = {
                id: result.insertId,
                full_name: name,
                phone: mobile,
                role: 'admin',
                password_hash: hashes[index]
            };
        }
    }

    if (
        !user ||
        !await bcrypt.compare(password, user.password_hash)
    ) {
        return res.status(401).json({
            error: 'Invalid phone number or password.'
        });
    }

    delete user.password_hash;

    res.json({
        token: sign(user),
        user
    });
}));

// =====================================================
// 9. RESTORE SESSION
// =====================================================

app.get('/api/auth/me', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT id, full_name, phone, department, roll_no, semester,
                avatar_url, role
         FROM users
         WHERE id = ?
         LIMIT 1`,
        [req.user.id]
    );

    if (!rows.length || rows[0].role !== req.user.role) {
        return res.status(401).json({
            error: 'Account not found or permissions changed.'
        });
    }

    res.json({ user: rows[0] });
}));

// =====================================================
// 10. PROFILE SEARCH AND ACTIVITY
// =====================================================

app.get('/api/profiles', optionalAuth, asyncRoute(async (req, res) => {
    const q = `%${String(req.query.q || '').trim().slice(0, 80)}%`;

    const [rows] = await db.execute(
        `SELECT id, full_name, role, department, roll_no, avatar_url
         FROM users
         WHERE full_name LIKE ? OR department LIKE ? OR roll_no LIKE ?
         ORDER BY full_name
         LIMIT 30`,
        [q, q, q]
    );

    res.json(rows);
}));

app.get('/api/profiles/:id/activity', optionalAuth, asyncRoute(async (req, res) => {
    const profileId = Number(req.params.id);

    if (!Number.isSafeInteger(profileId) || profileId < 1) {
        return res.status(400).json({ error: 'Invalid profile.' });
    }

    const [profiles] = await db.execute(
        `SELECT id, full_name, role, department, avatar_url, created_at
         FROM users WHERE id = ? LIMIT 1`,
        [profileId]
    );

    if (!profiles.length) {
        return res.status(404).json({ error: 'Profile not found.' });
    }

    const [posts] = await db.execute(
        `SELECT id, kind, category, title, body, media_url, created_at
         FROM posts
         WHERE admin_id = ?
         ORDER BY created_at DESC
         LIMIT 40`,
        [profileId]
    );

    const [activities] = await db.execute(
        `SELECT 'comment' AS activity_type,
                c.comment_text AS detail,
                p.title AS post_title,
                c.created_at
         FROM comments c
         JOIN posts p ON p.id = c.post_id
         WHERE c.user_id = ?

         UNION ALL

         SELECT 'like' AS activity_type,
                'Liked a post' AS detail,
                p.title AS post_title,
                pr.created_at
         FROM post_reactions pr
         JOIN posts p ON p.id = pr.post_id
         WHERE pr.user_id = ?

         ORDER BY created_at DESC
         LIMIT 30`,
        [profileId, profileId]
    );

    res.json({
        profile: profiles[0],
        posts,
        activities
    });
}));

// =====================================================
// 11. PROFILE PHOTO
// =====================================================

app.post(
    '/api/profile/avatar',
    auth,
    upload.single('file'),
    asyncRoute(async (req, res) => {
        if (!req.file || !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Choose an image.' });
        }

        const file = await cloudUpload(req.file, 'profiles');

        await db.execute(
            'UPDATE users SET avatar_url = ? WHERE id = ?',
            [file.secure_url, req.user.id]
        );

        res.json({ avatarUrl: file.secure_url });
    })
);

// =====================================================
// 11A. STUDENT SEMESTER PROFILE FIELD
// =====================================================

app.put('/api/profile/semester', auth, asyncRoute(async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only student accounts can update a semester.' });
    }
    const semester = Number(req.body.semester);
    if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
        return res.status(400).json({ error: 'Choose a semester from 1 to 8.' });
    }
    await db.execute('UPDATE users SET semester = ? WHERE id = ?', [semester, req.user.id]);
    res.json({ semester });
}));

// =====================================================
// 12. IKS POSTS
// =====================================================

app.get('/api/posts', optionalAuth, asyncRoute(async (req, res) => {
    const kind = [
        'photo',
        'video',
        'notice',
        'pdf'
    ].includes(req.query.kind) ? req.query.kind : null;

    const sql = `
        SELECT
            p.id, p.kind, p.category, p.title, p.body,
            p.media_url, p.created_at,
            u.full_name AS author,
            (SELECT COUNT(*) FROM post_reactions x
             WHERE x.post_id = p.id) AS likes,
            (SELECT COUNT(*) FROM comments c
             WHERE c.post_id = p.id) AS comments
        FROM posts p
        JOIN users u ON u.id = p.admin_id
        ${kind ? 'WHERE p.kind = ?' : ''}
        ORDER BY p.created_at DESC
        LIMIT 100
    `;

    const [rows] = await db.execute(sql, kind ? [kind] : []);
    res.json(rows);
}));

app.post(
    '/api/posts',
    auth,
    only('admin', 'faculty'),
    upload.single('file'),
    asyncRoute(async (req, res) => {
        const { kind, title, body, category } = req.body;

        if (
            !['photo', 'video', 'notice', 'pdf'].includes(kind) ||
            !title ||
            String(title).trim().length > 200
        ) {
            return res.status(400).json({
                error: 'Enter a valid title and media type.'
            });
        }

        if (body && String(body).length > 5000) {
            return res.status(400).json({ error: 'Description is too long.' });
        }

        if (req.file) {
            const mime = req.file.mimetype;

            const validType =
                kind === 'photo' ? mime.startsWith('image/') :
                kind === 'video' ? mime.startsWith('video/') :
                kind === 'pdf' ? mime === 'application/pdf' : true;

            if (!validType) {
                return res.status(400).json({
                    error: 'File type does not match the selected post type.'
                });
            }
        }

        let url = null;

        if (req.file) {
            const file = await cloudUpload(req.file, kind);
            url = file.secure_url;
        }

        const [result] = await db.execute(
            `INSERT INTO posts
             (admin_id, kind, category, title, body, media_url)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                kind,
                kind === 'video' ? String(category || 'Other').slice(0, 80) : null,
                String(title).trim(),
                body || null,
                url
            ]
        );

        res.status(201).json({ id: result.insertId });
    })
);

app.post('/api/posts/:id/like', auth, asyncRoute(async (req, res) => {
    const postId = Number(req.params.id);

    if (!Number.isSafeInteger(postId) || postId < 1) {
        return res.status(400).json({ error: 'Invalid post.' });
    }

    const [existing] = await db.execute(
        'SELECT post_id FROM post_reactions WHERE post_id = ? AND user_id = ?',
        [postId, req.user.id]
    );

    if (existing.length) {
        await db.execute(
            'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?',
            [postId, req.user.id]
        );
    } else {
        await db.execute(
            'INSERT INTO post_reactions (post_id, user_id) VALUES (?, ?)',
            [postId, req.user.id]
        );
    }

    res.json({ liked: !existing.length });
}));

app.post('/api/posts/:id/comments', auth, asyncRoute(async (req, res) => {
    const comment = String(req.body.comment || '').trim();

    if (!comment || comment.length > 1200) {
        return res.status(400).json({
            error: 'Comment must be 1–1200 characters.'
        });
    }

    await db.execute(
        `INSERT INTO comments (post_id, user_id, comment_text)
         VALUES (?, ?, ?)`,
        [req.params.id, req.user.id, comment]
    );

    res.status(201).json({ ok: true });
}));

app.get('/api/posts/:id/comments', optionalAuth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT c.id, c.comment_text, c.created_at, u.full_name
         FROM comments c
         JOIN users u ON u.id = c.user_id
         WHERE c.post_id = ?
         ORDER BY c.created_at ASC`,
        [req.params.id]
    );

    res.json(rows);
}));

// =====================================================
// 13. EXAMS
// =====================================================

app.post('/api/exams', auth, only('admin', 'faculty'), asyncRoute(async (req, res) => {
    const {
        title, instructions, startsAt, endsAt,
        durationMinutes, marksCorrect, marksWrong, questions
    } = req.body;

    const validQuestions =
        Array.isArray(questions) &&
        questions.length > 0 &&
        questions.length <= 200 &&
        questions.every(q =>
            typeof q.question === 'string' &&
            q.question.trim().length > 0 &&
            ['A', 'B', 'C', 'D'].every(
                key => typeof q[key] === 'string' && q[key].trim()
            ) &&
            ['A', 'B', 'C', 'D'].includes(q.answer)
        );

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);

    if (
        !title ||
        String(title).trim().length > 200 ||
        !Number.isFinite(startDate.getTime()) ||
        !Number.isFinite(endDate.getTime()) ||
        endDate <= startDate ||
        !Number.isFinite(Number(durationMinutes)) ||
        Number(durationMinutes) <= 0 ||
        Number(durationMinutes) > 600 ||
        !Number.isFinite(Number(marksCorrect)) ||
        !Number.isFinite(Number(marksWrong)) ||
        !validQuestions
    ) {
        return res.status(400).json({
            error: 'Provide valid exam details and questions.'
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO exams
             (admin_id, title, instructions, starts_at, ends_at,
              duration_minutes, marks_correct, marks_wrong, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
            [
                req.user.id,
                String(title).trim(),
                instructions || null,
                startDate,
                endDate,
                Number(durationMinutes),
                Number(marksCorrect),
                Number(marksWrong)
            ]
        );

        for (const q of questions) {
            await connection.execute(
                `INSERT INTO exam_questions
                 (exam_id, question_text, option_a, option_b,
                  option_c, option_d, correct_option)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    result.insertId,
                    q.question.trim(),
                    q.A.trim(),
                    q.B.trim(),
                    q.C.trim(),
                    q.D.trim(),
                    q.answer
                ]
            );
        }

        await connection.commit();

        res.status(201).json({
            id: result.insertId,
            status: 'published'
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}));

app.get('/api/exams', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT id, title, instructions, starts_at, ends_at,
                duration_minutes, status
         FROM exams
         ORDER BY starts_at DESC`
    );

    res.json(rows);
}));

app.post('/api/exams/:id/start', auth, only('student'), asyncRoute(async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [examRows] = await connection.execute(
            `SELECT * FROM exams
             WHERE id = ? AND status = 'published'
             FOR UPDATE`,
            [req.params.id]
        );

        const exam = examRows[0];
        const now = Date.now();

        if (
            !exam ||
            now < new Date(exam.starts_at).getTime() ||
            now > new Date(exam.ends_at).getTime()
        ) {
            await connection.rollback();
            return res.status(403).json({ error: 'Exam is not open.' });
        }

        const [attemptRows] = await connection.execute(
            `SELECT id FROM exam_attempts
             WHERE exam_id = ? AND student_id = ?`,
            [exam.id, req.user.id]
        );

        if (attemptRows.length) {
            await connection.rollback();
            return res.status(409).json({
                error: 'Only one attempt is allowed.'
            });
        }

        const [attempt] = await connection.execute(
            `INSERT INTO exam_attempts
             (exam_id, student_id, started_at)
             VALUES (?, ?, NOW())`,
            [exam.id, req.user.id]
        );

        const [questions] = await connection.execute(
            `SELECT id, question_text, option_a, option_b,
                    option_c, option_d
             FROM exam_questions
             WHERE exam_id = ?
             ORDER BY RAND()`,
            [exam.id]
        );

        const [attemptInfo] = await connection.execute(
            'SELECT started_at FROM exam_attempts WHERE id = ?',
            [attempt.insertId]
        );

        await connection.commit();

        const startedAt = new Date(attemptInfo[0].started_at).getTime();

        const deadline = Math.min(
            startedAt + Number(exam.duration_minutes) * 60000,
            new Date(exam.ends_at).getTime()
        );

        res.json({
            attemptId: attempt.insertId,
            deadline: new Date(deadline).toISOString(),
            questions: questions.map(q => ({
                id: q.id,
                question: q.question_text,
                A: q.option_a,
                B: q.option_b,
                C: q.option_c,
                D: q.option_d
            }))
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}));

app.post('/api/exams/:id/submit', auth, only('student'), asyncRoute(async (req, res) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [attemptRows] = await connection.execute(
            `SELECT * FROM exam_attempts
             WHERE exam_id = ? AND student_id = ?
             FOR UPDATE`,
            [req.params.id, req.user.id]
        );

        const attempt = attemptRows[0];

        if (!attempt || attempt.status !== 'in_progress') {
            await connection.rollback();
            return res.status(409).json({
                error: 'Attempt already submitted or missing.'
            });
        }

        const [examRows] = await connection.execute(
            'SELECT * FROM exams WHERE id = ?',
            [req.params.id]
        );

        const exam = examRows[0];

        if (!exam) {
            await connection.rollback();
            return res.status(404).json({ error: 'Exam not found.' });
        }

        const [questions] = await connection.execute(
            `SELECT id, correct_option
             FROM exam_questions
             WHERE exam_id = ?`,
            [req.params.id]
        );

        const answers =
            req.body.answers &&
            typeof req.body.answers === 'object' &&
            !Array.isArray(req.body.answers)
                ? req.body.answers
                : {};

        const questionIds = new Set(questions.map(q => String(q.id)));

        for (const key of Object.keys(answers)) {
            if (!questionIds.has(key)) {
                await connection.rollback();
                return res.status(400).json({
                    error: 'Invalid question answer submitted.'
                });
            }
        }

        let score = 0;

        for (const question of questions) {
            const selected = ['A', 'B', 'C', 'D'].includes(
                answers[String(question.id)]
            ) ? answers[String(question.id)] : null;

            if (selected === question.correct_option) {
                score += Number(exam.marks_correct);
            } else if (selected) {
                score += Number(exam.marks_wrong);
            }

            await connection.execute(
                `INSERT INTO exam_answers
                 (attempt_id, question_id, selected_option)
                 VALUES (?, ?, ?)`,
                [attempt.id, question.id, selected]
            );
        }

        const deadline = Math.min(
            new Date(attempt.started_at).getTime() +
                Number(exam.duration_minutes) * 60000,
            new Date(exam.ends_at).getTime()
        );

        const status = Date.now() >= deadline
            ? 'auto_submitted'
            : 'submitted';

        await connection.execute(
            `UPDATE exam_attempts
             SET score = ?, submitted_at = NOW(), status = ?
             WHERE id = ?`,
            [score, status, attempt.id]
        );

        await connection.commit();

        res.json({ score, status });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}));

app.get('/api/exams/:id/leaderboard', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT u.full_name, u.department, u.roll_no,
                a.score, a.submitted_at
         FROM exam_attempts a
         JOIN users u ON u.id = a.student_id
         WHERE a.exam_id = ?
           AND a.status IN ('submitted', 'auto_submitted')
         ORDER BY a.score DESC, a.submitted_at ASC`,
        [req.params.id]
    );

    res.json(rows.map((row, index) => ({
        ...row,
        rank: index + 1
    })));
}));

// =====================================================
// 14. FEEDBACK
// =====================================================

app.post('/api/feedback', auth, asyncRoute(async (req, res) => {
    const subject = String(req.body.subject || '').trim().slice(0, 180);
    const message = String(req.body.message || '').trim().slice(0, 4000);
    const anonymous = req.body.anonymous === true;

    if (!subject || message.length < 5) {
        return res.status(400).json({
            error: 'Enter a subject and feedback of at least 5 characters.'
        });
    }

    await db.execute(
        `INSERT INTO feedback
         (user_id, subject, message, is_anonymous)
         VALUES (?, ?, ?, ?)`,
        [req.user.id, subject, message, anonymous ? 1 : 0]
    );

    res.status(201).json({
        message: 'Feedback sent to the administration.'
    });
}));

app.get('/api/feedback', auth, only('admin'), asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT f.id, f.subject, f.message, f.is_anonymous,
                f.status, f.created_at,
                CASE WHEN f.is_anonymous = 1
                     THEN 'Anonymous'
                     ELSE u.full_name END AS sender
         FROM feedback f
         LEFT JOIN users u ON u.id = f.user_id
         ORDER BY f.created_at DESC
         LIMIT 200`
    );

    res.json(rows);
}));

// =====================================================
// 15. DIRECT MESSAGES
// Permanent history. No expiry or automatic deletion.
// =====================================================

app.get('/api/messages/conversations', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT
            p.other_user_id,
            u.full_name,
            u.avatar_url,
            MAX(p.created_at) AS latest_message_at,
            SUBSTRING_INDEX(
                GROUP_CONCAT(
                    COALESCE(NULLIF(p.message_text, ''), 'Photo shared')
                    ORDER BY p.created_at DESC SEPARATOR ' | '
                ),
                ' | ', 1
            ) AS last_message
         FROM (
            SELECT
                sender_id,
                receiver_id,
                message_text,
                created_at,
                CASE WHEN sender_id = ? THEN receiver_id
                     ELSE sender_id END AS other_user_id
            FROM direct_messages
            WHERE sender_id = ? OR receiver_id = ?
         ) p
         JOIN users u ON u.id = p.other_user_id
         GROUP BY p.other_user_id, u.full_name, u.avatar_url
         ORDER BY latest_message_at DESC
         LIMIT 100`,
        [req.user.id, req.user.id, req.user.id]
    );

    res.json(rows);
}));

app.get('/api/messages/unread', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT COUNT(*) AS count
         FROM direct_messages m
         JOIN users sender ON sender.id = m.sender_id
         LEFT JOIN message_reads r
           ON r.user_id = m.receiver_id
          AND r.sender_id = m.sender_id
         WHERE m.receiver_id = ?
           AND m.id > COALESCE(r.last_read_message_id, 0)`,
        [req.user.id]
    );

    res.json({ count: Number(rows[0]?.count || 0) });
}));

app.get('/api/messages/unread/senders', auth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT m.sender_id, u.full_name AS sender_name,
                u.avatar_url, COUNT(*) AS unread_count,
                MAX(m.created_at) AS latest_message_at
         FROM direct_messages m
         JOIN users u ON u.id = m.sender_id
         LEFT JOIN message_reads r
           ON r.user_id = m.receiver_id
          AND r.sender_id = m.sender_id
         WHERE m.receiver_id = ?
           AND m.id > COALESCE(r.last_read_message_id, 0)
         GROUP BY m.sender_id, u.full_name, u.avatar_url
         ORDER BY latest_message_at DESC
         LIMIT 50`,
        [req.user.id]
    );

    res.json(rows);
}));

app.post('/api/messages/read/:senderId', auth, asyncRoute(async (req, res) => {
    const senderId = Number(req.params.senderId);

    if (
        !Number.isSafeInteger(senderId) ||
        senderId < 1 ||
        senderId === Number(req.user.id)
    ) {
        return res.status(400).json({
            error: 'Choose a valid conversation.'
        });
    }

    const [senderRows] = await db.execute(
        'SELECT role FROM users WHERE id = ? LIMIT 1',
        [senderId]
    );
    if (!senderRows.length) {
        return res.status(404).json({ error: 'Profile not found.' });
    }
    const [rows] = await db.execute(
        `SELECT COALESCE(MAX(id), 0) AS last_id
         FROM direct_messages
         WHERE sender_id = ? AND receiver_id = ?`,
        [senderId, req.user.id]
    );

    const lastId = Number(rows[0]?.last_id || 0);

    await db.execute(
        `INSERT INTO message_reads
         (user_id, sender_id, last_read_message_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
         last_read_message_id =
            GREATEST(last_read_message_id, VALUES(last_read_message_id))`,
        [req.user.id, senderId, lastId]
    );

    res.json({ message: 'Conversation marked as read.' });
}));

app.get('/api/messages', auth, asyncRoute(async (req, res) => {
    const otherId = Number(req.query.with);

    if (
        !Number.isSafeInteger(otherId) ||
        otherId < 1 ||
        otherId === Number(req.user.id)
    ) {
        return res.status(400).json({
            error: 'Choose a valid profile.'
        });
    }

    const [targetRows] = await db.execute(
        'SELECT id, role FROM users WHERE id = ? LIMIT 1',
        [otherId]
    );
    if (!targetRows.length) {
        return res.status(404).json({ error: 'Profile not found.' });
    }
    const [rows] = await db.execute(
        `SELECT m.id, m.sender_id, m.receiver_id,
                m.message_text, m.photo_url, m.created_at,
                u.full_name AS sender_name,
                u.avatar_url AS sender_avatar_url
         FROM direct_messages m
         JOIN users u ON u.id = m.sender_id
         WHERE (
            (m.sender_id = ? AND m.receiver_id = ?)
            OR
            (m.sender_id = ? AND m.receiver_id = ?)
         )
         ORDER BY m.created_at ASC`,
        [req.user.id, otherId, otherId, req.user.id]
    );

    res.json(rows);
}));

app.post(
    '/api/messages',
    auth,
    upload.single('file'),
    asyncRoute(async (req, res) => {
        const receiverId = Number(req.body.receiverId);
        const message = String(req.body.message || '').trim().slice(0, 3000);

        if (
            !Number.isSafeInteger(receiverId) ||
            receiverId < 1 ||
            receiverId === Number(req.user.id) ||
            (!message && !req.file)
        ) {
            return res.status(400).json({
                error: 'Choose another profile and enter a message or attach a photo.'
            });
        }

        const [target] = await db.execute(
            'SELECT id, role FROM users WHERE id = ? LIMIT 1',
            [receiverId]
        );

        if (!target.length) {
            return res.status(404).json({ error: 'Profile not found.' });
        }
        const uploaded = req.file
            ? await cloudUpload(req.file, 'messages')
            : null;

        await db.execute(
            `INSERT INTO direct_messages
             (sender_id, receiver_id, message_text, photo_url)
             VALUES (?, ?, ?, ?)`,
            [
                req.user.id,
                receiverId,
                message,
                uploaded ? uploaded.secure_url : null
            ]
        );

        res.status(201).json({ message: 'Message sent.' });
    })
);

// =====================================================
// 16. ADMIN ROLE MANAGEMENT
// =====================================================

app.post('/api/admin/appoint/:id', auth, only('admin'), asyncRoute(async (req, res) => {
    const targetId = Number(req.params.id);

    if (
        !Number.isSafeInteger(targetId) ||
        targetId < 1 ||
        targetId === Number(req.user.id)
    ) {
        return res.status(400).json({
            error: 'Choose a valid different profile.'
        });
    }

    const [result] = await db.execute(
        "UPDATE users SET role = 'admin' WHERE id = ?",
        [targetId]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ error: 'Profile not found.' });
    }

    await db.execute(
        `INSERT INTO admin_audit (actor_id, target_id, action)
         VALUES (?, ?, ?)`,
        [req.user.id, targetId, 'appointed_admin']
    );

    res.json({ message: 'Administrator role assigned successfully.' });
}));

app.post('/api/admin/faculty/:id', auth, only('admin'), asyncRoute(async (req, res) => {
    const targetId = Number(req.params.id);

    if (
        !Number.isSafeInteger(targetId) ||
        targetId < 1 ||
        targetId === Number(req.user.id)
    ) {
        return res.status(400).json({
            error: 'Choose a valid different profile.'
        });
    }

    const [result] = await db.execute(
        "UPDATE users SET role = 'faculty' WHERE id = ?",
        [targetId]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ error: 'Profile not found.' });
    }

    await db.execute(
        `INSERT INTO admin_audit (actor_id, target_id, action)
         VALUES (?, ?, ?)`,
        [req.user.id, targetId, 'appointed_faculty']
    );

    res.json({ message: 'Faculty access assigned successfully.' });
}));

// =====================================================
// 17. GLOBAL SEARCH
// =====================================================

app.get('/api/search', optionalAuth, asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);

    if (q.length < 2) {
        return res.json({ profiles: [], posts: [] });
    }

    const like = `%${q}%`;

    const [profiles] = await db.execute(
        `SELECT id, full_name, role, department, roll_no, avatar_url
         FROM users
         WHERE full_name LIKE ? OR department LIKE ? OR roll_no LIKE ?
         ORDER BY full_name
         LIMIT 30`,
        [like, like, like]
    );

    const [posts] = await db.execute(
        `SELECT p.id, p.kind, p.title, p.body, p.media_url,
                p.created_at, u.full_name AS author
         FROM posts p
         JOIN users u ON u.id = p.admin_id
         WHERE p.title LIKE ? OR p.body LIKE ?
         ORDER BY p.created_at DESC
         LIMIT 40`,
        [like, like]
    );

    res.json({ profiles, posts });
}));

// =====================================================
// 18. HABITUP — PERMANENT CATEGORIES
// =====================================================

const habitupCategories = [
    ['daily-exercises', 'Daily Exercises', 'Daily movement and fitness activities.'],
    ['yoga', 'Yoga', 'Yoga postures, practice and learning.'],
    ['pranayama', 'Pranayama', 'Traditional breathing practices.'],
    ['mindful-meditation', 'Mindful Meditation', 'Mindfulness and meditation activities.'],
    ['breathing-exercises', 'Breathing Exercises', 'Guided breathing exercises.'],
    ['chakra-healing', 'Chakra Healing', 'Educational content about chakra traditions.'],
    ['overcoming-limerence', 'Overcoming Limerence', 'Learning resources about attachment and emotional wellbeing.'],
    ['rewire-your-brain', 'Rewire Your Brain', 'Learning about habits, attention and neuroplasticity.'],
    ['engite', 'Engite', 'HabitUp community learning and activities.'],
    ['self-hypnosis', 'Self-Hypnosis', 'Educational self-hypnosis resources.'],
    ['eft', 'EFT (Emotional Freedom Technique)', 'Educational resources about EFT tapping.'],
    ['trauma-release', 'Trauma Release', 'Wellbeing resources and supportive learning.'],
    ['chants', 'Chants', 'Chants, recitations and audio resources.'],
    ['hypnosis-subconscious-training', 'Hypnosis / Subconscious Training and Reprogramming', 'Educational hypnosis and subconscious-training resources.'],
    ['mantra-magnetism', 'Mantra Magnetism (Bio-Magnetic Field)', 'Exploration of mantra traditions and related concepts.']
];

const categorySlugs = new Set(habitupCategories.map(c => c[0]));

// Admin/faculty publishing for HabitUp: save each item against its selected category.
app.post(
    '/api/habitup/activities',
    auth,
    only('admin', 'faculty'),
    upload.single('file'),
    asyncRoute(async (req, res) => {
        const { title, body, category } = req.body;
        const categorySlug = String(category || '').trim();
        const categoryRow = await getHabitupCategory(categorySlug);

        if (!categoryRow) {
            return res.status(400).json({ error: 'Select a valid HabitUp category.' });
        }
        if (!title || String(title).trim().length > 200) {
            return res.status(400).json({ error: 'Enter a valid title.' });
        }
        if (body && String(body).length > 5000) {
            return res.status(400).json({ error: 'Description is too long.' });
        }

        let mediaType = 'none';
        let mediaUrl = null;
        if (req.file) {
            const mime = req.file.mimetype;
            if (mime.startsWith('image/')) mediaType = 'image';
            else if (mime.startsWith('video/')) mediaType = 'video';
            else if (mime === 'application/pdf') mediaType = 'pdf';
            else {
                return res.status(400).json({
                    error: 'Only images, videos and PDF files are supported.'
                });
            }
            const uploaded = await cloudUpload(req.file, 'habitup');
            mediaUrl = uploaded.secure_url;
        }

        const [result] = await db.execute(
            `INSERT INTO habitup_activities
             (user_id, category_id, title, body, media_url, media_type, visibility)
             VALUES (?, ?, ?, ?, ?, ?, 'public')`,
            [req.user.id, categoryRow.id, String(title).trim(), body || null,
             mediaUrl, mediaType]
        );
        res.status(201).json({ id: result.insertId, category: categoryRow.slug });
    })
);

async function getHabitupCategory(slug) {
    if (!categorySlugs.has(slug)) return null;

    const [rows] = await db.execute(
        `SELECT id, slug, title, description, cover_url, display_order
         FROM habitup_categories
         WHERE slug = ?
         LIMIT 1`,
        [slug]
    );

    return rows[0] || null;
}

app.get('/api/habitup/categories', optionalAuth, asyncRoute(async (req, res) => {
    const [rows] = await db.execute(
        `SELECT c.id, c.slug, c.title, c.description, c.cover_url,
                c.display_order, COUNT(a.id) AS activity_count
         FROM habitup_categories c
         LEFT JOIN habitup_activities a ON a.category_id = c.id
         GROUP BY c.id, c.slug, c.title, c.description,
                  c.cover_url, c.display_order
         ORDER BY c.display_order ASC, c.id ASC`
    );

    const found = new Set(rows.map(row => row.slug));
    const missing = habitupCategories.filter(c => !found.has(c[0]));

    if (missing.length) {
        return res.status(500).json({
            error: 'Run database/habitup.sql. Some permanent categories are missing.',
            missingCategories: missing.map(c => c[1])
        });
    }

    res.json(rows);
}));

app.get('/api/habitup/categories/:slug', optionalAuth, asyncRoute(async (req, res) => {
    const category = await getHabitupCategory(req.params.slug);

    if (!category) {
        return res.status(404).json({ error: 'HabitUp category not found.' });
    }

    const isMember = req.user &&
        ['admin', 'faculty', 'student'].includes(req.user.role);

    const visibility = isMember
        ? "a.visibility IN ('public', 'members')"
        : "a.visibility = 'public'";

    const params = isMember
        ? [req.user.id, category.id]
        : [category.id];

    const [activities] = await db.execute(
        `SELECT
            a.id, a.title, a.body, a.media_url, a.media_type,
            a.visibility, a.created_at,
            u.id AS user_id, u.full_name, u.role,
            u.department, u.avatar_url,
            (SELECT COUNT(*) FROM habitup_likes l
             WHERE l.activity_id = a.id) AS like_count,
            ${isMember
                ? `(SELECT COUNT(*) FROM habitup_likes l
                    WHERE l.activity_id = a.id
                    AND l.user_id = ?) AS liked_by_me`
                : '0 AS liked_by_me'}
         FROM habitup_activities a
         JOIN users u ON u.id = a.user_id
         WHERE a.category_id = ?
           AND ${visibility}
         ORDER BY a.created_at DESC
         LIMIT 100`,
        params
    );

    res.json({ category, activities });
}));

app.get('/api/habitup/search', optionalAuth, asyncRoute(async (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 100);

    if (q.length < 2) {
        return res.json({ profiles: [], activities: [] });
    }

    const term = `%${q}%`;

    const [profiles] = await db.execute(
        `SELECT u.id, u.full_name, u.role, u.department, u.avatar_url,
                COUNT(DISTINCT a.id) AS activity_count
         FROM users u
         LEFT JOIN habitup_activities a
           ON a.user_id = u.id AND a.visibility = 'public'
         WHERE u.full_name LIKE ? OR u.department LIKE ?
         GROUP BY u.id, u.full_name, u.role, u.department, u.avatar_url
         ORDER BY activity_count DESC, u.full_name ASC
         LIMIT 30`,
        [term, term]
    );

    const [activities] = await db.execute(
        `SELECT a.id, a.title, a.body, a.media_url, a.media_type,
                a.created_at, c.slug AS category_slug,
                c.title AS category_title,
                u.id AS user_id, u.full_name, u.avatar_url,
                (SELECT COUNT(*) FROM habitup_likes l
                 WHERE l.activity_id = a.id) AS like_count
         FROM habitup_activities a
         JOIN habitup_categories c ON c.id = a.category_id
         JOIN users u ON u.id = a.user_id
         WHERE a.visibility = 'public'
           AND (a.title LIKE ? OR a.body LIKE ? OR c.title LIKE ?)
         ORDER BY a.created_at DESC
         LIMIT 50`,
        [term, term, term]
    );

    res.json({ profiles, activities });
}));

app.get('/api/habitup/profiles/:id', optionalAuth, asyncRoute(async (req, res) => {
    const profileId = Number(req.params.id);

    if (!Number.isSafeInteger(profileId) || profileId < 1) {
        return res.status(400).json({ error: 'Invalid profile ID.' });
    }

    const [profiles] = await db.execute(
        `SELECT id, full_name, role, department, avatar_url, created_at
         FROM users WHERE id = ? LIMIT 1`,
        [profileId]
    );

    if (!profiles.length) {
        return res.status(404).json({ error: 'Profile not found.' });
    }

    const [stats] = await db.execute(
        `SELECT COUNT(DISTINCT a.id) AS activity_count,
                COUNT(l.id) AS likes_received
         FROM habitup_activities a
         LEFT JOIN habitup_likes l ON l.activity_id = a.id
         WHERE a.user_id = ? AND a.visibility = 'public'`,
        [profileId]
    );

    const [activities] = await db.execute(
        `SELECT a.id, a.title, a.body, a.media_url, a.media_type,
                a.created_at, c.slug AS category_slug,
                c.title AS category_title,
                (SELECT COUNT(*) FROM habitup_likes l
                 WHERE l.activity_id = a.id) AS like_count
         FROM habitup_activities a
         JOIN habitup_categories c ON c.id = a.category_id
         WHERE a.user_id = ? AND a.visibility = 'public'
         ORDER BY a.created_at DESC
         LIMIT 100`,
        [profileId]
    );

    res.json({
        profile: profiles[0],
        stats: stats[0],
        activities
    });
}));

app.delete('/api/habitup/activities/:id', auth, only('admin'), asyncRoute(async (req, res) => {
    const activityId = Number(req.params.id);

    if (!Number.isSafeInteger(activityId) || activityId < 1) {
        return res.status(400).json({ error: 'Invalid activity ID.' });
    }

    const [result] = await db.execute(
        'DELETE FROM habitup_activities WHERE id = ?',
        [activityId]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ error: 'Activity not found.' });
    }

    res.json({ message: 'Activity removed.' });
}));

// =====================================================
// 19. MEDIA GALLERY PLAYLISTS
// Admin creates and manages playlists.
// Public visitors can browse public playlists.
// =====================================================

// List public playlists. Admin can request all playlists.
app.get('/api/media/playlists', optionalAuth, asyncRoute(async (req, res) => {
    const isAdmin = req.user && req.user.role === 'admin';

    const visibilitySql = isAdmin && req.query.all === 'true'
        ? ''
        : "WHERE p.visibility = 'public'";

    const [rows] = await db.execute(
        `SELECT
            p.id,
            p.title,
            p.description,
            p.cover_url,
            p.visibility,
            p.created_at,
            u.full_name AS creator,
            COUNT(i.id) AS video_count
         FROM media_playlists p
         JOIN users u ON u.id = p.created_by
         LEFT JOIN media_playlist_items i ON i.playlist_id = p.id
         ${visibilitySql}
         GROUP BY
            p.id, p.title, p.description, p.cover_url,
            p.visibility, p.created_at, u.full_name
         ORDER BY p.created_at DESC`,
        []
    );

    res.json(rows);
}));

// Get a playlist and its videos.
app.get('/api/media/playlists/:id', optionalAuth, asyncRoute(async (req, res) => {
    const playlistId = Number(req.params.id);

    if (!Number.isSafeInteger(playlistId) || playlistId < 1) {
        return res.status(400).json({ error: 'Invalid playlist.' });
    }

    const [playlists] = await db.execute(
        `SELECT p.id, p.title, p.description, p.cover_url,
                p.visibility, p.created_at, u.full_name AS creator
         FROM media_playlists p
         JOIN users u ON u.id = p.created_by
         WHERE p.id = ? LIMIT 1`,
        [playlistId]
    );

    if (!playlists.length) {
        return res.status(404).json({ error: 'Playlist not found.' });
    }

    if (
        playlists[0].visibility !== 'public' &&
        (!req.user || req.user.role !== 'admin')
    ) {
        return res.status(403).json({ error: 'This playlist is private.' });
    }

    const [videos] = await db.execute(
        `SELECT
            p.id,
            p.title,
            p.body,
            p.category,
            p.media_url,
            p.created_at,
            u.full_name AS author,
            i.position
         FROM media_playlist_items i
         JOIN posts p ON p.id = i.post_id
         JOIN users u ON u.id = p.admin_id
         WHERE i.playlist_id = ?
           AND p.kind = 'video'
         ORDER BY i.position ASC, i.id ASC`,
        [playlistId]
    );

    res.json({
        playlist: playlists[0],
        videos
    });
}));

// Create a playlist.
app.post('/api/media/playlists', auth, only('admin'), asyncRoute(async (req, res) => {
    const title = String(req.body.title || '').trim().slice(0, 180);
    const description = String(req.body.description || '').trim().slice(0, 3000);
    const coverUrl = String(req.body.cover_url || '').trim().slice(0, 1000);
    const visibility = req.body.visibility === 'private' ? 'private' : 'public';

    if (!title) {
        return res.status(400).json({ error: 'Playlist title is required.' });
    }

    const [result] = await db.execute(
        `INSERT INTO media_playlists
         (created_by, title, description, cover_url, visibility)
         VALUES (?, ?, ?, ?, ?)`,
        [
            req.user.id,
            title,
            description || null,
            coverUrl || null,
            visibility
        ]
    );

    res.status(201).json({
        message: 'Playlist created.',
        playlistId: result.insertId
    });
}));

// Edit playlist details.
app.put('/api/media/playlists/:id', auth, only('admin'), asyncRoute(async (req, res) => {
    const playlistId = Number(req.params.id);

    if (!Number.isSafeInteger(playlistId) || playlistId < 1) {
        return res.status(400).json({ error: 'Invalid playlist.' });
    }

    const title = String(req.body.title || '').trim().slice(0, 180);
    const description = String(req.body.description || '').trim().slice(0, 3000);
    const coverUrl = String(req.body.cover_url || '').trim().slice(0, 1000);
    const visibility = req.body.visibility === 'private' ? 'private' : 'public';

    if (!title) {
        return res.status(400).json({ error: 'Playlist title is required.' });
    }

    const [result] = await db.execute(
        `UPDATE media_playlists
         SET title = ?, description = ?, cover_url = ?, visibility = ?
         WHERE id = ?`,
        [
            title,
            description || null,
            coverUrl || null,
            visibility,
            playlistId
        ]
    );

    if (!result.affectedRows) {
        return res.status(404).json({ error: 'Playlist not found.' });
    }

    res.json({ message: 'Playlist updated.' });
}));

// Delete playlist and its membership records.
// Videos/posts themselves are not deleted.
app.delete('/api/media/playlists/:id', auth, only('admin'), asyncRoute(async (req, res) => {
    const playlistId = Number(req.params.id);

    if (!Number.isSafeInteger(playlistId) || playlistId < 1) {
        return res.status(400).json({ error: 'Invalid playlist.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        await connection.execute(
            'DELETE FROM media_playlist_items WHERE playlist_id = ?',
            [playlistId]
        );

        const [result] = await connection.execute(
            'DELETE FROM media_playlists WHERE id = ?',
            [playlistId]
        );

        await connection.commit();

        if (!result.affectedRows) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        res.json({
            message: 'Playlist deleted. Videos remain in Media Gallery.'
        });
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}));

// Add an existing video post to a playlist.
app.post(
    '/api/media/playlists/:id/videos',
    auth,
    only('admin'),
    asyncRoute(async (req, res) => {
        const playlistId = Number(req.params.id);
        const postId = Number(req.body.post_id);

        if (
            !Number.isSafeInteger(playlistId) || playlistId < 1 ||
            !Number.isSafeInteger(postId) || postId < 1
        ) {
            return res.status(400).json({
                error: 'Choose a valid playlist and video.'
            });
        }

        const [playlist] = await db.execute(
            'SELECT id FROM media_playlists WHERE id = ? LIMIT 1',
            [playlistId]
        );

        if (!playlist.length) {
            return res.status(404).json({ error: 'Playlist not found.' });
        }

        const [video] = await db.execute(
            `SELECT id FROM posts WHERE id = ? AND kind = 'video' LIMIT 1`,
            [postId]
        );

        if (!video.length) {
            return res.status(404).json({ error: 'Video not found.' });
        }

        const [existing] = await db.execute(
            `SELECT id FROM media_playlist_items
             WHERE playlist_id = ? AND post_id = ? LIMIT 1`,
            [playlistId, postId]
        );

        if (existing.length) {
            return res.status(409).json({
                error: 'This video is already in the playlist.'
            });
        }

        const [positionRows] = await db.execute(
            `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
             FROM media_playlist_items
             WHERE playlist_id = ?`,
            [playlistId]
        );

        await db.execute(
            `INSERT INTO media_playlist_items
             (playlist_id, post_id, position)
             VALUES (?, ?, ?)`,
            [playlistId, postId, positionRows[0].next_position]
        );

        res.status(201).json({ message: 'Video added to playlist.' });
    })
);

// Remove a video from a playlist without deleting the original video.
app.delete(
    '/api/media/playlists/:id/videos/:postId',
    auth,
    only('admin'),
    asyncRoute(async (req, res) => {
        const playlistId = Number(req.params.id);
        const postId = Number(req.params.postId);

        if (
            !Number.isSafeInteger(playlistId) || playlistId < 1 ||
            !Number.isSafeInteger(postId) || postId < 1
        ) {
            return res.status(400).json({ error: 'Invalid playlist or video.' });
        }

        const [result] = await db.execute(
            `DELETE FROM media_playlist_items
             WHERE playlist_id = ? AND post_id = ?`,
            [playlistId, postId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                error: 'Video was not found in this playlist.'
            });
        }

        res.json({ message: 'Video removed from playlist.' });
    })
);

// =====================================================
// 20. HEALTH CHECK
// =====================================================

app.get('/api/health', asyncRoute(async (req, res) => {
    await db.query('SELECT 1');

    res.json({
        ok: true,
        database: 'connected'
    });
}));

// =====================================================
// 21. STATIC FRONTEND
// =====================================================

app.get(['/', '/index.html'], (req, res, next) => {
    res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    res.sendFile(
        path.join(__dirname, '..', 'public', 'index.html')
    );
});

// =====================================================
// 22. API NOT FOUND
// =====================================================

app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found.' });
});

// =====================================================
// 23. GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
    console.error(
        'Server error:',
        error.code || error.message
    );

    if (res.headersSent) return next(error);

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File size exceeds the 100 MB limit.'
        });
    }

    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            error: 'File upload error.'
        });
    }

    return res.status(error.status || 500).json({
        error: error.status
            ? error.message
            : 'An unexpected server error occurred.'
    });
});

// =====================================================
// 24. START SERVER AND ENSURE TABLES
// =====================================================

async function startServer() {
    try {
        await db.query('SELECT 1');

        await db.query(
            `ALTER TABLE users
             MODIFY COLUMN role
             ENUM('admin','student','faculty','guest')
             NOT NULL DEFAULT 'student'`
        );

        const [semesterColumns] = await db.query(
            `SELECT COLUMN_NAME FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'users' AND COLUMN_NAME = 'semester'`
        );
        if (!semesterColumns.length) {
            await db.query('ALTER TABLE users ADD COLUMN semester TINYINT UNSIGNED NULL AFTER roll_no');
        }

        const [categoryColumns] = await db.query(
            `SELECT COLUMN_NAME
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'posts'
               AND COLUMN_NAME = 'category'`
        );

        if (!categoryColumns.length) {
            await db.query(
                'ALTER TABLE posts ADD COLUMN category VARCHAR(80) NULL AFTER kind'
            );
        }

        await db.query(`
            CREATE TABLE IF NOT EXISTS feedback (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT UNSIGNED NULL,
                subject VARCHAR(180) NOT NULL,
                message TEXT NOT NULL,
                is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
                status ENUM('new','reviewed') NOT NULL DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_feedback_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE SET NULL
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS direct_messages (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                sender_id BIGINT UNSIGNED NOT NULL,
                receiver_id BIGINT UNSIGNED NOT NULL,
                message_text TEXT NOT NULL,
                photo_url TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_dm_pair (sender_id, receiver_id, created_at),
                CONSTRAINT fk_dm_sender
                    FOREIGN KEY (sender_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_dm_receiver
                    FOREIGN KEY (receiver_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);

        // Upgrade older installations in place so message queries do not fail
        // with ER_BAD_FIELD_ERROR when these tables predate photo/history fields.
        const ensureColumn = async (tableName, columnName, definition) => {
            const [found] = await db.query(
                `SELECT COLUMN_NAME FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE()
                   AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
                [tableName, columnName]
            );
            if (!found.length) {
                await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`);
            }
        };
        await ensureColumn('users', 'roll_no', 'CHAR(8) NULL');
        await ensureColumn('users', 'avatar_url', 'TEXT NULL');
        await ensureColumn('users', 'semester', 'TINYINT UNSIGNED NULL');
        await ensureColumn('direct_messages', 'photo_url', 'TEXT NULL');
        await ensureColumn('direct_messages', 'message_text', 'TEXT NULL');
        await ensureColumn('direct_messages', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');

        await db.query(`
            CREATE TABLE IF NOT EXISTS message_reads (
                user_id BIGINT UNSIGNED NOT NULL,
                sender_id BIGINT UNSIGNED NOT NULL,
                last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, sender_id),
                CONSTRAINT fk_message_reads_user
                    FOREIGN KEY (user_id) REFERENCES users(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_message_reads_sender
                    FOREIGN KEY (sender_id) REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);

        await ensureColumn('message_reads', 'user_id', 'BIGINT UNSIGNED NULL');
        await ensureColumn('message_reads', 'sender_id', 'BIGINT UNSIGNED NULL');
        await ensureColumn('message_reads', 'last_read_message_id', 'BIGINT UNSIGNED NOT NULL DEFAULT 0');

        await db.query(`
            CREATE TABLE IF NOT EXISTS admin_audit (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                actor_id BIGINT UNSIGNED NOT NULL,
                target_id BIGINT UNSIGNED NOT NULL,
                action VARCHAR(60) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_audit_actor
                    FOREIGN KEY (actor_id) REFERENCES users(id),
                CONSTRAINT fk_audit_target
                    FOREIGN KEY (target_id) REFERENCES users(id)
            )
        `);

        // Media Gallery playlist tables.
        // Removing a playlist never deletes its original video posts.
        await db.query(`
            CREATE TABLE IF NOT EXISTS media_playlists (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                created_by BIGINT UNSIGNED NOT NULL,
                title VARCHAR(180) NOT NULL,
                description TEXT NULL,
                cover_url TEXT NULL,
                visibility ENUM('public','private') NOT NULL DEFAULT 'public',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_media_playlist_visibility (visibility),
                CONSTRAINT fk_media_playlist_creator
                    FOREIGN KEY (created_by) REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS media_playlist_items (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                playlist_id BIGINT UNSIGNED NOT NULL,
                post_id BIGINT UNSIGNED NOT NULL,
                position INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_media_playlist_video (playlist_id, post_id),
                INDEX idx_media_playlist_position (playlist_id, position),
                CONSTRAINT fk_media_playlist_item_playlist
                    FOREIGN KEY (playlist_id) REFERENCES media_playlists(id)
                    ON DELETE CASCADE,
                CONSTRAINT fk_media_playlist_item_post
                    FOREIGN KEY (post_id) REFERENCES posts(id)
                    ON DELETE CASCADE
            )
        `);

        // HabitUp tables must be installed using database/habitup.sql.
        const [habitupTables] = await db.query(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME IN (
                'habitup_categories',
                'habitup_activities',
                'habitup_likes'
              )
        `);

        if (habitupTables.length !== 3) {
            throw new Error(
                'HabitUp tables are missing. Run database/habitup.sql before starting the server.'
            );
        }

        for (let i = 0; i < habitupCategories.length; i++) {
            const [slug, title, description] = habitupCategories[i];

            await db.execute(
                `INSERT INTO habitup_categories
                 (slug, title, description, display_order)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    description = VALUES(description)`,
                [slug, title, description, i + 1]
            );
        }

        console.log('TiDB Cloud database connection successful.');
        console.log('HabitUp permanent categories verified.');
        console.log('Direct-message history retention: permanent.');
        console.log('Media Gallery playlist tables verified.');

        app.listen(PORT, () => {
            console.log(`Ravenshaw IKS portal running on port ${PORT}`);
        });

    } catch (error) {
        console.error(
            'Server startup failed:',
            error.code || error.message
        );

        console.error(
            'Check database connectivity and confirm that database/habitup.sql has been executed.'
        );

        process.exit(1);
    }
}

startServer();
