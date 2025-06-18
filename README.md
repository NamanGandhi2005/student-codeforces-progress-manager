# Student Codeforces Progress Management System


Video Demo Link :** https://youtu.be/8IEDuQBC4Xw

A comprehensive MERN stack application designed to track and manage student progress on the Codeforces competitive programming platform. This system allows administrators or mentors to monitor contest performance, analyze problem-solving data, and automate reminders for inactivity. It features a dynamic data synchronization mechanism with Codeforces and a role-based authentication system.

## Table of Contents
1.  [Overview](#1-overview)
2.  [Features](#2-features)
3.  [Tech Stack](#3-tech-stack)
4.  [System Architecture](#4-system-architecture)
5.  [Screenshots](#5-screenshots)
6.  [Core Functionality Details](#6-core-functionality-details)
    *   [Student Management](#student-management)
    *   [Student Profile Analytics](#student-profile-analytics)
    *   [Codeforces Data Sync](#codeforces-data-sync)
    *   [Inactivity Detection & Emailing](#inactivity-detection--emailing)
    *   [User Authentication & Roles](#user-authentication--roles)
    *   [Admin Configuration](#admin-configuration)
7.  [API Endpoints](#7-api-endpoints)
8.  [Frontend Interfaces](#8-frontend-interfaces)
9.  [Setup and Installation](#9-setup-and-installation)
    *   [Prerequisites](#prerequisites)
    *   [Environment Variables](#environment-variables)
    *   [Backend Setup](#backend-setup)
    *   [Frontend Setup](#frontend-setup)
10. [Running the Application](#10-running-the-application)
11. [Future Enhancements](#11-future-enhancements)
12. [Contribution](#12-contribution)
13. [License](#13-license)

## 1. Overview

This project aims to provide a centralized platform for educators, mentors, or institutions to effectively monitor the competitive programming progress of their students on Codeforces. It automates data collection, provides insightful visualizations, and includes tools for engagement and administration.

## 2. Features

*   **Comprehensive Student Tracking:** Add, view, edit, and delete student profiles.
*   **Detailed Performance Analytics:**
    *   **Contest History:** Rating graph, list of contests with ranks, rating changes, and problems solved/total.
    *   **Problem Solving Data:** Statistics on solved problems (total, most difficult, average rating, average per day), problem distribution by rating (bar chart), and submission activity (heatmap).
    *   Time-based filtering for all analytics (7, 30, 90, 365 days, All Time).
*   **Automated Codeforces Sync:**
    *   Daily cron job to fetch updated ratings, contest results, and submissions.
    *   Real-time sync trigger when a student's Codeforces handle is modified.
    *   Display of last sync time for each student.
*   **Inactivity Management:**
    *   Automatic detection of students inactive for a defined period (e.g., 7 days).
    *   Automated email reminders to inactive students.
    *   Tracking of reminders sent and an option to disable reminders per student.
*   **User Authentication & Authorization:**
    *   Secure user registration and login.
    *   Role-based access control:
        *   **Admin:** Full access to manage students, view all data, and configure system settings (e.g., cron jobs).
        *   **Student (Authenticated User):** View access to student lists and profiles. (Can be extended for students to manage their own linked profile).
*   **System Administration:**
    *   Admin UI to dynamically change the cron job schedule and timezone.
*   **User Interface:**
    *   Responsive design for usability across devices.
    *   Light and Dark mode theme toggle.
    *   Data export to CSV format for the student list.
    *   Direct links to Codeforces profiles and problem statements.

## 3. Tech Stack

*   **MERN Stack:**
    *   **MongoDB:** NoSQL Database (cloud-hosted via Atlas or local).
    *   **Express.js:** Backend web application framework.
    *   **React:** Frontend JavaScript library for building user interfaces.
    *   **Node.js:** Backend JavaScript runtime environment.
*   **Backend Libraries:**
    *   `mongoose`: ODM for MongoDB.
    *   `axios`: HTTP client for Codeforces API.
    *   `node-cron`: Cron job scheduler.
    *   `nodemailer`: Email sending.
    *   `jsonwebtoken` (JWT): User authentication.
    *   `bcryptjs`: Password hashing.
    *   `express-validator`: Input validation.
    *   `json2csv`: CSV generation.
    *   `dotenv`: Environment variable management.
    *   `cors`: Cross-Origin Resource Sharing.
*   **Frontend Libraries:**
    *   `@mui/material` (Material-UI): React UI component library.
    *   `react-router-dom`: Client-side routing.
    *   `axios`: HTTP client for backend API.
    *   `recharts`: Composable charting library (rating graph, bar charts).
    *   `react-calendar-heatmap`: Submission activity heatmap.
    *   `date-fns`: Date utility library.
    *   React Context API: For global state (theme, authentication).

## 4. System Architecture

The application employs a client-server architecture:

*   **Frontend (Client):** A React Single Page Application (SPA) responsible for user interaction, data display, and making API requests. Hosted typically as static files.
*   **Backend (Server):** A Node.js/Express.js RESTful API server that handles business logic, interacts with the MongoDB database, communicates with the external Codeforces API, manages scheduled tasks (cron jobs), and handles user authentication.
*   **Database (MongoDB):** Stores all persistent application data, including student profiles, user accounts, and administrative settings.

## 5. Screenshots


*   *Screenshot of the Student List page (with dark mode).*
*   ![image](https://github.com/user-attachments/assets/3857a63b-7b9d-4459-9174-252c5c2eb70d)
*   *Screenshot of a Student Profile page showing the Contest History section (graph and table).*
*   ![image](https://github.com/user-attachments/assets/7e99feeb-1f8f-43c7-bace-47e4983984b5)
*   *Screenshot of a Student Profile page showing the Problem Solving Data section (stats, bar chart, heatmap).*
*   ![image](https://github.com/user-attachments/assets/0a29b1c3-7990-47c3-929d-3f786e8bf6e4)
*   ![image](https://github.com/user-attachments/assets/a1fd0dd7-26cf-4e13-8541-81c86031ce25)
*   *Screenshot of the Admin Settings page.*
*   ![image](https://github.com/user-attachments/assets/a7d5dd45-ef3d-4a7b-af6c-b33fa16d43ec)


## 6. Core Functionality Details

### Student Management
Administrators can add new students by providing their name, email, phone (optional), and Codeforces handle. The system validates the Codeforces handle before saving. Existing student details can be edited, and profiles can be deleted. The entire student roster with key metrics can be downloaded as a CSV file.

### Student Profile Analytics
Each student has a detailed profile page:
*   **Contest History:** Visualizes rating changes over time via a line graph. A filterable table lists all participated contests, showing rank, rating before and after, rating change, and the number of problems solved versus the total problems in that contest.
*   **Problem Solving Data:** Displays key metrics for a selected period (7, 30, 90 days, or All Time), including total unique problems solved, the most difficult problem solved (with its rating and a direct link), average rating of solved problems, and average problems solved per day. Visualizations include a bar chart of problems solved per rating bucket and a submission activity heatmap.

### Codeforces Data Sync
*   A backend cron job runs daily (configurable time via admin UI) to fetch the latest data (ratings, contest participation, submissions, problem details per contest) for all enrolled students from the Codeforces API.
*   If an admin updates a student's Codeforces handle, a real-time sync is triggered for that student.
*   The main student list displays the "Last Synced" timestamp for each user.

### Inactivity Detection & Emailing
*   After each daily sync, the system checks for students who haven't made any Codeforces submissions in the last 7 days.
*   Eligible students (with email reminders enabled) receive an automated encouragement email.
*   The number of reminders sent to a student is tracked and visible. Admins can toggle the email reminder preference for each student.

### User Authentication & Roles
*   The system supports user registration and login.
*   **Admin Role:** Has full CRUD access to student data and can configure system settings like the cron job schedule.
*   **Student Role (General Authenticated User):** Has read-only access to view student lists and profiles. (Further permissions can be granularly defined).
*   Protected routes ensure only authorized users can access specific functionalities.

### Admin Configuration
An admin-only page (`/admin/settings`) allows modification of the cron job's schedule (using standard cron syntax) and timezone, providing flexibility for system maintenance and operation.

## 7. API Endpoints

All backend API endpoints are prefixed with `/api`.

*   **Auth (`/api/auth`):** `POST /register`, `POST /login`, `GET /me` (protected), `GET /logout` (protected).
*   **Students (`/api/students`):**
    *   `GET /`: (protected)
    *   `POST /`: (admin only)
    *   `GET /:id`: (protected)
    *   `PUT /:id`: (admin only)
    *   `DELETE /:id`: (admin only)
    *   `GET /csv`: (protected)
*   **Admin (`/api/admin`):**
    *   `GET /cron-settings`: (admin only)
    *   `PUT /cron-settings`: (admin only)

## 8. Frontend Interfaces

*   `/login`, `/register`
*   `/` (Student List)
*   `/student/:studentId` (Student Profile)
*   `/admin/settings` (Admin Cron Configuration)
*   `/unauthorized`, `*` (404)

## 9. Setup and Installation

### Prerequisites
*   Node.js (v16.x, v18.x, or v20.x recommended)
*   npm (v8.x or later) or yarn
*   MongoDB instance (local or cloud-hosted like MongoDB Atlas)
*   Codeforces API Key & Secret (generate from your CF profile settings)

### Environment Variables
Create a `.env` file in the `server/` directory (or project root if paths in `server/*.js` files are adjusted). Populate it with the following, replacing placeholder values:

```env
# Server Configuration
PORT=5001
NODE_ENV=development # or production

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/student_progress_db # Or your Atlas URI

# JWT Authentication
JWT_SECRET=YOUR_VERY_STRONG_AND_RANDOM_JWT_SECRET_KEY_HERE
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE_DAYS=30

# Codeforces API (Required for problem counts in contests)
CF_API_KEY=YOUR_CF_API_KEY
CF_API_SECRET=YOUR_CF_API_SECRET

# Cron Job (These are defaults, can be changed via Admin UI)
# CRON_SCHEDULE='0 2 * * *'
# CRON_TIMEZONE='Etc/UTC'

# Email Configuration (for Nodemailer)
EMAIL_SERVICE=gmail # e.g., 'gmail', or specify SMTP host/port
# EMAIL_HOST=smtp.example.com
# EMAIL_PORT=587
# EMAIL_SECURE=false # true for SSL on port 465, false for STARTTLS on 587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password_or_app_password # For Gmail, use an App Password
EMAIL_FROM="Student Progress App" <your_email@example.com>

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000

```

### Backend Setup
1. Navigate to the server directory: cd server
2. Install dependencies: npm install
3. Ensure your server/.env file is configured correctly.
4. Ensure your MongoDB server is running and accessible

### Frontend Setup
1.  Navigate to the `client` directory: `cd client`
2.  Install dependencies: `npm install`
3.  (Optional) Configure `client/.env` if your API base URL needs to be different from the default in `client/src/services/api.js`.

## 10. Running the Application
1.  **Start the Backend Server:**
    *   From the `server` directory: `npm run dev` (for development with `nodemon`) or `npm start`.
    *   The backend will typically run on `http://localhost:5001`.
2.  **Start the Frontend Development Server:**
    *   From the `client` directory (in a new terminal): `npm start`.
    *   The React application will open in your browser, typically at `http://localhost:3000`.
3.  **Access the application** by navigating to `http://localhost:3000` in your browser. Register an admin user first (you might need to manually set the role to 'admin' in the database for the first user, or temporarily modify the registration logic to allow setting an admin role if no admins exist).

## 11. Future Enhancements
*   Paginated results for large student lists and contest/submission tables for better performance.
*   Advanced search and filtering capabilities on the student list (e.g., filter by rating range, last activity).
*   More granular student-level permissions (e.g., a 'student' role user can only see their own detailed profile and perhaps edit limited personal fields).
*   Unit and integration tests for both backend and frontend components/services to ensure code quality and prevent regressions.
*   Deployment scripts and CI/CD pipeline setup for easier and automated deployments.
*   Option for students to self-register and link their CF handle (if desired for a more open platform).
*   More sophisticated error reporting and monitoring in production (e.g., Sentry).
*   Enhanced UI/UX polish: skeleton loaders, more consistent notifications, accessibility improvements.

## 12. Contribution
This project was developed by Naman Gandhi. Contributions, issues, and feature requests are welcome. Please feel free to fork the repository and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.


