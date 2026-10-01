from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth_routes import router as auth_router
from routes.user_routes import router as user_router
from routes.admin_routes import router as admin_router
from routes.employee_routes import router as employee_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():

    return {
        "message": "Employee Management API is running!"
    }

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(admin_router)
app.include_router(employee_router)