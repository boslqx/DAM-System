DAM System (Digital Asset Management System)

The DAM System is a full-stack web application designed to manage digital assets such as images, documents, and 3D models. It provides secure user authentication, role-based access control, asset uploading, asset categorization, and a 3D model viewer powered by Babylon.js.

This project is built using Django REST Framework (backend) and React + Next.js (frontend).

Key Features:
1. Authentication & RBAC
   - Login & logout
   - Roles: Admin, Editor, Viewer
   - Different UI access depending on the user role
2. Asset Management
   - Upload files (images, documents, 3D models)
   - Preview Assets
   - Edit and delete assets
3. Reporting (Admin Only)
   - Activity logs
   - Statistic
   - User tracking activity
  
Startup
1. Backend Setup:
   - Install dependencies
     - cd backend
     - pip install -r requirements.txt
   - Apply migrations
     - python manage.py makemigrations
     - python manage.py migrate
   - Create superuser (for Admin access)
     - python manage.py createsuperuser
   - Run the backend
     - python manage.py runserver
2. Frontend Setup:
   - Install dependencies
     - cd frontend
     - npm install
   - Run the development server
     - npm run dev
3. Run the website with http://localhost:3000/login with superuser as admin and then create other roles such as editor or viewer
