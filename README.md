# Phantom Fantasy Football 

A full-stack fantasy sports platform built with React, Node.js, and Express, featuring real-time WebSocket scoring updates, automated scheduling, and interactive roster and trade management.

## ✨ Key Features

- **Live Head-to-Head Matchup Tracker:** Synchronized, side-by-side roster tracking with real-time score updates and projections.
- **Roster & Player Management:** Interactive player modal system to view deep player stats, projections, and manage starter/bench slots.
- **Trade System:** Modal interface allowing league owners to initiate and manage trade offers.
- **Session & Auth Integration:** Role-based UI rendering that dynamically toggles owner privileges and active league views.

## 🛠️ Tech Stack

### **Frontend**
- **Framework:** React 19, React Router v7
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v4, Emotion, Styled Components, Material UI (MUI)
- **UI & Animations:** Swiper.js, React Icons, React Modal

### **Backend**
- **Runtime & Server:** Node.js, Express 5
- **Database:** SQLite (`better-sqlite3`)
- **Real-Time Communication:** WebSockets (`ws`)
- **Authentication & Security:** `express-session`, `bcrypt` (Password Hashing)
- **Task Scheduling:** `node-cron` (Automated background stat updates & weekly matchup resets)
- **Algorithms:** `roundrobin-tournament-js` (Automated league schedule generation)