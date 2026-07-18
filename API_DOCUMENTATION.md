# ResolveHub API Documentation

Welcome to the ResolveHub API documentation. This system handles authentication, role-based authorization, complaint tickets tracking, internal notes recording, real-time message chatrooms, customer satisfaction ratings, aggregate dashboards, and system-wide notifications.

---

## 1. Role-Based Permissions Grid

| Endpoint Group | Resource Path | User (Client) | Agent | Admin |
| :--- | :--- | :---: | :---: | :---: |
| **Authentication** | `POST /register`, `POST /login` | ✔ | ✔ | ✔ |
| **Support Staff** | `GET /users/agents` | ❌ | ✔ | ✔ |
| **Complaints (Write)** | `POST /complaints` | ✔ (Filer only) | ❌ | ❌ |
| **Complaints (Read All)**| `GET /complaints` | Only own filed | ✔ | ✔ |
| **Complaints (Details)** | `GET /complaints/:id` | Only own filed | Only assigned | ✔ |
| **Complaints (Edit Details)**| `PUT /complaints/:id` | Only own (Pending) | ❌ | ❌ |
| **Complaints (Transitions)**| `PUT /complaints/:id` (status/assign)| ❌ | Only assigned | ✔ |
| **Complaints (Delete)** | `DELETE /complaints/:id` | Only own (Pending) | ❌ | ✔ |
| **Complaints (Notes)** | `POST /complaints/:id/notes` | ❌ | Only assigned | ✔ |
| **Chat History** | `GET /chat/:complaintId` | Only own ticket | Only assigned | ✔ |
| **Send Chat Message** | `POST /chat` | Only own ticket | Only assigned | ✔ |
| **Feedback (Submit)** | `POST /feedback` | ✔ (Owner Filer) | ❌ | ❌ |
| **Feedback (My Log)** | `GET /feedback/my/history` | ✔ (Owner Filer) | ❌ | ❌ |
| **Feedback (Stats)** | `GET /feedback/stats` | ❌ | ❌ | ✔ |
| **Feedback (Single)** | `GET /feedback/:complaintId` | Only own ticket | Only assigned | ✔ |
| **Dashboard Counts** | `GET /analytics/admin-dashboard` | ❌ | ❌ | ✔ |
| **Detailed Reports** | `GET /analytics/report-data` | ❌ | ❌ | ✔ |
| **CSV Export** | `GET /analytics/export/csv` | ❌ | ❌ | ✔ |
| **Notifications Feed** | `GET /notifications` | ✔ (Own feed) | ✔ (Own feed) | ✔ (Own feed) |

---

## 2. Authentication Endpoints (`/api/auth`)

### Register User
* **URL**: `POST /api/auth/register`
* **Access**: Public
* **Body (JSON)**:
  ```json
  {
    "name": "John Doe",
    "email": "john@test.com",
    "password": "password123"
  }
  ```
* **Success Response (201)**:
  ```json
  {
    "success": true,
    "message": "Registration successful. Please verify email.",
    "user": { "_id": "60f2...", "name": "John Doe", "email": "john@test.com", "role": "User" }
  }
  ```

### Login User
* **URL**: `POST /api/auth/login`
* **Access**: Public
* **Body (JSON)**:
  ```json
  {
    "email": "john@test.com",
    "password": "password123"
  }
  ```
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": { "_id": "60f2...", "name": "John Doe", "email": "john@test.com", "role": "User" }
  }
  ```

---

## 3. Complaint Endpoints (`/api/complaints`)

### File Complaint
* **URL**: `POST /api/complaints`
* **Access**: Private (User only)
* **Headers**: `Authorization: Bearer <token>`
* **Body (Multipart/Form-Data)**:
  - `title`: String (required)
  - `description`: String (required)
  - `category`: String (Technical | Billing | Service | Other)
  - `priority`: String (Low | Medium | High)
  - `attachments`: File (images/PDFs, optional)

### Get Complaints
* **URL**: `GET /api/complaints`
* **Access**: Private (Filtered by role)
* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters (optional)**:
  - `status`: Pending | Assigned | In Progress | Resolved | Closed
  - `category`: Technical | Billing | Service | Other
  - `priority`: Low | Medium | High
  - `search`: Ticket ID or subject keywords
  - `assignedToMe`: `true` (Agents only)

---

## 4. Chat Endpoints (`/api/chat`)

### Get Chat History
* **URL**: `GET /api/chat/:complaintId`
* **Access**: Private (Owner, Assigned Agent, Admin)
* **Headers**: `Authorization: Bearer <token>`
* **Success Response (200)**:
  ```json
  {
    "success": true,
    "count": 2,
    "messages": [
      {
        "_id": "60f3...",
        "complaint": "60f2...",
        "sender": { "_id": "60f2...", "name": "John Doe", "role": "User" },
        "message": "Hello, is someone working on my ticket?",
        "createdAt": "2026-07-10T12:00:00Z"
      }
    ]
  }
  ```

### Send Chat Message
* **URL**: `POST /api/chat`
* **Access**: Private (Owner, Assigned Agent, Admin)
* **Headers**: `Authorization: Bearer <token>`
* **Body (JSON)**:
  ```json
  {
    "complaintId": "60f2...",
    "message": "Yes, I am starting work on this billing issue."
  }
  ```

---

## 5. Feedback Endpoints (`/api/feedback`)

### Submit Feedback
* **URL**: `POST /api/feedback`
* **Access**: Private (Owner client only, ticket must be Resolved or Closed)
* **Headers**: `Authorization: Bearer <token>`
* **Body (JSON)**:
  ```json
  {
    "complaintId": "60f2...",
    "rating": 5,
    "comments": "Excellent resolution speed!"
  }
  ```

---

## 6. Analytics Endpoints (`/api/analytics`)

### Get Admin Dashboard
* **URL**: `GET /api/analytics/admin-dashboard`
* **Access**: Private (Admin only)
* **Headers**: `Authorization: Bearer <token>`

### Get Detailed Report Summary
* **URL**: `GET /api/analytics/report-data`
* **Access**: Private (Admin only)
* **Headers**: `Authorization: Bearer <token>`

### Export CSV Logs
* **URL**: `GET /api/analytics/export/csv`
* **Access**: Private (Admin only)
* **Headers**: `Authorization: Bearer <token>`
* **Response**: Binary stream of CSV file.

---

## 7. Notification Endpoints (`/api/notifications`)

### Get Feed
* **URL**: `GET /api/notifications`
* **Access**: Private
* **Headers**: `Authorization: Bearer <token>`

### Mark Notification Read
* **URL**: `PUT /api/notifications/:id/read`
* **Access**: Private
* **Headers**: `Authorization: Bearer <token>`
