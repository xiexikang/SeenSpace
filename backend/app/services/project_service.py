from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.schemas.project import ProjectRecord
from app.schemas.workspace import WorkspaceSnapshot, create_empty_canvas


def now_utc() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def isoformat(value: datetime) -> str:
    if value.tzinfo:
        value = value.astimezone(UTC).replace(tzinfo=None)
    return f"{value.isoformat()}Z"


def to_project_record(project: Project) -> ProjectRecord:
    return ProjectRecord(
        id=project.id,
        name=project.name,
        summary=project.summary,
        coverImage=project.cover_image,
        updatedAt=isoformat(project.updated_at),
        createdAt=isoformat(project.created_at),
        nodeCount=project.node_count,
        initials=project.initials,
        thumbnailVariant=project.thumbnail_variant,
        canvas=WorkspaceSnapshot.model_validate(project.canvas_json),
    )


def make_initials(name: str) -> str:
    text = name.strip()
    return text[:2] if text else "新"


def list_projects(db: Session, owner_id: str) -> list[ProjectRecord]:
    projects = db.scalars(
        select(Project).where(Project.owner_id == owner_id).order_by(Project.updated_at.desc())
    ).all()
    return [to_project_record(project) for project in projects]


def get_project(db: Session, owner_id: str, project_id: str) -> ProjectRecord | None:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == owner_id))
    return to_project_record(project) if project else None


def create_project(
    db: Session, owner_id: str, name: str, summary: str, cover_image: str
) -> ProjectRecord:
    timestamp = now_utc()
    normalized_name = name.strip()
    normalized_summary = summary.strip()
    project = Project(
        id=uuid4().hex,
        owner_id=owner_id,
        name=normalized_name,
        summary=normalized_summary,
        cover_image=cover_image,
        created_at=timestamp,
        updated_at=timestamp,
        node_count=0,
        initials=make_initials(normalized_name),
        thumbnail_variant="mist",
        canvas_json=create_empty_canvas().model_dump(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return to_project_record(project)


def update_project_metadata(
    db: Session,
    owner_id: str,
    project_id: str,
    name: str,
    summary: str,
    cover_image: str,
) -> ProjectRecord | None:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == owner_id))
    if project is None:
        return None

    normalized_name = name.strip()
    project.name = normalized_name
    project.summary = summary.strip()
    project.cover_image = cover_image
    project.initials = make_initials(normalized_name)
    project.updated_at = now_utc()
    db.commit()
    db.refresh(project)
    return to_project_record(project)


def update_project_canvas(
    db: Session,
    owner_id: str,
    project_id: str,
    canvas: WorkspaceSnapshot,
) -> ProjectRecord | None:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == owner_id))
    if project is None:
        return None

    project.canvas_json = canvas.model_dump()
    project.node_count = len(canvas.nodes)
    project.updated_at = now_utc()
    db.commit()
    db.refresh(project)
    return to_project_record(project)


def delete_project(db: Session, owner_id: str, project_id: str) -> bool:
    project = db.scalar(select(Project).where(Project.id == project_id, Project.owner_id == owner_id))
    if project is None:
        return False

    db.delete(project)
    db.commit()
    return True
