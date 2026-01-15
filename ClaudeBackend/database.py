import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base

# Detectar entorno: PostgreSQL en produccion, SQLite en desarrollo
POSTGRES_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

if POSTGRES_URL:
    # Produccion: usar PostgreSQL (Supabase, Neon, etc.)
    # Vercel/Neon/Supabase usan postgres:// pero SQLAlchemy necesita postgresql://
    if POSTGRES_URL.startswith("postgres://"):
        POSTGRES_URL = POSTGRES_URL.replace("postgres://", "postgresql://", 1)

    DATABASE_URL = POSTGRES_URL

    # Configuracion del engine para PostgreSQL con pool de conexiones
    engine = create_engine(
        DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,  # Verifica conexiones antes de usarlas
        pool_recycle=300,    # Recicla conexiones cada 5 minutos
    )
    print(f"[Database] Conectado a PostgreSQL")
else:
    # Desarrollo local: usar SQLite
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_DIR = os.path.join(BASE_DIR, "database")

    # Crear carpeta si no existe
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    DATABASE_URL = f"sqlite:///{os.path.join(DB_DIR, 'lafuga.db')}"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    print(f"[Database] Usando SQLite local: {DATABASE_URL}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
