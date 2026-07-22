from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    cover_image: Mapped[str | None] = mapped_column(
        Text().with_variant(LONGTEXT(), "mysql"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    node_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    initials: Mapped[str] = mapped_column(String(24), nullable=False)
    thumbnail_variant: Mapped[str] = mapped_column(String(24), nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="0")
    canvas_json: Mapped[dict] = mapped_column(JSON, nullable=False)
