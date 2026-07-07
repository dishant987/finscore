from app.controllers.auth_controller import router as auth_router
from app.controllers.msme_controller import router as msme_router
from app.controllers.score_controller import router as score_router
from app.controllers.dashboard_controller import router as dashboard_router
from app.controllers.integrations_controller import router as integrations_router

routers = [auth_router, msme_router, score_router, dashboard_router, integrations_router]
