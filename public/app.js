
'use strict';

/* =========================================================
   RAVENSHAW UNIVERSITY - INDIAN KNOWLEDGE SYSTEM
   RUIKS FRONTEND APPLICATION
   Backend: Node.js + Express + TiDB Cloud + Cloudinary
   ========================================================= */

const API = '/api';

let token = localStorage.getItem('ruiks_token') || '';
let user = null;
let mode = 'login';

let qnum = 0;
let chosen = {};
let examTimer = null;
let activeExamId = null;
let submitting = false;
let initialized = false;

const $ = selector => document.querySelector(selector);

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

/* =========================================================
   1. INITIALIZATION
   ========================================================= */

function initialize() {
    if (initialized) return;
    initialized = true;

    const form = $('#authForm');

    if (form?.elements.department) {
        departments.forEach(department => {
            form.elements.department.add(
                new Option(department, department)
            );
        });
    }

    // Authentication form has its own direct listener.
    if (form) {
        form.addEventListener('submit', handleAuth);
    } else {
        console.error('Authentication form not found. Check id="authForm".');
    }

    // Header buttons
    $('#openLogin')?.addEventListener('click', () => {
        openAuth('login');
    });

    $('#openRegister')?.addEventListener('click', () => {
        openAuth('register');
    });

    $('#closeAuthBtn')?.addEventListener('click', closeAuth);

    // Authentication tabs
    $('#loginTab')?.addEventListener('click', () => {
        mode = 'login';
        renderMode();
    });

    $('#regTab')?.addEventListener('click', () => {
        mode = 'register';
        renderMode();
    });

    // Mobile menu
    $('#menuToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('nav-open');
    });

    // Close modal outside the modal content
    $('#modal')?.addEventListener('click', event => {
        if (event.target === $('#modal')) {
            closeAuth();
        }
    });

    // Escape key
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            closeAuth();
        }
    });

    // Dashboard click handling
    document.addEventListener('click', handleDocumentClick);

    // Dashboard form handling
    document.addEventListener('submit', handleDocumentSubmit);

    // Save selected exam answers
    document.addEventListener('change', event => {
        if (
            event.target.matches('#examQ input[type="radio"]')
        ) {
            const questionId = event.target.name.slice(1);
            chosen[questionId] = event.target.value;
        }
    });

    restoreSession();
}

/* =========================================================
   2. API HELPER
   ========================================================= */

async function api(url, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    if (token) {
        headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(API + url, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 && token) {
            clearSession();
        }

        throw new Error(
            data.error ||
            data.message ||
            `Request failed (${response.status})`
        );
    }

    return data;
}

/* =========================================================
   3. AUTHENTICATION MODAL
   ========================================================= */

function openAuth(type) {
    const modal = $('#modal');
    const form = $('#authForm');

    if (!modal || !form) {
        console.error('Authentication modal or form not found.');
        return;
    }

    mode = type === 'register' ? 'register' : 'login';

    if (form.elements.role) {
        form.elements.role.value = 'student';
    }

    if (form.elements.password) {
        form.elements.password.value = '';
    }

    if (form.elements.fullName) {
        form.elements.fullName.value = '';
    }

    if (form.elements.phone) {
        form.elements.phone.value = '';
    }

    if (form.elements.department) {
        form.elements.department.value = '';
    }

    if (form.elements.rollNo) {
        form.elements.rollNo.value = '';
    }

    modal.classList.add('open');

    renderMode();
}

function closeAuth() {
    $('#modal')?.classList.remove('open');
}

function renderMode() {
    const registration = mode === 'register';

    $('#nameWrap')?.classList.toggle('hide', !registration);
    $('#deptWrap')?.classList.toggle('hide', !registration);
    $('#rollWrap')?.classList.toggle('hide', !registration);
    $('#roleWrap')?.classList.toggle('hide', registration);

    $('#loginTab')?.classList.toggle('active', !registration);
    $('#regTab')?.classList.toggle('active', registration);

    const password = $('#authForm')?.elements.password;

    if (password) {
        password.autocomplete = registration
            ? 'new-password'
            : 'current-password';
    }

    const submitButton = $('#authForm')?.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.textContent = registration
            ? 'Create account'
            : 'Continue ↗';
    }

    if ($('#sub')) {
        $('#sub').textContent = registration
            ? 'Create your student profile'
            : 'Welcome to your campus portal';
    }

    if ($('#msg')) {
        $('#msg').textContent = '';
    }
}

