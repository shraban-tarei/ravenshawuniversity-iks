
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

const missingEnv = requiredEnv.filter(
    key => !process.env[key]
);

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
// 4. CLOUDINARY
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
        {
            expiresIn: '12h'
        }
    );
}

// =====================================================
// 6. AUTHENTICATION MIDDLEWARE
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

const only = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({
            error: 'Not permitted.'
        });
    }

    next();
};

// =====================================================
// 7. STUDENT REGISTRATION
// =====================================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const {
            fullName,
            phone,
            password,
            department,
            rollNo
        } = req.body;

        const name = String(fullName || '').trim();
        const mobile = String(phone || '').trim();
        const roll = String(rollNo || '').trim().toUpperCase();

        if (
            name.length < 2 ||
            name.length > 100 ||
            !/^\d{10}$/.test(mobile) ||
            typeof password !== 'string' ||
            password.length < 10 ||
            password.length > 128 ||
            !departments.includes(department) ||
            !validRoll.test(roll)
        ) {
            return res.status(400).json({
                error: 'Check all fields. Use a valid 10-digit phone number, roll format 12ABC123 and password of at least 10 characters.'
            });
        }

        const hash = await bcrypt.hash(password, 12);

        const [result] = await db.execute(
            `INSERT INTO users
            (
                full_name,
                phone,
                password_hash,
                department,
                roll_no,
                role
            )
            VALUES (?, ?, ?, ?, ?, 'student')`,
            [
                name,
                mobile,
                hash,
                department,
                roll
            ]
        );

        const user = {
            id: result.insertId,
            full_name: name,
            phone: mobile,
            department,
            roll_no: roll,
            role: 'student'
        };

        return res.status(201).json({
            token: sign(user),
            user
        });

    } catch (error) {
        console.error('Registration error:', error.code);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Phone number or roll number already registered.'
            });
        }

        return res.status(500).json({
            error: 'Registration failed.'
        });
    }
});

// =====================================================
// 8. STUDENT AND ADMIN LOGIN
// =====================================================

app.post('/api/auth/login', async (req, res) => {
    try {
        const {
            phone,
            password,
            role
        } = req.body;

        if (
            !phone ||
            typeof password !== 'string' ||
            !['student', 'admin'].includes(role)
        ) {
            return res.status(400).json({
                error: 'Enter valid login details.'
            });
        }

        const [rows] = await db.execute(
            `SELECT *
             FROM users
             WHERE phone = ? AND role = ?
             LIMIT 1`,
            [
                String(phone).trim(),
                role
            ]
        );

        let user = rows[0];

        // First-time super-admin creation.
        if (role === 'admin' && !user) {
            const phones = (
                process.env.SUPER_ADMIN_PHONES || ''
            ).split(',').map(x => x.trim());

            const hashes = [
                process.env.SUPER_ADMIN_HASH_1,
                process.env.SUPER_ADMIN_HASH_2
            ];

            const index = phones.indexOf(String(phone).trim());

            if (
                index >= 0 &&
                hashes[index] &&
                await bcrypt.compare(password, hashes[index])
            ) {
                const name = `Super Administrator ${index + 1}`;

                const [result] = await db.execute(
                    `INSERT INTO users
                    (
                        full_name,
                        phone,
                        password_hash,
                        role
                    )
                    VALUES (?, ?, ?, 'admin')`,
                    [
                        name,
                        String(phone).trim(),
                        hashes[index]
                    ]
                );

                user = {
                    id: result.insertId,
                    full_name: name,
                    phone: String(phone).trim(),
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

        return res.json({
            token: sign(user),
            user
        });

    } catch (error) {
        console.error('Login error:', error.code);

        return res.status(500).json({
            error: 'Login unavailable.'
        });
    }
});

// =====================================================
// 9. RESTORE AUTHENTICATED SESSION
// =====================================================

app.get('/api/auth/me', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                id,
                full_name,
                phone,
                department,
                roll_no,
                avatar_url,
                role
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(401).json({
                error: 'Account not found.'
            });
        }

        if (rows[0].role !== req.user.role) {
            return res.status(401).json({
                error: 'Account permissions have changed. Sign in again.'
            });
        }

        return res.json({
            user: rows[0]
        });

    } catch (error) {
        console.error('Session error:', error.code);

        return res.status(500).json({
            error: 'Could not restore your session.'
        });
    }
});

// =====================================================
// 10. PROFILE SEARCH
// =====================================================

