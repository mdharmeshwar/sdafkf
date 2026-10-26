import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("windscope.app")

app = FastAPI(
    title="WindScope UK Analytics API",
    description=(
        "Official Elexon BMRS-integrated analytics backend for UK wind generation forecast inspection "
        "and quantitative accuracy evaluation against recorded actual generation for day-ahead procurement."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local dev & Vercel deployment preview domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
async def root():
    return {
        "product": "WindScope UK",
        "description": "Day-Ahead Wind Forecast Analytics for UK Electricity Procurement",
        "supportedPeriod": "1 January 2026 - 31 January 2026",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