/* =========================================================
   4. AUTHENTICATION FORM
   ========================================================= */

async function handleAuth(event) {
    event.preventDefault();

    const form = event.target;

    if (!(form instanceof HTMLFormElement) || form.id !== 'authForm') {
        return;
    }

    const fields = new FormData(form);
    const message = $('#msg');

    const submitButton = form.querySelector(
        'button[type="submit"]'
    );

    function showMessage(text) {
        if (message) {
            message.textContent = text;
        }
    }

    function resetButton() {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent =
                mode === 'register'
                    ? 'Create account'
                    : 'Continue ↗';
        }
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Please wait...';
    }

    showMessage('Connecting to server...');

    try {
        let body;
        let endpoint;

        if (mode === 'register') {
            body = {
                fullName: String(fields.get('fullName') || '').trim(),
                phone: String(fields.get('phone') || '').trim(),
                password: String(fields.get('password') || ''),
                department: String(fields.get('department') || ''),
                rollNo: String(fields.get('rollNo') || '')
                    .trim()
                    .toUpperCase()
            };

            endpoint = '/auth/register';

            if (
                !body.fullName ||
                !body.phone ||
                !body.password ||
                !body.department ||
                !body.rollNo
            ) {
                throw new Error(
                    'Please complete all registration fields.'
                );
            }

            if (!/^\d{2}[A-Z]{3}\d{3}$/.test(body.rollNo)) {
                throw new Error(
                    'Enter roll number in format 12ABC123.'
                );
            }

            if (body.password.length < 10) {
                throw new Error(
                    'Password must contain at least 10 characters.'
                );
            }

        } else {
            body = {
                phone: String(fields.get('phone') || '').trim(),
                password: String(fields.get('password') || ''),
                role: String(fields.get('role') || 'student')
            };

            endpoint = '/auth/login';

            if (
                !body.phone ||
                !body.password ||
                !['student', 'admin'].includes(body.role)
            ) {
                throw new Error('Enter valid login details.');
            }
        }

        const data = await api(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!data.token || !data.user) {
            throw new Error(
                'Invalid server response. Check your backend.'
            );
        }

        token = data.token;
        user = data.user;

        localStorage.setItem('ruiks_token', token);

        showMessage('Login successful.');

        closeAuth();
        dashboard();

    } catch (error) {
        showMessage(error.message || 'Authentication failed.');

    } finally {
        resetButton();
    }
}

/* =========================================================
   5. SESSION RESTORATION
   ========================================================= */

async function restoreSession() {
    if (!token) return;

    try {
        const data = await api('/auth/me');

        if (!data.user) {
            throw new Error('Session unavailable.');
        }

        user = data.user;
        dashboard();

    } catch (error) {
        clearSession();
        console.warn('Session restoration failed:', error.message);
    }
}

/* =========================================================
   6. LOGOUT
   ========================================================= */

function clearSession() {
    token = '';
    user = null;

    localStorage.removeItem('ruiks_token');
}

