# Employee Management System — Backend Authentication Flow

## 1. Project Structure

```text
backend/
│
├── main.py
├── database.py
├── .env
│
├── models/
│   └── user.py
│
├── schemas/
│   └── auth.py
│
├── utils/
│   ├── password.py
│   ├── jwt.py
│   └── auth_dependency.py
│
└── routes/
    ├── auth_routes.py
    ├── admin_routes.py
    └── employee_routes.py
```

---

# 2. `.env`

```env
MONGO_URL=your_mongodb_atlas_url
JWT_SECRET=your-super-secret-key
```

### Purpose

Stores sensitive configuration.

```text
MONGO_URL
    ↓
MongoDB connection

JWT_SECRET
    ↓
JWT signing + verification
```

---

# 3. `database.py`

Responsible for connecting to MongoDB Atlas.

```python
import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

client = MongoClient(MONGO_URL)

database = client["employee_management"]

users_collection = database["users"]
```

### Flow

```text
.env
 ↓
MONGO_URL
 ↓
MongoClient()
 ↓
MongoDB Atlas
 ↓
employee_management
 ↓
users collection
```

The important object is:

```python
users_collection
```

It is used for operations such as:

```python
users_collection.find_one(...)
users_collection.insert_one(...)
```

---

# 4. `models/user.py`

Describes the structure of a user.

```python
from pydantic import BaseModel, EmailStr

class User(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
```

Pydantic validates incoming data.

Example:

```json
{
  "name": "John",
  "email": "john@gmail.com",
  "password": "123456",
  "role": "employee"
}
```

It checks:

```text
name     → string
email    → valid email
password → string
role     → string
```

---

# 5. `schemas/auth.py`

Login doesn't need the complete User model.

```python
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
```

So:

```text
Registration
    ↓
User

Login
    ↓
LoginRequest
```

---

# 6. `utils/password.py`

Responsible for password hashing and verification.

## `hash_password()`

```python
import bcrypt

def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")

    salt = bcrypt.gensalt()

    hashed_password = bcrypt.hashpw(
        password_bytes,
        salt
    )

    return hashed_password.decode("utf-8")
```

### Registration flow

```text
Plain password
      ↓
hash_password()
      ↓
bcrypt
      ↓
password_hash
      ↓
MongoDB
```

We never store:

```text
password = "hello123"
```

Instead MongoDB stores something like:

```text
password_hash = "$2b$12$..."
```

---

## `verify_password()`

```python
def verify_password(
    password: str,
    hashed_password: str
) -> bool:

    password_bytes = password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(
        password_bytes,
        hashed_bytes
    )
```

### Login flow

```text
User enters password
        ↓
verify_password()
        ↓
Compare with MongoDB password_hash
        ↓
True / False
```

---

# 7. `utils/jwt.py`

Responsible for creating JWTs.

The login process calls:

```python
access_token = create_access_token({
    "user_id": str(user["_id"]),
    "role": user["role"]
})
```

The JWT payload contains:

```json
{
  "user_id": "123...",
  "role": "admin",
  "exp": "..."
}
```

It does **not** contain:

```text
password
password_hash
```

### JWT creation

```text
user_id + role + expiration
              ↓
          JWT signing
              ↓
        signed JWT token
```

---

# 8. `routes/auth_routes.py`

This handles login.

Endpoint:

```text
POST /auth/login
```

The route receives:

```python
login_data: LoginRequest
```

and:

```python
response: Response
```

---

## Complete Login Flow

### Step 1 — React sends JSON

```json
{
  "email": "admin@gmail.com",
  "password": "mypassword"
}
```

FastAPI converts it into:

```python
login_data
```

Therefore:

```python
login_data.email
```

returns:

```text
admin@gmail.com
```

and:

```python
login_data.password
```

returns:

```text
mypassword
```

---

## Step 2 — Find user

```python
user = users_collection.find_one({
    "email": login_data.email
})
```

MongoDB searches for the email.

If no user exists:

```python
if not user:
    raise HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )
```

---

## Step 3 — Verify password

```python
password_correct = verify_password(
    login_data.password,
    user["password_hash"]
)
```

Flow:

```text
login password
      ↓
verify_password()
      ↓
MongoDB password_hash
      ↓
True / False
```

If incorrect:

```python
if not password_correct:
    raise HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )
```

---

## Step 4 — Create JWT

If credentials are correct:

