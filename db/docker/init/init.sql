-- This sql is for local development.
CREATE DATABASE IF NOT EXISTS kkb_db;
GRANT CREATE,
    ALTER,
    DROP,
    INDEX,
    INSERT,
    SELECT,
    UPDATE,
    DELETE,
    REFERENCES ON kkb_db.* TO 'username' @'%';
-- If required:
-- GRANT CREATE ON *.* TO 'username'@'%';
FLUSH PRIVILEGES;