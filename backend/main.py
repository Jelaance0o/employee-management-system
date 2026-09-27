from fastapi import FastAPI,HTTPException
from database import client , users_collection
from models.user_model import User
from utils.password import hash_password, verify_password
from schemas.auth import LoginRequest

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

@app.post("/login")
def login(data:LoginRequest):
    user = users_collection.find_one({
        "email":data.email
    })
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    password_correct = verify_password(
        data.password,
        user["password_hash"]
        )

    if not password_correct:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    return{
        "message": "Login successful",
        "user":{
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }