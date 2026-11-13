
-- ============================================================
-- RAVENSHAW UNIVERSITY - HABITUP DATABASE
-- Run once against your existing TiDB database.
-- ============================================================

CREATE TABLE IF NOT EXISTS habitup_categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    description TEXT NULL,
    cover_url TEXT NULL,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS habitup_activities (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NULL,
    media_url TEXT NULL,
    media_type ENUM('image','video','pdf','text','none') NOT NULL DEFAULT 'none',
    visibility ENUM('public','members') NOT NULL DEFAULT 'public',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_habitup_category (category_id, created_at),
    INDEX idx_habitup_user (user_id, created_at),
    CONSTRAINT fk_habitup_activity_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_habitup_activity_category
        FOREIGN KEY (category_id) REFERENCES habitup_categories(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS habitup_likes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    activity_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_habitup_like (activity_id, user_id),
    INDEX idx_habitup_like_user (user_id),
    CONSTRAINT fk_habitup_like_activity
        FOREIGN KEY (activity_id) REFERENCES habitup_activities(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_habitup_like_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- All 15 categories are created automatically.
INSERT IGNORE INTO habitup_categories
(slug, title, description, display_order)
VALUES
('daily-exercises', 'Daily Exercises',
 'Daily movement and exercise activities.', 1),

('yoga', 'Yoga',
 'Yoga postures, routines and learning resources.', 2),

('pranayama', 'Pranayama',
 'Pranayama practices and breathing routines.', 3),

('mindful-meditation', 'Mindful Meditation',
 'Mindfulness and meditation activities.', 4),

('breathing-exercises', 'Breathing Exercises',
 'Guided breathing exercises and resources.', 5),

('chakra-healing', 'Chakra Healing',
 'Chakra traditions, reflections and related practices.', 6),

('overcoming-limerence', 'Overcoming Limerence',
 'Educational resources about attachment, rumination and emotional wellbeing.', 7),

('rewire-your-brain', 'Rewire Your Brain',
 'Learning resources about habits, attention and neuroplasticity.', 8),

('engite', 'Engite',
 'HabitUp category and resources.', 9),

('self-hypnosis', 'Self-Hypnosis',
 'Self-hypnosis education and guided resources.', 10),

('eft', 'EFT - Emotional Freedom Technique',
 'Educational resources about Emotional Freedom Technique.', 11),

('trauma-release', 'Trauma Release',
 'Trauma-informed wellbeing resources and educational material.', 12),

('chants', 'Chants',
 'Chants, recitations and audio resources.', 13),

('hypnosis-subconscious-training',
 'Hypnosis / Subconscious Training and Reprogramming',
 'Educational resources and guided learning.', 14),

('mantra-magnetism',
 'Mantra Magnetism (Bio-Magnetic Field)',
 'Mantra traditions and related cultural and wellness resources.', 15);
