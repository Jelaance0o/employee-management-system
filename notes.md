## hash_password flow 
```
Password string
    ↓
.encode("utf-8")
    ↓
Bytes
    ↓
bcrypt.hashpw(password_bytes, salt)
    ↓
bcrypt hash (returned as bytes)
    ↓
.decode("utf-8")
    ↓
String
    ↓
Store in MongoDB
```

### How does bcrypt know which salt to use during login?

You might ask:

> "When we created the hash, we used a random salt. How can bcrypt know which salt to use during login?"

That's the clever part of **bcrypt**.

When we originally create the hash:

### Password.py
```python 
hashed_password = bcrypt.hashpw(
    password_bytes,
    salt
)

> "the resulting bcrypt hash contains the salt information and cost information needed for verification"