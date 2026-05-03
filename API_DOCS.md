# Digilians API — Auth Endpoints

Base URL: `http://localhost:5000/api/auth`

---

## 1. Register

**POST** `/api/auth/register`

### Request Body (`application/json`)

```json
{
  "name": "Sandy Magdy",
  "email": "sandy@example.com",
  "password": "123456",
  "role": "student",
  "phoneNumber": "01012345678"
}
```

| Field         | Type   | Required | Notes                              |
|---------------|--------|----------|------------------------------------|
| `name`        | String | ✅ Yes   | Full name                          |
| `email`       | String | ✅ Yes   | Must be a valid email, unique      |
| `password`    | String | ✅ Yes   | Minimum 6 characters              |
| `role`        | String | ❌ No    | `student` · `mentor` · `admin` (default: `student`) |
| `phoneNumber` | String | ❌ No    | Any format                         |

### Success Response — `201 Created`

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "<JWT_TOKEN>",
  "user": {
    "_id": "664a...",
    "name": "Sandy Magdy",
    "email": "sandy@example.com",
    "role": "student",
    "image": "https://ui-avatars.com/api/?name=User&background=eee&color=888&size=160",
    "phoneNumber": "01012345678",
    "preferredLanguage": ["english"],
    "isRegistered": true,
    "createdAt": "2026-05-03T16:00:00.000Z"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | `Name, email, and password are required` |
| `409`  | `Email already registered` |
| `500`  | `Server error` |

---

## 2. Login

**POST** `/api/auth/login`

### Request Body (`application/json`)

```json
{
  "email": "sandy@example.com",
  "password": "123456"
}
```

| Field      | Type   | Required | Notes            |
|------------|--------|----------|------------------|
| `email`    | String | ✅ Yes   | Registered email |
| `password` | String | ✅ Yes   | Account password |

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<JWT_TOKEN>",
  "user": {
    "_id": "664a...",
    "name": "Sandy Magdy",
    "email": "sandy@example.com",
    "role": "student",
    "image": "https://ui-avatars.com/api/?name=User&background=eee&color=888&size=160",
    "phoneNumber": "01012345678",
    "preferredLanguage": ["english"],
    "isRegistered": true,
    "createdAt": "2026-05-03T16:00:00.000Z"
  }
}
```

### Error Responses

| Status | Message |
|--------|---------|
| `400`  | `Email and password are required` |
| `401`  | `Invalid email or password` |
| `500`  | `Server error` |

---

## 3. Logout *(Protected)*

**POST** `/api/auth/logout`

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Goodbye, Sandy Magdy! You have been logged out."
}
```

---

## 4. Get Current User *(Protected)*

**GET** `/api/auth/me`

### Headers

```
Authorization: Bearer <JWT_TOKEN>
```

### Success Response — `200 OK`

```json
{
  "success": true,
  "message": "Current user fetched",
  "user": {
    "_id": "664a...",
    "name": "Sandy Magdy",
    "email": "sandy@example.com",
    "role": "student"
  }
}
```

---

## Quick Test with cURL

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Sandy Magdy","email":"sandy@example.com","password":"123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sandy@example.com","password":"123456"}'

# Logout (replace TOKEN with the token from login)
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer TOKEN"
```
