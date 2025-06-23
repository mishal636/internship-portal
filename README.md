# Expolink - Internship Management System

## Overview
Expolink is a web-based Internship Management System designed to connect companies and students. This repository contains both the **Employer Section** and the **Student Section** for seamless internship management and application.

---

## Features

### Employer Side
- **Dashboard:** Overview of active internships and applications.
- **Create Internship:** Add new internship listings with details like title, description, location, duration, stipend, and deadline.
- **Manage Internships:** View, edit, and delete existing internship postings.
- **View Applications:** See candidate applications for posted internships.
- **Company Account:** Update company profile including name, email, description, and company image.
- **Logout:** Securely log out from the employer dashboard.

### Student Side
- **Browse Internships:** View all available internships with detailed information.
- **Apply for Internships:** Submit applications for desired internships.
- **My Profile:** Manage personal profile information including name, email, and bio.
- **View My Applications:** Track the status of submitted internship applications.
- **Logout:** Securely log out from the student dashboard.

---

## Technologies Used
- **Backend:** Node.js, HTTP server, MySQL (using `mysql2` package)
- **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
- **Database:** MySQL for user, internship, application, and company data
- **Form Handling:** `formidable` package for file uploads

---

## Installation and Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/expolink.git
   cd expolink
   ```
   
2.	Install dependencies:
   ```bash
	npm install mysql2 formidable
```

3.	Setup MySQL:
	•	Make sure MySQL server is running.
	•	The database and tables will be created automatically when you start the server.

4.	Run the server:
  	```bash
  	node server.js
  	```

6.	Open your browser and visit:
	```http://localhost:3000/login.html```