function logout() {
    clearSession();
    stopExamTimer();

    activeExamId = null;
    submitting = false;
    chosen = {};

    $('#dashboard')?.classList.add('hide');

    closeAuth();

    document.body.classList.remove('nav-open');

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function stopExamTimer() {
    if (examTimer) {
        clearInterval(examTimer);
        examTimer = null;
    }

    document.removeEventListener(
        'visibilitychange',
        examVisibilityWarning
    );
}

/* =========================================================
   7. DASHBOARD
   ========================================================= */

function dashboard() {
    if (!user) return;

    $('#dashboard')?.classList.remove('hide');

    const welcome = $('#welcome');
    const role = $('#role');

    if (welcome) {
        welcome.textContent =
            'Welcome, ' + (user.full_name || 'Ravenshawian');
    }

    if (role) {
        role.textContent =
            String(user.role || 'student').toUpperCase() + ' SPACE';
    }

    const items = user.role === 'admin'
        ? [
            'Overview',
            'Publish media',
            'Create exam',
            'Live results',
            'Search profiles'
        ]
        : [
            'Overview',
            'Photo gallery',
            'Video feed',
            'Notices',
            'Examinations',
            'Search profiles',
            'My profile'
        ];

    const nav = $('#nav');

    if (nav) {
        nav.innerHTML = items.map((item, index) => `
            <button
                type="button"
                class="dashnav ${index === 0 ? 'active' : ''}"
                data-action="page"
                data-page="${safe(item)}">
                ${safe(item)}
            </button>
        `).join('');

        nav.insertAdjacentHTML('beforeend', `
            <button
                type="button"
                class="dashnav"
                data-action="logout">
                Logout
            </button>
        `);
    }

    page('Overview');

    $('#dashboard')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

/* =========================================================
   8. DASHBOARD PAGE ROUTER
   ========================================================= */

function page(pageName, element) {
    if (!user) return;

    document.querySelectorAll('.dashnav').forEach(button => {
        button.classList.remove('active');
    });

    if (element) {
        element.classList.add('active');
    } else {
        document.querySelectorAll('.dashnav').forEach(button => {
            if (button.dataset.page === pageName) {
                button.classList.add('active');
            }
        });
    }

    const content = $('#content');

    if (!content) return;

    stopExamTimer();
    content.innerHTML = '';

    if (pageName === 'Overview') {
        content.innerHTML = `
            <div class="tilegrid">
                <div class="tile">
                    <b>1868</b>
                    <small>Legacy</small>
                </div>

                <div class="tile">
                    <b>IKS</b>
                    <small>Knowledge traditions</small>
                </div>

                <div class="tile">
                    <b>${safe(user.role)}</b>
                    <small>Portal access</small>
                </div>
            </div>

            <div class="panel">
                <h3>
                    ${user.role === 'admin'
                        ? 'Administration centre'
                        : 'Your Ravenshaw space'}
                </h3>

                <p>
                    ${user.role === 'admin'
                        ? 'Publish updates, manage media and schedule MCQ examinations.'
                        : 'Explore campus media, notices, student profiles and examinations.'}
                </p>
            </div>
        `;
    }

    else if (pageName === 'Search profiles') {
        content.innerHTML = `
            <div class="panel">
                <h3>Find a Ravenshaw profile</h3>

                <input
                    class="input"
                    id="query"
                    placeholder="Name or roll number"
                    maxlength="80">

                <button
                    type="button"
                    class="action"
                    data-action="searchProfiles">
                    Search
                </button>

                <div id="results"></div>
            </div>
        `;
    }

    else if (
        pageName === 'Publish media' &&
        user.role === 'admin'
    ) {
        content.innerHTML = `
            <div class="panel">
                <h3>Publish to student portal</h3>

                <form id="postForm">

                    <input
                        class="input"
                        name="title"
                        placeholder="Title"
                        maxlength="200"
                        required>

                    <textarea
                        class="input"
                        name="body"
                        placeholder="Description or notice details"
                        maxlength="5000"></textarea>

                    <select class="input" name="kind" required>
                        <option value="photo">Photo</option>
                        <option value="video">Video</option>
                        <option value="notice">Notice</option>
                        <option value="pdf">PDF</option>
                    </select>

                    <input
                        class="input"
                        type="file"
                        name="file"
                        accept="image/*,video/*,.pdf">

                    <button class="action" type="submit">
                        Publish
                    </button>

                </form>

                <p id="status"></p>
            </div>
        `;
    }

    else if (
        pageName === 'Photo gallery' &&
        user.role === 'student'
    ) {
        feed('photo');
    }

    else if (
        pageName === 'Video feed' &&
        user.role === 'student'
    ) {
        feed('video');
    }

    else if (
        pageName === 'Notices' &&
        user.role === 'student'
    ) {
        feed('notice');
    }

    else if (
        pageName === 'Create exam' &&
        user.role === 'admin'
    ) {
        content.innerHTML = `
            <div class="panel">
                <h3>Examination builder</h3>

                <form id="examForm">

                    <input
                        class="input"
                        name="title"
                        placeholder="Exam title"
                        maxlength="200"
                        required>

                    <textarea
                        class="input"
                        name="instructions"
                        placeholder="Instructions"
                        maxlength="5000"></textarea>

                    <label>
                        Start
                        <input
                            class="input"
                            name="startsAt"
                            type="datetime-local"
                            required>
                    </label>

                    <label>
                        End
                        <input
                            class="input"
                            name="endsAt"
                            type="datetime-local"
                            required>
                    </label>

                    <label>Duration in minutes</label>

                    <input
                        class="input"
                        name="durationMinutes"
                        type="number"
                        min="1"
                        max="600"
                        required>

                    <label>Marks for correct answer</label>

                    <input
                        class="input"
                        name="marksCorrect"
                        type="number"
                        step="0.25"
                        value="1"
                        required>

                    <label>Marks for wrong answer</label>

                    <input
                        class="input"
                        name="marksWrong"
                        type="number"
                        step="0.25"
                        value="0"
                        required>

                    <div id="questions"></div>

                    <button
                        type="button"
                        class="action"
                        data-action="addQuestion">
                        Add MCQ
                    </button>

                    <button class="action" type="submit">
                        Save and publish
                    </button>

                </form>

                <p id="examStatus"></p>
            </div>
        `;

        qnum = 0;
        addQ();
    }

    else if (
        pageName === 'Examinations' ||
        pageName === 'Live results'
    ) {
        exams();
    }

    else if (
        pageName === 'My profile' &&
        user.role === 'student'
    ) {
        content.innerHTML = `
            <div class="panel">
                <h3>Student profile</h3>

                <p>
                    ${safe(user.full_name)}
                    · ${safe(user.department || '')}
                    · ${safe(user.roll_no || '')}
                </p>

                ${user.avatar_url
                    ? `
                        <img
                            src="${safe(user.avatar_url)}"
                            alt="Profile photo"
                            style="width:110px;height:110px;object-fit:cover;border-radius:50%">
                    `
                    : ''}

                <input
                    class="input"
                    type="file"
                    id="avatar"
                    accept="image/*">

                <button
                    type="button"
                    class="action"
                    data-action="avatar">
                    Upload profile photo
                </button>

                <p id="avatarStatus"></p>
            </div>
        `;
    }
}

/* =========================================================
   9. GLOBAL CLICK HANDLER
   ========================================================= */

async function handleDocumentClick(event) {
    const button = event.target.closest('[data-action]');

    if (!button) return;

    const action = button.dataset.action;
    const id = Number(button.dataset.id);

    switch (action) {
        case 'page':
            page(button.dataset.page, button);
            break;

        case 'searchProfiles':
            await searchProfiles();
            break;

        case 'addQuestion':
            addQ();
            break;

        case 'like':
            await like(id);
            break;

        case 'comments':
            await comments(id);
            break;

        case 'comment':
            await comment(id);
            break;

        case 'start':
            await start(id);
            break;

        case 'submitExam':
            await submit(id);
            break;

        case 'leader':
            await leader(id);
            break;

        case 'avatar':
            await avatar();
            break;

        case 'logout':
            logout();
            break;
    }
}

/* =========================================================
   10. GLOBAL FORM HANDLER
   IMPORTANT: event.target is the submitted form.
   event.currentTarget would be document here.
   ========================================================= */

async function handleDocumentSubmit(event) {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
        return;
    }

    if (form.id === 'postForm') {
        await publish(event);
    }

    else if (form.id === 'examForm') {
        await createExam(event);
    }
}

/* =========================================================
   11. PROFILE SEARCH
   ========================================================= */

async function searchProfiles() {
    const results = $('#results');
    const query = $('#query');

    if (!results || !query) return;

    results.textContent = 'Searching...';

    try {
        const profiles = await api(
            '/profiles?q=' + encodeURIComponent(query.value)
        );

        if (!Array.isArray(profiles)) {
            throw new Error('Unexpected profile response.');
        }

        results.innerHTML = profiles.map(profile => `
            <div class="feed">
                <b>${safe(profile.full_name)}</b>

                <p>
                    ${safe(profile.role)}
                    · ${safe(profile.department || '')}
                    · ${safe(profile.roll_no || '')}
                </p>
            </div>
        `).join('') || 'No profiles found.';

    } catch (error) {
        results.textContent = error.message;
    }
}

/* =========================================================
   12. ADMIN MEDIA PUBLISHING
   FIXED: event.target is the actual postForm.
   ========================================================= */

async function publish(event) {
    event.preventDefault();

    const form = event.target;

    if (
        !(form instanceof HTMLFormElement) ||
        form.id !== 'postForm'
    ) {
        console.error('Post upload form not found.');
        return;
    }

    const status = $('#status');

    const button = form.querySelector(
        'button[type="submit"]'
    );

    if (!status) {
        console.error('Upload status element not found.');
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Uploading...';
    }

    status.textContent = 'Uploading media...';

    try {
        // The form is now the actual HTMLFormElement.
        const formData = new FormData(form);

        const data = await api('/posts', {
            method: 'POST',
            body: formData
        });

        status.textContent =
            'Published successfully. Post ID: ' + data.id;

        form.reset();

    } catch (error) {
        status.textContent = error.message;
        console.error('Publish error:', error);

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Publish';
        }
    }
}

