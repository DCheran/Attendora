-- Attendora backend migration for the final UI.
-- Run this against the existing eventiqa_attendance database.

CREATE TABLE IF NOT EXISTS master_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add the coordinator name only when the column does not already exist.
SET @faculty_name_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'attendance'
      AND COLUMN_NAME = 'faculty_name'
);

SET @faculty_name_sql = IF(
    @faculty_name_exists = 0,
    'ALTER TABLE attendance ADD COLUMN faculty_name VARCHAR(150) NULL AFTER faculty_email',
    'SELECT 1'
);

PREPARE stmt FROM @faculty_name_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS attendance_corrections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    current_status ENUM('PRESENT','ABSENT') NOT NULL,
    reason VARCHAR(1000) NOT NULL,
    supporting_document VARCHAR(500) NULL,
    status ENUM('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
    reviewed_by VARCHAR(150) NULL,
    review_remarks VARCHAR(1000) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_correction_student
        FOREIGN KEY (student_id) REFERENCES students(id)
        ON DELETE CASCADE,
    INDEX idx_correction_student_date (student_id, attendance_date),
    INDEX idx_correction_status (status)
);
