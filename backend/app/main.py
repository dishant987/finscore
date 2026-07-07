from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.core.database import init_db
from app.models import *  # noqa: F401, F403
from app.routers import routers


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def request_validation_handler(_request: Request, exc: RequestValidationError):
    errors = exc.errors()
    friendly = []
    for e in errors:
        field = " → ".join(str(loc) for loc in e.get("loc", []) if loc not in ("body", "query", "path"))
        msg = e.get("msg", "Invalid value")
        if e.get("type") == "value_error":
            msg = str(e.get("ctx", {}).get("error", msg))
        friendly.append({"field": field, "message": msg})
    return JSONResponse(status_code=422, content={"detail": friendly})


@app.exception_handler(ValidationError)
async def validation_exception_handler(_request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(include_input=False, include_url=False)},
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(_request: Request, exc: IntegrityError):
    msg = str(exc.orig)
    if "unique" in msg.lower() or "duplicate" in msg.lower():
        return JSONResponse(
            status_code=409,
            content={"detail": "Resource already exists"},
        )
    return JSONResponse(
        status_code=400,
        content={"detail": "Database constraint violation"},
    )


@app.exception_handler(Exception)
async def general_exception_handler(_request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


for router in routers:
    app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