/* =========================================================
   13. STUDENT MEDIA FEED
   ========================================================= */

async function feed(kind) {
    const content = $('#content');

    if (!content) return;

    content.innerHTML =
        '<div class="panel">Loading posts...</div>';

    try {
        const posts = await api(
            '/posts?kind=' + encodeURIComponent(kind)
        );

        if (!Array.isArray(posts)) {
            throw new Error('Unexpected posts response.');
        }

        if (!posts.length) {
            content.innerHTML =
                '<div class="panel">No posts available yet.</div>';
            return;
        }

        content.innerHTML = posts.map(post => {
            const id = Number(post.id);
            const mediaUrl = safe(post.media_url || '');
            let media = '';

            if (post.media_url && kind === 'video') {
                media = `
                    <video
                        controls
                        playsinline
                        preload="metadata"
                        src="${mediaUrl}"
                        style="width:100%;max-height:500px">
                    </video>
                `;
            }

            else if (post.media_url && kind === 'photo') {
                media = `
                    <img
                        src="${mediaUrl}"
                        alt="${safe(post.title)}"
                        loading="lazy"
                        style="width:100%;max-height:500px;object-fit:contain">
                `;
            }

            else if (post.media_url && kind === 'notice') {
                media = `
                    <p>
                        <a
                            href="${mediaUrl}"
                            target="_blank"
                            rel="noopener noreferrer">
                            Open attachment
                        </a>
                    </p>
                `;
            }

            return `
                <article class="feed">
                    <h3>${safe(post.title)}</h3>

                    <small>
                        Published by ${safe(post.author)}
                    </small>

                    <p>${safe(post.body || '')}</p>

                    ${media}

                    <button
                        type="button"
                        class="action"
                        data-action="like"
                        data-id="${id}">
                        ♡ ${Number(post.likes) || 0} Like
                    </button>

                    <button
                        type="button"
                        class="action"
                        data-action="comments"
                        data-id="${id}">
                        Comments ${Number(post.comments) || 0}
                    </button>

                    <div id="c${id}"></div>
                </article>
            `;
        }).join('');

    } catch (error) {
        content.innerHTML = `
            <div class="panel">${safe(error.message)}</div>
        `;
    }
}

