# Firebase setup for YuHua Chinese v11

## What v11 adds
- Student registration by email/password
- Student login/logout
- Lessons require login
- Firestore user profile
- Basic activity tracking: last lesson/module
- Teacher dashboard: user list + last activity
- Teacher can block/unblock student accounts
- Student cannot promote themselves to teacher through the website

## Firebase Console setup

1. Create a Firebase project.
2. Project Overview -> Add app -> Web.
3. Copy the Firebase web config into `firebase-config.js`.
4. Authentication -> Sign-in method -> enable Email/Password.
5. Firestore Database -> Create database.
6. Firestore -> Rules -> replace with the contents of `firestore.rules` and Publish.
7. Upload v11 files to GitHub Pages.
8. Register a normal account on the website.
9. To make your own account the teacher:
   Firestore -> users -> your UID -> set `role` to `teacher`.
10. Refresh the website and the `Quản lý học sinh` button appears.

## Important limitation
GitHub Pages is public static hosting. Login can control the website UI and Firestore data access, but it cannot make the raw static HTML/JS/data files private. If lesson content must be truly private, move protected lesson content behind an authenticated backend or an auth-aware hosting architecture.
