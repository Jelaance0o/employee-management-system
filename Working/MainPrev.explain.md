# Employee Management API — FastAPI Backend

A clean reference version of the current FastAPI backend, organized by responsibility and with comments explaining what each section does.

---

## 1. Imports

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm

from database import client, users_collection
from models.user_model import User
from utils.password import hash_password, verify_password
from utils.jwt import create_access_token
from utils.auth_dependency import get_current_user
```

### What each import is used for

| Import | Purpose |
|---|---|
| `FastAPI` | Creates the FastAPI application |
| `HTTPException` | Sends HTTP errors such as `401 Unauthorized` |
| `Depends` | Uses FastAPI dependency injection |
| `OAuth2PasswordRequestForm` | Receives OAuth2 login form data (`username` + `password`) |
| `client` | MongoDB client used to test the connection |
| `users_collection` | MongoDB collection containing users |
| `User` | Pydantic model used to validate registration data |
| `hash_password` | Hashes a password before storing it |
| `verify_password` | Compares a login password with the stored hash |
| `create_access_token` | Creates a JWT after successful login |
| `get_current_user` | Extracts and verifies the JWT for protected routes |

---

# 2. Create the FastAPI Application

```python
app = FastAPI()
```

This creates the FastAPI application.

The server will use `app` to register routes such as:

```text
GET  /
GET  /test-db
POST /users
GET  /users
POST /login
GET  /me
```

---

# 3. Root Endpoint

```python
@app.get("/")
def root():
    return {
        "message": "Employee Management API is running"
    }
```

### Purpose

Used to quickly check whether the FastAPI server is running.

Request:

```text
GET /
```

Response:

```json
{
    "message": "Employee Management API is running"
}
```

---

# 4. Test MongoDB Connection

```python
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
```

### Flow

```text
GET /test-db
      ↓
MongoDB ping
      ↓
   Success?
   /     \
 YES      NO
  ↓        ↓
Success   Error
```

`client.admin.command("ping")` sends a simple ping command to MongoDB.

---

# 5. Register a User

```python
@app.post("/users")
def create_user(user: User):

    hashed_password = hash_password(user.password)

    user_data = {
        "name": user.name,
        "email": user.email,
        "password_hash": hashed_password,
        "role": user.role
    }

    result = users_collection.insert_one(user_data)

    return {
        "message": "User created successfully",
        "user_id": str(result.inserted_id)
    }
```

## Registration Flow

```text
Frontend / Swagger
        ↓
POST /users
        ↓
Pydantic validates User
        ↓
Password is received
        ↓
hash_password()
        ↓
Password becomes bcrypt hash
        ↓
Create user_data
        ↓
MongoDB insert_one()
        ↓
User saved
        ↓
Return user_id
```

### Important

The plain password is **not stored**.

Instead:

```text
password
   ↓
bcrypt
   ↓
password_hash
   ↓
MongoDB
```

---

# 6. Get All Users

```python
@app.get("/users")
def get_users():

    users = list(users_collection.find())

    for user in users:
        user["_id"] = str(user["_id"])

    return {
        "users": users
    }
```

### What happens?

MongoDB returns documents containing an `ObjectId`.

Example:

```python
{
    "_id": ObjectId("...")
}
```

FastAPI/JSON cannot directly serialize the MongoDB `ObjectId`, so it is converted:

```python
user["_id"] = str(user["_id"])
```

Now it becomes:

```json
{
    "_id": "68xxxxxxxxxxxx"
}
```

---

# 7. Login Endpoint

```python
@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends()
):
```

This is an important part of the authentication system.

`OAuth2PasswordRequestForm` expects:

```text
username
password
```

In this project, **`username` is actually the user's email**.

So Swagger sends:

```text
username = user@email.com
password = ********
```

and we use:

```python
form_data.username
```

as the email.

---

## Step 1 — Find User

```python
user = users_collection.find_one({
    "email": form_data.username
})
```

MongoDB searches for a user whose email matches the submitted login email.

Conceptually:

```text
Swagger
   ↓
username = user@email.com
   ↓
form_data.username
   ↓
MongoDB
   ↓
find email
```

---

## Step 2 — Check Whether User Exists

```python
if not user:
    raise HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )
```

If no user is found, return:

```text
401 Unauthorized
```

---

## Step 3 — Verify Password

```python
password_correct = verify_password(
    form_data.password,
    user["password_hash"]
)
```

This compares:

```text
Password entered by user
          ↓
      bcrypt check
          ↓
Password hash stored in MongoDB
```

The result is:

```python
True
```

or:

```python
False
```

---

## Step 4 — Reject Wrong Password

```python
if not password_correct:
    raise HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )
```

If the password is wrong:

```text
401 Unauthorized
```

---

## Step 5 — Create JWT

```python
access_token = create_access_token({
    "user_id": str(user["_id"]),
    "role": user["role"]
})
```

After successful authentication, the backend creates a JWT.

The JWT contains information such as:

```text
user_id
role
expiration
```

Conceptually:

```text
Email + Password
       ↓
Password verified
       ↓
Create JWT
       ↓