/* =========================================================
   14. LIKE POSTS
   ========================================================= */

async function like(id) {
    try {
        await api('/posts/' + id + '/like', {
            method: 'POST'
        });

        alert('Post liked successfully.');

    } catch (error) {
        alert(error.message);
    }
}

/* =========================================================
   15. LOAD COMMENTS
   ========================================================= */

async function comments(id) {
    const container = $('#c' + id);

    if (!container) return;

    container.textContent = 'Loading comments...';

    try {
        const data = await api(
            '/posts/' + id + '/comments'
        );

        if (!Array.isArray(data)) {
            throw new Error('Unexpected comments response.');
        }

        container.innerHTML = `
            <div class="comment-list">

                ${data.map(item => `
                    <p>
                        <b>${safe(item.full_name)}:</b>
                        ${safe(item.comment_text)}
                    </p>
                `).join('')}

                ${data.length ? '' : '<p>No comments yet.</p>'}

            </div>

            <input
                class="input"
                id="comment${id}"
                maxlength="1200"
                placeholder="Write a comment">

            <button
                type="button"
                class="action"
                data-action="comment"
                data-id="${id}">
                Send
            </button>

            <p id="commentStatus${id}"></p>
        `;

    } catch (error) {
        container.textContent = error.message;
    }
}

