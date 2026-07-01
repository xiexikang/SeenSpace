from datetime import UTC, datetime, timedelta
from html import escape
from random import SystemRandom
from secrets import token_hex, token_urlsafe

import bcrypt
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.user import AuthSession, CaptchaChallenge, User
from app.schemas.auth import AuthResponse, AuthUser, CaptchaResponse


CAPTCHA_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
SESSION_TTL = timedelta(days=7)
CAPTCHA_TTL = timedelta(minutes=5)
random = SystemRandom()


def now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_code(code: str) -> str:
    return bcrypt.hashpw(code.upper().encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_code(code: str, code_hash: str) -> bool:
    return bcrypt.checkpw(code.upper().encode("utf-8"), code_hash.encode("utf-8"))


def to_auth_user(user: User) -> AuthUser:
    return AuthUser(id=user.id, username=user.username, name=user.name)


def render_captcha_svg(code: str) -> str:
    chars = []
    for index, char in enumerate(code):
        x = 22 + index * 23
        y = random.randint(30, 42)
        rotate = random.randint(-12, 12)
        chars.append(
            f'<text x="{x}" y="{y}" transform="rotate({rotate} {x} {y})">{escape(char)}</text>'
        )

    lines = []
    for _ in range(5):
        lines.append(
            f'<line x1="{random.randint(0, 130)}" y1="{random.randint(6, 44)}" '
            f'x2="{random.randint(0, 130)}" y2="{random.randint(6, 44)}" />'
        )

    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="136" height="48" viewBox="0 0 136 48">'
        '<rect width="136" height="48" rx="12" fill="#f3f3f0"/>'
        '<g stroke="rgba(18,24,38,0.18)" stroke-width="1.4">'
        + "".join(lines)
        + "</g>"
        '<g font-family="Georgia, serif" font-size="24" font-weight="700" fill="#121826">'
        + "".join(chars)
        + "</g>"
        "</svg>"
    )


def create_captcha(db: Session) -> CaptchaResponse:
    code = "".join(random.choice(CAPTCHA_ALPHABET) for _ in range(5))
    challenge = CaptchaChallenge(
        id=token_hex(16),
        code_hash=hash_code(code),
        created_at=now_utc(),
        expires_at=now_utc() + CAPTCHA_TTL,
    )
    db.add(challenge)
    db.commit()
    return CaptchaResponse(captchaId=challenge.id, svg=render_captcha_svg(code))


def consume_captcha(db: Session, captcha_id: str, code: str) -> bool:
    challenge = db.get(CaptchaChallenge, captcha_id)
    if challenge is None:
        return False

    db.delete(challenge)
    db.commit()
    if challenge.expires_at < now_utc():
        return False
    return verify_code(code.strip(), challenge.code_hash)


def create_session(db: Session, user: User) -> AuthResponse:
    session = AuthSession(
        token=token_urlsafe(48),
        user_id=user.id,
        created_at=now_utc(),
        expires_at=now_utc() + SESSION_TTL,
    )
    db.add(session)
    db.commit()
    return AuthResponse(token=session.token, user=to_auth_user(user))


def register_user(
    db: Session,
    username: str,
    password: str,
    name: str,
    captcha_id: str,
    captcha_code: str,
) -> AuthResponse:
    if not consume_captcha(db, captcha_id, captcha_code):
        raise ValueError("验证码不正确或已过期。")

    normalized_username = username.strip().lower()
    existing = db.scalar(select(User).where(User.username == normalized_username))
    if existing:
        raise ValueError("该账号已注册。")

    timestamp = now_utc()
    user = User(
        id=token_hex(16),
        username=normalized_username,
        name=name.strip(),
        password_hash=hash_password(password),
        created_at=timestamp,
        updated_at=timestamp,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return create_session(db, user)


def login_user(
    db: Session,
    username: str,
    password: str,
    captcha_id: str,
    captcha_code: str,
) -> AuthResponse:
    if not consume_captcha(db, captcha_id, captcha_code):
        raise ValueError("验证码不正确或已过期。")

    normalized_username = username.strip().lower()
    user = db.scalar(select(User).where(User.username == normalized_username))
    if not user or not verify_password(password, user.password_hash):
        raise ValueError("账号或密码不正确。")
    return create_session(db, user)


def get_user_by_token(db: Session, token: str) -> User | None:
    session = db.get(AuthSession, token)
    if session is None:
        return None

    if session.expires_at < now_utc():
        db.delete(session)
        db.commit()
        return None

    return db.get(User, session.user_id)


def delete_session(db: Session, token: str) -> None:
    session = db.get(AuthSession, token)
    if session:
        db.delete(session)
        db.commit()


def cleanup_expired_auth_records(db: Session) -> None:
    timestamp = now_utc()
    db.execute(delete(AuthSession).where(AuthSession.expires_at < timestamp))
    db.execute(delete(CaptchaChallenge).where(CaptchaChallenge.expires_at < timestamp))
    db.commit()
