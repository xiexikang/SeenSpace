from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.project import ProjectMetadataRequest, ProjectRecord, UpdateProjectCanvasRequest
from app.services.project_service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project_metadata,
    update_project_canvas,
)


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRecord])
def list_project_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectRecord]:
    return list_projects(db, current_user.id)


@router.get("/{project_id}", response_model=ProjectRecord)
def get_project_record(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRecord:
    project = get_project(db, current_user.id, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.post("", response_model=ProjectRecord)
def create_project_record(
    request: ProjectMetadataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRecord:
    return create_project(db, current_user.id, request.name, request.summary)


@router.patch("/{project_id}", response_model=ProjectRecord)
def update_project_record(
    project_id: str,
    request: ProjectMetadataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRecord:
    project = update_project_metadata(db, current_user.id, project_id, request.name, request.summary)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.patch("/{project_id}/canvas", response_model=ProjectRecord)
def update_project_canvas_record(
    project_id: str,
    request: UpdateProjectCanvasRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectRecord:
    project = update_project_canvas(db, current_user.id, project_id, request.canvas)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project_record(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    deleted = delete_project(db, current_user.id, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found.")