/* =========================================================
   16. ADD COMMENT
   ========================================================= */

async function comment(id) {
    const input = $('#comment' + id);
    const status = $('#commentStatus' + id);

    if (!input || !input.value.trim()) {
        if (status) {
            status.textContent = 'Write a comment first.';
        }
        return;
    }

    try {
        await api('/posts/' + id + '/comments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                comment: input.value.trim()
            })
        });

        await comments(id);

    } catch (error) {
        if (status) {
            status.textContent = error.message;
        }
    }
}

/* =========================================================
   17. ADD MCQ
   ========================================================= */

function addQ() {
    const questions = $('#questions');

    if (!questions) return;

    const number = ++qnum;

    questions.insertAdjacentHTML('beforeend', `
        <div class="feed" id="question${number}">

            <b>Question ${number}</b>

            <input
                class="input"
                name="q${number}question"
                placeholder="Enter question"
                maxlength="2000"
                required>

            ${['A', 'B', 'C', 'D'].map(option => `
                <input
                    class="input"
                    name="q${number}${option}"
                    placeholder="Option ${option}"
                    maxlength="1000"
                    required>
            `).join('')}

            <label>Correct answer</label>

            <select
                class="input"
                name="q${number}answer">

                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>

            </select>

        </div>
    `);
}

/* =========================================================
   18. CREATE AND PUBLISH EXAM
   FIXED: event.target is the actual examForm.
   ========================================================= */

async function createExam(event) {
    event.preventDefault();

    const form = event.target;

    if (
        !(form instanceof HTMLFormElement) ||
        form.id !== 'examForm'
    ) {
        console.error('Exam form not found.');
        return;
    }

    const fields = new FormData(form);
    const status = $('#examStatus');

    const button = form.querySelector(
        'button[type="submit"]'
    );

    if (!status) return;

    const questions = [];

    for (let number = 1; number <= qnum; number++) {
        const question = fields.get(
            'q' + number + 'question'
        );

        if (!question) continue;

        questions.push({
            question: String(question).trim(),

            A: String(
                fields.get('q' + number + 'A') || ''
            ).trim(),

            B: String(
                fields.get('q' + number + 'B') || ''
            ).trim(),

            C: String(
                fields.get('q' + number + 'C') || ''
            ).trim(),

            D: String(
                fields.get('q' + number + 'D') || ''
            ).trim(),

            answer: String(
                fields.get('q' + number + 'answer') || ''
            )
        });
    }

    const startsAt = fields.get('startsAt');
    const endsAt = fields.get('endsAt');

    if (
        !startsAt ||
        !endsAt ||
        new Date(endsAt) <= new Date(startsAt)
    ) {
        status.textContent =
            'The exam end time must be later than the start time.';
        return;
    }

    if (!questions.length) {
        status.textContent = 'Add at least one question.';
        return;
    }

    const body = {
        title: String(fields.get('title') || '').trim(),

        instructions: String(
            fields.get('instructions') || ''
        ).trim(),

        startsAt,
        endsAt,

        durationMinutes: Number(
            fields.get('durationMinutes')
        ),

        marksCorrect: Number(
            fields.get('marksCorrect')
        ),

        marksWrong: Number(
            fields.get('marksWrong')
        ),

        questions
    };

    if (
        !body.title ||
        !Number.isFinite(body.durationMinutes) ||
        body.durationMinutes < 1
    ) {
        status.textContent = 'Enter valid exam details.';
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Publishing...';
    }

    status.textContent = 'Creating examination...';

    try {
        const result = await api('/exams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        status.textContent =
            'Exam published successfully. Exam ID: ' + result.id;

        form.reset();

        $('#questions').innerHTML = '';

        qnum = 0;
        addQ();

    } catch (error) {
        status.textContent = error.message;
        console.error('Exam creation error:', error);

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = 'Save and publish';
        }
    }
}

