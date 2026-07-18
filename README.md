# Complaint Management System

A full-stack **MERN (MongoDB, Express.js, React.js, Node.js)** web application designed to simplify complaint handling and improve communication between users, agents, and administrators.

## Features

### User

* User Registration and Login
* Raise New Complaints
* Track Complaint Status
* View Complaint History
* Update User Profile

### Agent

* View Assigned Complaints
* Accept Complaints
* Update Complaint Status
* Resolve Complaints
* Add Resolution Notes

### Admin

* Dashboard with Complaint Statistics
* Manage Users
* Manage Agents
* Assign Complaints
* Monitor Complaint Progress

## Tech Stack

### Frontend

* React.js
* Vite
* HTML5
* CSS3
* JavaScript

### Backend

* Node.js
* Express.js

### Database

* MongoDB

## Project Structure

```
Complaint-Management-System/
│
├── client/
├── server/
├── README.md
├── .gitignore
└── package.json
```

## Installation

### Clone the repository

```bash
git clone https://github.com/24eg105d59-dev/Complaint-Management-System.git
```

### Install Backend

```bash
cd server
npm install
```

### Install Frontend

```bash
cd ../client
npm install
```

## Environment Variables

Create a `.env` file inside the `server` folder and add:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

## Run the Project

### Start Backend

```bash
cd server
npm run dev
```

### Start Frontend

```bash
cd client
npm run dev
```

The frontend will usually run on:

```
http://localhost:5173
```

The backend will usually run on:

```
http://localhost:5000
```

## Future Improvements

* Email Notifications
* Complaint Categories
* File Upload Support
* Real-time Notifications
* Complaint Analytics Dashboard
* AI-based Complaint Categorization

 