```python
access_token = create_access_token({
    "user_id": str(user["_id"]),
    "role": user["role"]
})
```

Example:

```text
user_id = 123
role = admin
```

becomes part of the JWT.

---

# 9. Store JWT in HttpOnly Cookie

```python
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,
    secure=False,
    samesite="lax",
    max_age=60 * 60
)
```

The browser stores:

```text
access_token = JWT
```

### Important

React does **not** need to read the JWT.

We don't use:

```javascript
localStorage.setItem()
```

and we don't use:

```javascript
document.cookie
```

The browser manages the cookie.

---

# 10. Login Response

The API returns:

```python
return {
    "message": "Login successful",
    "user": {
        "id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"]
    }
}
```

The JWT is **not returned in JSON**.

It is stored in the HttpOnly cookie.

---

# 11. Cookie Authentication

After login, React requests:

```text
GET /me
```

or:

```text
GET /admin/test
```

The browser automatically sends:

```text
Cookie:
access_token=eyJhbGci...
```

React doesn't manually attach it.

---

# 12. `utils/auth_dependency.py`

This is the security gate for protected routes.

## `get_current_user()`

```python
def get_current_user(request: Request):
```

First it reads the cookie:

```python
token = request.cookies.get("access_token")
```

### If cookie doesn't exist

```python
if not token:
    raise HTTPException(
        status_code=401,
        detail="Not authenticated"
    )
```

Flow:

```text
No cookie
   ↓
Not authenticated
   ↓
401 Unauthorized
```

---

# 13. Verify JWT

If the cookie exists:

```python
payload = jwt.decode(
    token,
    JWT_SECRET,
    algorithms=[ALGORITHM]
)
```

This verifies:

* JWT signature
* JWT expiration
* JWT validity

If JWT is invalid or expired:

```python
except JWTError:
    raise HTTPException(
        status_code=401,
        detail="Invalid or expired token"
    )
```

---

# 14. Extract User Information

After successful JWT verification:

```python
user_id = payload.get("user_id")
role = payload.get("role")
```

Example:

```python
{
    "user_id": "123",
    "role": "admin"
}
```

Then:

```python
return {
    "user_id": user_id,
    "role": role
}
```

So `get_current_user()` returns:

```python
{
    "user_id": "123",
    "role": "admin"
}
```

---

# 15. `require_admin()`

```python
def require_admin(
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return current_user
```

### Dependency chain

```text
require_admin()
      ↓
get_current_user()
      ↓
Read cookie
      ↓
Verify JWT
      ↓
Get user_id + role
      ↓
Check role
```

If:

```text
role = admin
```

the request is allowed.

If:

```text
role = employee
```

the request gets:

```text
403 Forbidden
```

---

# 16. `require_employee()`

```python
def require_employee(
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "employee":
        raise HTTPException(
            status_code=403,
            detail="Employee access required"
        )

    return current_user
```

Flow:

```text
role = employee
      ↓
Allowed

role = admin
      ↓
403 Forbidden
```

---

# 17. `routes/admin_routes.py`

```python
@router.get("/test")
def admin_test(
    current_user=Depends(require_admin)
):
    return {
        "message": "Welcome Admin!",
        "user": current_user
    }
```

Endpoint:

```text
GET /admin/test
```

### Complete flow

```text
GET /admin/test
       ↓
require_admin()
       ↓
get_current_user()
       ↓
Read access_token cookie
       ↓
Verify JWT
       ↓
Extract role
       ↓
role == "admin"?
       ↓
YES
       ↓
admin_test()
       ↓
200 OK
```

---

# 18. `routes/employee_routes.py`

```python
@router.get("/test")
def employee_test(
    current_user=Depends(require_employee)
):
    return {
        "message": "Welcome Employee!",
        "user": current_user
    }
```

Endpoint:

```text
GET /employee/test
```

### Flow

```text
GET /employee/test
       ↓
require_employee()
       ↓
get_current_user()
       ↓
Read cookie
       ↓
Verify JWT
       ↓
Extract role
       ↓
role == "employee"?
       ↓
YES
       ↓
employee_test()
       ↓
200 OK
```

---

# 19. `/me`

The `/me` endpoint uses:

```python
current_user=Depends(get_current_user)
```

So it only requires authentication, not a specific role.

```text
GET /me
   ↓
get_current_user()
   ↓
Read cookie
   ↓
Verify JWT
   ↓
Return user_id + role
```

---

# 20. `main.py`

