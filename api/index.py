# Vercel Serverless Function Entry Point
# Este archivo permite que Vercel importe el app de FastAPI

import sys
import os

# Agregar ClaudeBackend al path para importar los modulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ClaudeBackend'))

# Importar la aplicacion FastAPI
from main import app

# Vercel busca un objeto 'app' o 'handler'
# FastAPI es compatible con ASGI, Vercel lo detecta automaticamente
