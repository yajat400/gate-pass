CREATE TABLE students (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    roll_number VARCHAR(40) NOT NULL UNIQUE,
    qr_token CHAR(36) NOT NULL UNIQUE,
    gate_status ENUM('OUT', 'IN') NOT NULL DEFAULT 'OUT'
);

CREATE TABLE gate_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id INT UNSIGNED NOT NULL,
    movement ENUM('ENTRY', 'EXIT') NOT NULL,
    gate_name VARCHAR(60) NOT NULL DEFAULT 'Main Gate',
    scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gate_logs_student FOREIGN KEY (student_id) REFERENCES students(id)
);

INSERT INTO students (name, roll_number, qr_token) VALUES
('Demo Student One', 'DEMO/0001', 'a347f1c0-9c21-4e16-b836-121c92ce00a1'),
('Demo Student Two', 'DEMO/0002', 'c2b85a6e-1843-4d91-8e30-f93d1e2a007b');
