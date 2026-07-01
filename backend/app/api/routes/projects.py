from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.project import ProjectRecord, UpdateProjectCanvasRequest
from app.services.project_service import (
    create_project,
    get_project,
    list_projects,
    update_project_canvas,
)


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRecord])
def list_project_records(db: Session = Depends(get_db)) -> list[ProjectRecord]:
    return list_projects(db)


@router.get("/{project_id}", response_model=ProjectRecord)
def get_project_record(project_id: str, db: Session = Depends(get_db)) -> ProjectRecord:
    project = get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project


@router.post("", response_model=ProjectRecord)
def create_project_record(db: Session = Depends(get_db)) -> ProjectRecord:
    return create_project(db)


@router.patch("/{project_id}/canvas", response_model=ProjectRecord)
def update_project_canvas_record(
    project_id: str,
    request: UpdateProjectCanvasRequest,
    db: Session = Depends(get_db),
) -> ProjectRecord:
    project = update_project_canvas(db, project_id, request.canvas)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found.")
    return project
