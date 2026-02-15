-- This sql is for local development.
CREATE DATABASE IF NOT EXISTS my_db;
GRANT CREATE,
    ALTER,
    DROP,
    INDEX,
    INSERT,
    SELECT,
    UPDATE,
    DELETE,
    REFERENCES ON my_db.* TO 'username' @'%';
-- If required:
-- GRANT CREATE ON *.* TO 'username'@'%';
FLUSH PRIVILEGES;