/* =========================================================
   19. LOAD EXAMINATIONS / RESULTS
   ========================================================= */

async function exams() {
    const content = $('#content');

    if (!content) return;

    content.innerHTML =
        '<div class="panel">Loading examinations...</div>';

    try {
        const data = await api('/exams');

        if (!Array.isArray(data)) {
            throw new Error('Unexpected examination response.');
        }

        if (!data.length) {
            content.innerHTML =
                '<div class="panel">No examinations published yet.</div>';
            return;
        }

        content.innerHTML = data.map(exam => {
            const id = Number(exam.id);

            const startDate = new Date(exam.starts_at);
            const endDate = new Date(exam.ends_at);

            return `
                <div class="feed">

                    <h3>${safe(exam.title)}</h3>

                    <p>${safe(exam.instructions || '')}</p>

                    <p>
                        Start: ${safe(
                            Number.isNaN(startDate.getTime())
                                ? exam.starts_at
                                : startDate.toLocaleString()
                        )}
                    </p>

                    <p>
                        End: ${safe(
                            Number.isNaN(endDate.getTime())
                                ? exam.ends_at
                                : endDate.toLocaleString()
                        )}
                    </p>

                    <p>
                        Duration:
                        ${Number(exam.duration_minutes)} minutes
                    </p>

                    <p>
                        Status: ${safe(exam.status)}
                    </p>

                    ${user.role === 'student'
                        ? `
                            <button
                                type="button"
                                class="action"
                                data-action="start"
                                data-id="${id}">
                                Start exam
                            </button>
                        `
                        : `
                            <button
                                type="button"
                                class="action"
                                data-action="leader"
                                data-id="${id}">
                                View results
                            </button>
                        `
                    }

                    <div id="leader${id}"></div>

                </div>
            `;
        }).join('');

    } catch (error) {
        content.innerHTML = `
            <div class="panel">${safe(error.message)}</div>
        `;
    }
}

/* =========================================================
   20. EXAM LEADERBOARD
   ========================================================= */

async function leader(id) {
    const container = $('#leader' + id);

    if (!container) return;

    container.textContent = 'Loading results...';

    try {
        const data = await api(
            '/exams/' + id + '/leaderboard'
        );

        if (!Array.isArray(data)) {
            throw new Error('Unexpected leaderboard response.');
        }

        container.innerHTML = data.map(result => `
            <div class="feed">

                <b>
                    #${Number(result.rank)}
                    ${safe(result.full_name)}
                </b>

                <p>
                    ${safe(result.department || '')}
                    · ${safe(result.roll_no || '')}
                </p>

                <p>
                    Score: ${Number(result.score)} marks
                </p>

            </div>
        `).join('') || '<p>No submitted results yet.</p>';

    } catch (error) {
        container.textContent = error.message;
    }
}

/* =========================================================
   21. START EXAM
   ========================================================= */

