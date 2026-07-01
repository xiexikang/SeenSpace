import os
from pathlib import Path


test_db_path = Path("backend/test_seenspace.db")
if test_db_path.exists():
    test_db_path.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path.as_posix()}"
