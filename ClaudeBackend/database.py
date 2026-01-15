import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Detectar entorno: PostgreSQL en produccion, SQLite en desarrollo
POSTGRES_URL = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")

if POSTGRES_URL:
    # Produccion: usar PostgreSQL
    # Vercel/Neon usan postgres:// pero SQLAlchemy necesita postgresql://
    if POSTGRES_URL.startswith("postgres://"):
        POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

    DATABASE_URL = POSTGRES_URL
    engine = create_engine(DATABASE_URL)
else:
    # Desarrollo local: usar SQLite
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_DIR = os.path.join(BASE_DIR, "database")

    # Crear carpeta si no existe
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'lafuga.db')}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
