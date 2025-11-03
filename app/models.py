# app/models.py

from fastapi_users.db import SQLAlchemyBaseUserTableUUID

# from sqlalchemy.orm import Mapped  <--- DELETE THIS LINE
from .database import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    pass
