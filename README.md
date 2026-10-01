# Employee Management System

A full-stack Employee Management System built with React, FastAPI and MongoDB.

## Requirements

Make sure you have installed:

- Python 3.11+
- Node.js 20+
- npm
- MongoDB Atlas

## 1. Download the Project

Clone the repository:

```bash
git clone https://github.com/Jelaance0o/employee-management-system
cd employee-management-system
```

Or download the repository as ZIP and extract it.

## 2. Backend Setup

Open a terminal:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:

```env
MONGO_URL=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Start the backend:

```bash
python -m uvicorn main:app --reload
```

Backend will run at:

```text
http://localhost:8000
```

## 3. Frontend Setup

Open another terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## ⚠️ Important

Do not upload your `.env` file to GitHub.

Use `.env.example` as a reference and add your own MongoDB connection string and JWT secret.

## Done 🎉

The project should now be running locally.