app.get('/api/profiles', auth, async (req, res) => {
    try {
        const q = `%${String(req.query.q || '').slice(0, 80)}%`;

        const [rows] = await db.execute(
            `SELECT
                id,
                full_name,
                role,
                department,
                roll_no,
                avatar_url
             FROM users
             WHERE full_name LIKE ?
                OR roll_no LIKE ?
             ORDER BY full_name
             LIMIT 30`,
            [q, q]
        );

        return res.json(rows);

    } catch (error) {
        console.error('Profile error:', error.code);

        return res.status(500).json({
            error: 'Could not load profiles.'
        });
    }
});

// =====================================================
// 11. PROFILE PHOTO UPLOAD
// =====================================================

app.post(
    '/api/profile/avatar',
    auth,
    upload.single('file'),
    async (req, res) => {
        try {
            if (
                !req.file ||
                !req.file.mimetype.startsWith('image/')
            ) {
                return res.status(400).json({
                    error: 'Choose an image.'
                });
            }

            const file = await cloudUpload(
                req.file,
                'profiles'
            );

            await db.execute(
                'UPDATE users SET avatar_url = ? WHERE id = ?',
                [
                    file.secure_url,
                    req.user.id
                ]
            );

            return res.json({
                avatarUrl: file.secure_url
            });

        } catch (error) {
            console.error('Avatar error:', error.message);

            return res.status(500).json({
                error: 'Profile photo upload failed.'
            });
        }
    }
);

// =====================================================
// 12. LOAD POSTS
// =====================================================

app.get('/api/posts', auth, async (req, res) => {
    try {
        const kind = [
            'photo',
            'video',
            'notice',
            'pdf'
        ].includes(req.query.kind)
            ? req.query.kind
            : null;

        const sql = `
            SELECT
                p.id,
                p.kind,
                p.title,
                p.body,
                p.media_url,
                p.created_at,
                u.full_name AS author,

                (
                    SELECT COUNT(*)
                    FROM post_reactions x
                    WHERE x.post_id = p.id
                ) AS likes,

                (
                    SELECT COUNT(*)
                    FROM comments c
                    WHERE c.post_id = p.id
                ) AS comments

            FROM posts p
            JOIN users u ON u.id = p.admin_id

            ${kind ? 'WHERE p.kind = ?' : ''}

            ORDER BY p.created_at DESC
            LIMIT 100
        `;

        const [rows] = await db.execute(
            sql,
            kind ? [kind] : []
        );

        return res.json(rows);

    } catch (error) {
        console.error('Posts error:', error.code);

        return res.status(500).json({
            error: 'Could not load posts.'
        });
    }
});

// =====================================================
// 13. ADMIN POST UPLOAD
// =====================================================

