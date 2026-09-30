from fastapi import FastAPI

from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.employee_routes import router as employee_router


app = FastAPI()


@app.get("/")
def root():

    return {
        "message": "Employee Management API is running!"
    }


app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(employee_router)