from fastapi import FastAPI,HTTPException ,Depends
from database import client , users_collection
from models.user_model import User
from utils.password import hash_password, verify_password
from schemas.auth import LoginRequest
from utils.jwt import create_access_token
from fastapi import Depends
from utils.auth_dependency import get_current_user
from fastapi.security import OAuth2PasswordRequestForm

app = FastAPI()

@app.get("/")
def root():
    return {
        "message":"Employee Management API is running"
    }

# testing database connection---------

@app.get("/test-db")
def test_database():    
    

    try:
        client.admin.command("ping")

        return {
            "message": "MongoDB Atlas connected successfully!"
        }

    except Exception as e:

        return {
            "message": "MongoDB connection failed",
            "error": str(e)
        }

#posting user data regiser-------------

@app.post("/users")
def create_user(user: User):

    hashed_password = hash_password(user.password)

    user_data = {
        "name" : user.name,
        "email" : user.email,
        "password_hash": hashed_password,
        "role" :user.role
    }

    result = users_collection.insert_one(user_data)

    return {
        "message":"User created successfully",
        "user_id": str(result.inserted_id)
    }


# use to get user --------------
@app.get("/users")
def get_users():
    users = list(users_collection.find())

    for user in users:
       user["_id"] = str(user["_id"])

    return{
        "users" :users
    }


# # testing password ---------------
# @app.get("/test-password")
# def test_password():

#     password = "mypassword123"

#     hashed = hash_password(password)

#     is_correct = verify_password(
#         password,
#         hashed
#     )

#     return {
#         "password":password,
#         "hashed_password":hashed,
#         "password_correct":is_correct
#     }

# use to login-----

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_collection.find_one({
        "email":form_data.username
    })
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    password_correct = verify_password(
        form_data.password,
        user["password_hash"]
        )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    access_token = create_access_token({
        "user_id": str(user["_id"]),
        "role":user["role"]
    })

    return{
        "message": "Login successful",
        "access_token":access_token,
        "token_type" : "bearer",
        "user":{
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }


# Getting usetr role from token ---------

@app.get("/me")
def get_me(current_user=Depends(get_current_user)):

    return {
        "message": "You are authenticated!",
        "user": current_user
    }