Send JWT to frontend
```

---

## Step 6 — Return Login Response

```python
return {
    "message": "Login successful",
    "access_token": access_token,
    "token_type": "bearer",
    "user": {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }
}
```

The frontend receives:

```json
{
    "message": "Login successful",
    "access_token": "JWT_TOKEN",
    "token_type": "bearer",
    "user": {
        "id": "123",
        "name": "Jeelance",
        "email": "user@email.com",
        "role": "employee"
    }
}
```

---

# 8. Protected `/me` Endpoint

```python
@app.get("/me")
def get_me(
    current_user=Depends(get_current_user)
):

    return {
        "message": "You are authenticated!",
        "user": current_user
    }
```

This endpoint is protected.

The important part is:

```python
Depends(get_current_user)
```

Before `/me` runs, FastAPI runs:

```text
get_current_user()
```

That dependency checks the JWT.

---

# 9. Authentication Flow

The complete authentication flow is:

```text
                 REGISTER
                    │
                    ▼
             POST /users
                    │
                    ▼
             hash_password()
                    │
                    ▼
                MongoDB
                    │
                    │
                    ▼
                  LOGIN
                    │
                    ▼
              POST /login
                    │
                    ▼
          Find user by email
                    │
                    ▼
          verify_password()
                    │
              ┌─────┴─────┐
              │           │
            Wrong       Correct
              │           │
              ▼           ▼
            401       create JWT
                          │
                          ▼
                   Return JWT
                          │
                          ▼
                     FRONTEND
                          │
                          │
             Authorization: Bearer JWT
                          │
                          ▼
                    GET /me
                          │
                          ▼
                get_current_user()
                          │
                          ▼
                    Verify JWT
                          │
                    ┌─────┴─────┐
                    │           │
                  Valid       Invalid
                    │           │
                    ▼           ▼
                 User data      401
```

---

# 10. Important Authentication Terms

### JWT

A signed token created after successful login.

```text
Login successful
       ↓
     JWT
       ↓
Used for protected requests
```

### Bearer

The authentication scheme used in the HTTP header:

```http
Authorization: Bearer <JWT>
```

### `OAuth2PasswordRequestForm`

Used by the `/login` endpoint to receive:

```text
username
password
```

In this project:

```text
username = email
```

### `OAuth2PasswordBearer`

Used when receiving protected requests.

It extracts the JWT from:

```http
Authorization: Bearer <JWT>
```

### `get_current_user`

Your dependency that:

```text
receives JWT
     ↓
decodes/verifies JWT
     ↓
gets user_id + role
     ↓
returns current user information
```

---

# 11. API Endpoint Summary

| Method | Endpoint | Purpose | Protected? |
|---|---|---|---|
| `GET` | `/` | Check API status | No |
| `GET` | `/test-db` | Test MongoDB connection | No |
| `POST` | `/users` | Register user | No |
| `GET` | `/users` | Get users | No |
| `POST` | `/login` | Login and receive JWT | No |
| `GET` | `/me` | Get authenticated user | Yes |

---

# 12. Project Architecture

A clean structure for this backend is:

```text
backend/
│
├── venv/
│
├── main.py
│
├── database.py
│
├── .env
│
├── models/
│   └── user_model.py
│
├── schemas/
│   └── auth.py
│
└── utils/
    ├── password.py
    ├── jwt.py
    └── auth_dependency.py
```

### Responsibility of each part

```text
main.py
   ↓
API routes

database.py
   ↓
MongoDB connection

models/
   ↓
Data validation/models

schemas/
   ↓
Request/response schemas

utils/password.py
   ↓
Password hashing + verification

utils/jwt.py
   ↓
JWT creation

utils/auth_dependency.py
   ↓
JWT verification + authentication
```

---

# 13. One Small Cleanup

Your current imports contain `Depends` twice:

```python
from fastapi import FastAPI, HTTPException, Depends
```

and later:

```python
from fastapi import Depends
```

You only need the first one.

Also, these imports are currently unused in `main.py`:

```python
from schemas.auth import LoginRequest
```

If you are not using `LoginRequest` anywhere, remove it.

So the cleaner imports are:

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import OAuth2PasswordRequestForm

from database import client, users_collection
from models.user_model import User
from utils.password import hash_password, verify_password
from utils.jwt import create_access_token
from utils.auth_dependency import get_current_user
```

---

# 14. Big Picture

Your backend currently has **three major systems**:

```text
┌──────────────────────────────────────┐
│         EMPLOYEE MANAGEMENT API      │
├──────────────────────────────────────┤
│                                      │
│  1. USER MANAGEMENT                  │
│     Register → MongoDB               │
│                                      │
│  2. PASSWORD SECURITY                │
│     bcrypt hash + verify             │
│                                      │
│  3. AUTHENTICATION                   │
│     Login → JWT → Bearer → /me       │
│                                      │
└──────────────────────────────────────┘
```

The next natural step is connecting this backend to the React frontend:

```text
React Login Page
       ↓
POST /login
       ↓
FastAPI
       ↓
MongoDB
       ↓
JWT
       ↓
React
       ↓
Authorization: Bearer <JWT>
       ↓
Protected FastAPI routes
```