app.post(
    '/api/posts',
    auth,
    only('admin'),
    upload.single('file'),
    async (req, res) => {
        try {
            const {
                kind,
                title,
                body
            } = req.body;

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
                return res.status(400).json({
                    error: 'Description is too long.'
                });
            }

            if (req.file) {
                const mime = req.file.mimetype;

                const validType =
                    kind === 'photo'
                        ? mime.startsWith('image/')
                        : kind === 'video'
                            ? mime.startsWith('video/')
                            : kind === 'pdf'
                                ? mime === 'application/pdf'
                                : true;

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
                (admin_id, kind, title, body, media_url)
                VALUES (?, ?, ?, ?, ?)`,
                [
                    req.user.id,
                    kind,
                    String(title).trim(),
                    body || null,
                    url
                ]
            );

            return res.status(201).json({
                id: result.insertId
            });

        } catch (error) {
            console.error('Post upload error:', error.message);

            return res.status(500).json({
                error: 'Could not create post.'
            });
        }
    }
);

// =====================================================
// 14. LIKE POSTS
// =====================================================

app.post('/api/posts/:id/like', auth, async (req, res) => {
    try {
        await db.execute(
            `INSERT IGNORE INTO post_reactions
            (post_id, user_id)
            VALUES (?, ?)`,
            [
                req.params.id,
                req.user.id
            ]
        );

        return res.json({
            ok: true
        });

    } catch (error) {
        console.error('Like error:', error.code);

        return res.status(500).json({
            error: 'Could not like post.'
        });
    }
});

// =====================================================
// 15. ADD COMMENTS
// =====================================================

app.post(
    '/api/posts/:id/comments',
    auth,
    async (req, res) => {
        try {
            const comment = String(
                req.body.comment || ''
            ).trim();

            if (!comment || comment.length > 1200) {
                return res.status(400).json({
                    error: 'Comment must be 1–1200 characters.'
                });
            }

            await db.execute(
                `INSERT INTO comments
                (post_id, user_id, comment_text)
                VALUES (?, ?, ?)`,
                [
                    req.params.id,
                    req.user.id,
                    comment
                ]
            );

            return res.status(201).json({
                ok: true
            });

        } catch (error) {
            console.error('Comment error:', error.code);

            return res.status(500).json({
                error: 'Could not add comment.'
            });
        }
    }
);

// =====================================================
// 16. GET COMMENTS
// =====================================================

app.get(
    '/api/posts/:id/comments',
    auth,
    async (req, res) => {
        try {
            const [rows] = await db.execute(
                `SELECT
                    c.id,
                    c.comment_text,
                    c.created_at,
                    u.full_name
                 FROM comments c
                 JOIN users u ON u.id = c.user_id
                 WHERE c.post_id = ?
                 ORDER BY c.created_at ASC`,
                [req.params.id]
            );

            return res.json(rows);

        } catch (error) {
            console.error('Comments error:', error.code);

            return res.status(500).json({
                error: 'Could not load comments.'
            });
        }
    }
);

// =====================================================
// 17. CREATE AND PUBLISH EXAM
// =====================================================

app.post(
    '/api/exams',
    auth,
    only('admin'),
    async (req, res) => {

        const {
            title,
            instructions,
            startsAt,
            endsAt,
            durationMinutes,
            marksCorrect,
            marksWrong,
            questions
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
                error: 'Provide a valid title, exam timing, marking scheme and MCQs.'
            });
        }

        let connection;

        try {
            connection = await db.getConnection();

            await connection.beginTransaction();

            const [result] = await connection.execute(
                `INSERT INTO exams
                (
                    admin_id,
                    title,
                    instructions,
                    starts_at,
                    ends_at,
                    duration_minutes,
                    marks_correct,
                    marks_wrong,
                    status
                )
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
                    (
                        exam_id,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_option
                    )
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

            return res.status(201).json({
                id: result.insertId,
                status: 'published'
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Exam creation error:', error.code);

            return res.status(500).json({
                error: 'Could not create exam.'
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);

// =====================================================
// 18. GET EXAMS
// =====================================================

app.get('/api/exams', auth, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT
                id,
                title,
                instructions,
                starts_at,
                ends_at,
                duration_minutes,
                status
             FROM exams
             ORDER BY starts_at DESC`
        );

        return res.json(rows);

    } catch (error) {
        console.error('Exam list error:', error.code);

        return res.status(500).json({
            error: 'Could not load exams.'
        });
    }
});

// =====================================================
// 19. STUDENT STARTS EXAM
// =====================================================

app.post(
    '/api/exams/:id/start',
    auth,
    only('student'),
    async (req, res) => {
        let connection;

        try {
            connection = await db.getConnection();

            await connection.beginTransaction();

            const [examRows] = await connection.execute(
                `SELECT *
                 FROM exams
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

                return res.status(403).json({
                    error: 'Exam is not open.'
                });
            }

            const [attemptRows] = await connection.execute(
                `SELECT id
                 FROM exam_attempts
                 WHERE exam_id = ? AND student_id = ?`,
                [
                    exam.id,
                    req.user.id
                ]
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
                [
                    exam.id,
                    req.user.id
                ]
            );

            const [questions] = await connection.execute(
                `SELECT
                    id,
                    question_text,
                    option_a,
                    option_b,
                    option_c,
                    option_d
                 FROM exam_questions
                 WHERE exam_id = ?
                 ORDER BY RAND()`,
                [exam.id]
            );

            const [attemptInfo] = await connection.execute(
                `SELECT started_at
                 FROM exam_attempts
                 WHERE id = ?`,
                [attempt.insertId]
            );

            await connection.commit();

            const startedAt = new Date(
                attemptInfo[0].started_at
            ).getTime();

            const durationDeadline =
                startedAt + Number(exam.duration_minutes) * 60000;

            const examClosingTime =
                new Date(exam.ends_at).getTime();

            const deadline = Math.min(
                durationDeadline,
                examClosingTime
            );

            return res.json({
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
            if (connection) {
                await connection.rollback();
            }

            console.error('Exam start error:', error.code);

            return res.status(500).json({
                error: 'Could not start exam.'
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);

// =====================================================
// 20. STUDENT SUBMITS EXAM
// =====================================================

app.post(
    '/api/exams/:id/submit',
    auth,
    only('student'),
    async (req, res) => {

        let connection;

        try {
            connection = await db.getConnection();

            await connection.beginTransaction();

            const [attemptRows] = await connection.execute(
                `SELECT *
                 FROM exam_attempts
                 WHERE exam_id = ? AND student_id = ?
                 FOR UPDATE`,
                [
                    req.params.id,
                    req.user.id
                ]
            );

            const attempt = attemptRows[0];

            if (
                !attempt ||
                attempt.status !== 'in_progress'
            ) {
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

                return res.status(404).json({
                    error: 'Exam not found.'
                });
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

            const questionIds = new Set(
                questions.map(q => String(q.id))
            );

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
                )
                    ? answers[String(question.id)]
                    : null;

                if (selected === question.correct_option) {
                    score += Number(exam.marks_correct);
                } else if (selected) {
                    score += Number(exam.marks_wrong);
                }

                await connection.execute(
                    `INSERT INTO exam_answers
                    (attempt_id, question_id, selected_option)
                    VALUES (?, ?, ?)`,
                    [
                        attempt.id,
                        question.id,
                        selected
                    ]
                );
            }

            const deadline =
                new Date(attempt.started_at).getTime() +
                Number(exam.duration_minutes) * 60000;

            const finalDeadline = Math.min(
                deadline,
                new Date(exam.ends_at).getTime()
            );

            const timedOut = Date.now() >= finalDeadline;

            const status = timedOut
                ? 'auto_submitted'
                : 'submitted';

            await connection.execute(
                `UPDATE exam_attempts
                 SET score = ?,
                     submitted_at = NOW(),
                     status = ?
                 WHERE id = ?`,
                [
                    score,
                    status,
                    attempt.id
                ]
            );

            await connection.commit();

            return res.json({
                score,
                status
            });

        } catch (error) {
            if (connection) {
                await connection.rollback();
            }

            console.error('Exam submission error:', error.code);

            return res.status(500).json({
                error: 'Submission failed.'
            });

        } finally {
            if (connection) {
                connection.release();
            }
        }
    }
);

// =====================================================
// 21. EXAM LEADERBOARD
// =====================================================

app.get(
    '/api/exams/:id/leaderboard',
    auth,
    async (req, res) => {
        try {
            const [rows] = await db.execute(
                `SELECT
                    u.full_name,
                    u.department,
                    u.roll_no,
                    a.score,
                    a.submitted_at
                 FROM exam_attempts a
                 JOIN users u ON u.id = a.student_id
                 WHERE a.exam_id = ?
                   AND a.status IN ('submitted', 'auto_submitted')
                 ORDER BY a.score DESC, a.submitted_at ASC`,
                [req.params.id]
            );

            return res.json(
                rows.map((row, index) => ({
                    ...row,
                    rank: index + 1
                }))
            );

        } catch (error) {
            console.error('Leaderboard error:', error.code);

            return res.status(500).json({
                error: 'Could not load leaderboard.'
            });
        }
    }
);

// =====================================================
// 22. HEALTH CHECK
// =====================================================

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');

        return res.json({
            ok: true,
            database: 'connected'
        });

    } catch (error) {
        console.error('Health check error:', error.code);

        return res.status(503).json({
            ok: false,
            database: 'disconnected'
        });
    }
});

// =====================================================
// 23. STATIC FRONTEND
// =====================================================

app.use(express.static(
    path.join(__dirname, '..', 'public')
));

app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }

    return res.sendFile(
        path.join(__dirname, '..', 'public', 'index.html')
    );
});

// =====================================================
// 24. API NOT FOUND
// =====================================================

app.use('/api', (req, res) => {
    return res.status(404).json({
        error: 'API route not found.'
    });
});

// =====================================================
// 25. GLOBAL ERROR HANDLER
// =====================================================

app.use((error, req, res, next) => {
    console.error(
        'Server error:',
        error.code || error.message
    );

    if (res.headersSent) {
        return next(error);
    }

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

    return res.status(500).json({
        error: 'An unexpected server error occurred.'
    });
});

// =====================================================
// 26. START SERVER
// =====================================================

async function startServer() {
    try {
        await db.query('SELECT 1');

        console.log('TiDB Cloud database connection successful.');

        app.listen(PORT, () => {
            console.log(
                `Ravenshaw IKS portal running on port ${PORT}`
            );
        });

    } catch (error) {
        console.error(
            'TiDB connection failed:',
            error.code || error.message
        );

        console.error(
            'Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD and DB_NAME in .env'
        );

        process.exit(1);
    }
}

startServer();
