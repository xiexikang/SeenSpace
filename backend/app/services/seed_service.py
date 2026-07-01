from datetime import datetime

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.project import Project
from app.models.user import User
from app.schemas.workspace import create_empty_canvas
from app.services.auth_service import hash_password, now_utc


def parse_seed_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


SEEDED_PROJECTS = [
    {
        "id": "brand-identity",
        "name": "品牌识别探索",
        "summary": "桌面应用的情绪板与字体参考。",
        "updated_at": parse_seed_time("2026-05-12T14:20:00Z"),
        "created_at": parse_seed_time("2026-05-10T10:00:00Z"),
        "node_count": 24,
        "initials": "UI SM",
        "thumbnail_variant": "sand",
    },
    {
        "id": "app-ui-components",
        "name": "应用 UI 组件",
        "summary": "用于工作区体验的共享组件库。",
        "updated_at": parse_seed_time("2026-05-11T16:00:00Z"),
        "created_at": parse_seed_time("2026-05-09T09:30:00Z"),
        "node_count": 12,
        "initials": "UI",
        "thumbnail_variant": "steel",
    },
    {
        "id": "personal-knowledge",
        "name": "个人知识笔记",
        "summary": "值得稍后回看的文章、参考资料和零散想法。",
        "updated_at": parse_seed_time("2026-05-09T13:00:00Z"),
        "created_at": parse_seed_time("2026-05-05T08:20:00Z"),
        "node_count": 3,
        "initials": "ME",
        "thumbnail_variant": "mist",
    },
    {
        "id": "product-architecture",
        "name": "产品架构",
        "summary": "梳理系统、模块想法与交互行为。",
        "updated_at": parse_seed_time("2026-05-04T11:00:00Z"),
        "created_at": parse_seed_time("2026-04-28T15:45:00Z"),
        "node_count": 89,
        "initials": "UX AI",
        "thumbnail_variant": "mint",
    },
]

DEMO_USER_ID = "demo-user"
DEMO_USERNAME = "demo"


def ensure_demo_user(db: Session) -> User:
    user = db.get(User, DEMO_USER_ID)
    if user:
        return user

    timestamp = now_utc()
    user = User(
        id=DEMO_USER_ID,
        username=DEMO_USERNAME,
        name="演示用户",
        password_hash=hash_password("seenspace123"),
        created_at=timestamp,
        updated_at=timestamp,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def seed_projects(db: Session) -> None:
    owner = ensure_demo_user(db)
    empty_canvas = create_empty_canvas().model_dump()
    for item in SEEDED_PROJECTS:
        db.add(Project(**item, owner_id=owner.id, canvas_json=empty_canvas))
    db.commit()


def ensure_project_seed() -> None:
    db = SessionLocal()
    try:
        ensure_demo_user(db)
        if db.query(Project).count() == 0:
            seed_projects(db)
    finally:
        db.close()
