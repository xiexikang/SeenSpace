from datetime import UTC, datetime

import bcrypt
from sqlalchemy import inspect, text

from app.core.database import engine


def ensure_demo_user_for_migration() -> None:
    timestamp = datetime.now(UTC).replace(tzinfo=None)
    password_hash = bcrypt.hashpw("seenspace123".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    with engine.begin() as connection:
        if engine.dialect.name == "mysql":
            connection.execute(
                text(
                    """
                    INSERT IGNORE INTO users (id, username, name, password_hash, created_at, updated_at)
                    VALUES ('demo-user', 'demo', '演示用户', :password_hash, :created_at, :updated_at)
                    """
                ),
                {"password_hash": password_hash, "created_at": timestamp, "updated_at": timestamp},
            )
        else:
            connection.execute(
                text(
                    """
                    INSERT OR IGNORE INTO users (id, username, name, password_hash, created_at, updated_at)
                    VALUES ('demo-user', 'demo', '演示用户', :password_hash, :created_at, :updated_at)
                    """
                ),
                {"password_hash": password_hash, "created_at": timestamp, "updated_at": timestamp},
            )


def migrate_users_table() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return

    inspected_columns = inspector.get_columns("users")
    columns = {column["name"] for column in inspected_columns}
    if "username" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(80) NULL"))
            if "email" in columns:
                connection.execute(
                    text("UPDATE users SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL")
                )
            connection.execute(text("UPDATE users SET username = id WHERE username IS NULL OR username = ''"))
            if engine.dialect.name == "mysql":
                connection.execute(text("ALTER TABLE users MODIFY username VARCHAR(80) NOT NULL"))
                connection.execute(text("CREATE UNIQUE INDEX ix_users_username ON users (username)"))

    email_column = next((column for column in inspected_columns if column["name"] == "email"), None)
    if email_column and not email_column["nullable"] and engine.dialect.name == "mysql":
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users MODIFY email VARCHAR(255) NULL"))


def migrate_existing_schema() -> None:
    migrate_users_table()
    inspector = inspect(engine)
    if not inspector.has_table("projects"):
        return

    ensure_demo_user_for_migration()
    columns = {column["name"] for column in inspector.get_columns("projects")}
    if "owner_id" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE projects ADD COLUMN owner_id VARCHAR(64) NULL"))
            connection.execute(text("UPDATE projects SET owner_id = 'demo-user' WHERE owner_id IS NULL"))
            if engine.dialect.name == "mysql":
                connection.execute(text("ALTER TABLE projects MODIFY owner_id VARCHAR(64) NOT NULL"))

    if "cover_image" not in columns:
        cover_column_type = "LONGTEXT" if engine.dialect.name == "mysql" else "TEXT"
        with engine.begin() as connection:
            connection.execute(text(f"ALTER TABLE projects ADD COLUMN cover_image {cover_column_type} NULL"))

    if "is_favorite" not in columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE projects ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT 0"))