`main.py` creates the FastAPI application and registers the routers.

Conceptually:

```python
from fastapi import FastAPI

from routes.auth_routes import router as auth_router
from routes.admin_routes import router as admin_router
from routes.employee_routes import router as employee_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(employee_router)
```

This gives us:

```text
/auth/login
/admin/test
/employee/test
```

---

# 🔐 Complete Registration Flow

```text
React
  ↓
POST /users
  ↓
User validation
  ↓
hash_password()
  ↓
bcrypt
  ↓
password_hash
  ↓
MongoDB
```

MongoDB stores:

```json
{
  "name": "John",
  "email": "john@gmail.com",
  "password_hash": "$2b$12$...",
  "role": "employee"
}
```

---

# 🔑 Complete Login Flow

```text
React Login
    ↓
POST /auth/login
    ↓
LoginRequest
    ↓
Find user in MongoDB
    ↓
verify_password()
    ↓
Password correct?
    │
    ├── NO → 401
    │
    └── YES
          ↓
    create_access_token()
          ↓
        JWT
          ↓
    HttpOnly Cookie 🍪
          ↓
       Browser
```

---

# 🔐 Complete Protected Request

```text
React
  ↓
GET /admin/test
  ↓
Browser automatically sends Cookie
  ↓
access_token
  ↓
get_current_user()
  ↓
jwt.decode()
  ↓
JWT valid?
  │
  ├── NO → 401
  │
  └── YES
        ↓
   user_id + role
        ↓
  require_admin()
        ↓
   role == admin?
        │
        ├── NO → 403
        │
        └── YES
              ↓
        Admin endpoint
              ↓
            200 OK
```

---

# 🧠 Authentication vs Authorization

## Authentication

**"Who are you?"**

```text
Cookie
  ↓
JWT
  ↓
get_current_user()
```

## Authorization

**"What are you allowed to access?"**

```text
require_admin()
require_employee()
```

Therefore:

```text
Authentication
     ↓
Identify user

Authorization
     ↓
Check permissions
```

---

# 📁 Responsibility of Every File

| File                        | Responsibility                        |
| --------------------------- | ------------------------------------- |
| `.env`                      | Secrets/configuration                 |
| `database.py`               | MongoDB connection                    |
| `models/user.py`            | User model                            |
| `schemas/auth.py`           | Login validation                      |
| `utils/password.py`         | Password hashing/verification         |
| `utils/jwt.py`              | JWT creation                          |
| `utils/auth_dependency.py`  | JWT verification + role authorization |
| `routes/auth_routes.py`     | Authentication/login                  |
| `routes/admin_routes.py`    | Admin endpoints                       |
| `routes/employee_routes.py` | Employee endpoints                    |
| `main.py`                   | FastAPI app + router registration     |

---

# ⭐ The Most Important Chain

If you remember only one thing, remember this:

```text
/admin/test
     ↓
require_admin()
     ↓
get_current_user()
     ↓
request.cookies
     ↓
access_token
     ↓
jwt.decode()
     ↓
user_id + role
     ↓
require_admin checks role
     ↓
admin endpoint
```

And:

```text
/employee/test
     ↓
require_employee()
     ↓
get_current_user()
     ↓
request.cookies
     ↓
access_token
     ↓
jwt.decode()
     ↓
user_id + role
     ↓
require_employee checks role
     ↓
employee endpoint
```

---

# 🚀 Final Architecture

```text
                    ┌───────────────┐
                    │    React      │
                    └───────┬───────┘
                            │
                       Email + Password
                            │
                            ▼
                    ┌───────────────┐
                    │   FastAPI     │
                    │ /auth/login   │
                    └───────┬───────┘
                            │
                     Verify Password
                            │
                            ▼
                       bcrypt hash
                            │
                            ▼
                      Create JWT
                            │
                            ▼
                  HttpOnly Cookie 🍪
                            │
                            ▼
                       Browser
                            │
               Automatically sends cookie
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          /me          /admin/test    /employee/test
             │              │              │
             ▼              ▼              ▼
       get_current_user  require_admin  require_employee
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                       Verify JWT
                            │
                            ▼
                    Extract user + role
                            │
                  ┌─────────┴─────────┐
                  ▼                   ▼
                ADMIN             EMPLOYEE
                  │                   │
                  ▼                   ▼
             Admin APIs          Employee APIs
```

This is now the **baseline backend architecture** we'll build the React frontend against.