async function start(id) {
    if (user?.role !== 'student') {
        alert('Only students can start examinations.');
        return;
    }

    stopExamTimer();

    submitting = false;
    chosen = {};
    activeExamId = Number(id);

    try {
        const data = await api(
            '/exams/' + id + '/start',
            {
                method: 'POST'
            }
        );

        if (
            !Array.isArray(data.questions) ||
            !data.deadline
        ) {
            throw new Error('Invalid examination response.');
        }

        const content = $('#content');

        if (!content) {
            activeExamId = null;
            return;
        }

        content.innerHTML = `
            <div class="panel">

                <h3>Examination in progress</h3>

                <b id="timer">Preparing timer...</b>

                <p>
                    Please complete the examination before time expires.
                </p>

                <div id="examQ"></div>

                <button
                    type="button"
                    class="action"
                    id="submitExamButton"
                    data-action="submitExam"
                    data-id="${Number(id)}">
                    Submit examination
                </button>

                <p id="examSubmitStatus"></p>

            </div>
        `;

        $('#examQ').innerHTML = data.questions.map(
            (question, index) => `
                <div class="feed">

                    <b>
                        Q${index + 1}. ${safe(question.question)}
                    </b>

                    ${['A', 'B', 'C', 'D'].map(option => `
                        <label style="display:block;margin:8px">

                            <input
                                type="radio"
                                name="q${Number(question.id)}"
                                value="${option}">

                            ${option}. ${safe(question[option])}

                        </label>
                    `).join('')}

                </div>
            `
        ).join('');

        const deadline = new Date(data.deadline).getTime();

        if (!Number.isFinite(deadline)) {
            throw new Error('Invalid examination deadline.');
        }

        function updateTimer() {
            const timer = $('#timer');

            if (!timer) {
                stopExamTimer();
                return;
            }

            const remaining = Math.max(
                0,
                Math.floor((deadline - Date.now()) / 1000)
            );

            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;

            timer.textContent =
                'Time remaining: ' +
                minutes + ':' +
                String(seconds).padStart(2, '0');

            if (remaining <= 0) {
                stopExamTimer();
                submit(Number(id));
            }
        }

        updateTimer();

        examTimer = setInterval(updateTimer, 1000);

        document.addEventListener(
            'visibilitychange',
            examVisibilityWarning
        );

    } catch (error) {
        activeExamId = null;
        alert(error.message);
    }
}

function examVisibilityWarning() {
    if (
        document.hidden &&
        activeExamId !== null &&
        !submitting
    ) {
        alert(
            'Tab change detected. Please return to your examination.'
        );
    }
}

/* =========================================================
   22. SUBMIT EXAM
   ========================================================= */

async function submit(id) {
    if (submitting) return;

    if (
        activeExamId !== null &&
        Number(id) !== activeExamId
    ) {
        return;
    }

    submitting = true;

    stopExamTimer();

    const button = $('#submitExamButton');
    const status = $('#examSubmitStatus');

    if (button) {
        button.disabled = true;
        button.textContent = 'Submitting...';
    }

    if (status) {
        status.textContent = 'Submitting your answers...';
    }

    try {
        const result = await api(
            '/exams/' + id + '/submit',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answers: chosen
                })
            }
        );

        activeExamId = null;

        const content = $('#content');

        if (content) {
            content.innerHTML = `
                <div class="panel">

                    <h3>Examination submitted</h3>

                    <p>
                        Your score:
                        <b>${Number(result.score)} marks</b>
                    </p>

                    <p>
                        Status: ${safe(result.status)}
                    </p>

                </div>
            `;
        }

    } catch (error) {
        submitting = false;

        if (button) {
            button.disabled = false;
            button.textContent = 'Submit examination';
        }

        if (status) {
            status.textContent = error.message;
        }

        alert(error.message);
    }
}

/* =========================================================
   23. PROFILE PHOTO UPLOAD
   ========================================================= */

async function avatar() {
    const input = $('#avatar');
    const status = $('#avatarStatus');

    if (!input || !input.files.length) {
        if (status) {
            status.textContent = 'Choose a profile photo first.';
        }
        return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
        status.textContent = 'Please choose an image file.';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        status.textContent =
            'Image must be smaller than 10 MB.';
        return;
    }

    const form = new FormData();

    form.append('file', file);

    status.textContent = 'Uploading profile photo...';

    try {
        const data = await api('/profile/avatar', {
            method: 'POST',
            body: form
        });

        user.avatar_url = data.avatarUrl;

        status.textContent =
            'Profile photo updated successfully.';

        page('My profile');

    } catch (error) {
        status.textContent = error.message;
    }
}

/* =========================================================
   24. SAFE HTML OUTPUT
   ========================================================= */

function safe(value) {
    return String(value ?? '').replace(
        /[&<>"']/g,
        character => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]
    );
}

/* =========================================================
   25. START APPLICATION
   ========================================================= */

if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        initialize,
        { once: true }
    );
} else {
    initialize();
}
