# Crime Predictive Model / Tool for Hotspot Mapping

## 📌 Project Overview

This project is a **Final Year College Project** developed by a **team of 3 members**. The goal is to build a **web-based crime analysis and hotspot mapping system** that helps visualize, analyze, and predict crime-prone areas using FIR (First Information Report) data.

The system processes crime data, applies spatial clustering algorithms to detect hotspots, and presents insights through an interactive dashboard designed for police officers and analysts.

---

## 🎯 Objectives

* Identify and predict crime-prone areas (hotspots)
* Visualize crime data using heatmaps and zonal maps
* Classify crimes based on IPC / NDPS categories
* Enable filtering by crime type, date range, and zone
* Support patrol planning and analytical decision-making
* Maintain clean, scalable, and well-structured code

---

## 🧠 Key Features

* FIR data ingestion (manual upload + mock CCTNS data)
* Crime classification (IPC / NDPS → categories)
* Geo-mapping using latitude & longitude
* Hotspot detection using clustering algorithms (DBSCAN / KDE)
* Interactive map-based dashboard
* Role-based authentication (Admin, Officer, Analyst)
* Crime reports and data export (CSV / PDF).

---

## 🏗️ High-Level Architecture

* **Frontend**: Interactive dashboard with maps, charts, and tables
* **Backend**: REST APIs for data processing, authentication, and analytics
* **Database**: PostgreSQL with PostGIS for geospatial queries
* **Analytics Layer**: Hotspot detection and aggregation logic

All communication between frontend and backend is handled via **REST APIs**.

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Leaflet.js / Mapbox (Maps & Heatmaps)
* Recharts / Chart.js (Data visualization)

### Backend

* Node.js
* Express.js
* JWT-based Authentication
* Role-Based Access Control (RBAC)

### Database

* PostgreSQL + PostGIS
* Optional: MongoDB (NoSQL)
* Optional: Redis (Caching)

---

## 📂 Project Structure

```
/frontend
  /components
  /pages
  /services
  /hooks
  /utils

/backend
  /controllers
  /routes
  /services
  /middlewares
  /models
  /utils

/database
  /schemas
  /migrations

/docs
```

---

## 🔐 Security

* Passwords stored using secure hashing (bcrypt / argon2)
* JWT-based authentication for protected routes
* Middleware-based role checks
* No sensitive data exposed in API responses

---

## 🧪 Hotspot Detection Logic

* Uses **DBSCAN** for spatial clustering of crime locations
* Supports time-based filtering (daily / weekly / monthly)
* Each hotspot includes:

  * Cluster centroid
  * Boundary (GeoJSON)
  * Crime count
  * Crime type distribution

---

## 📊 Dashboard Capabilities

* Interactive map with heatmaps and clusters
* FIR table with search and filters
* Crime trends over time
* Zone-wise crime distribution
* Role-based views for Admin, Officer, and Analyst

---

## 🔄 Team Workflow (AI-Assisted)

The team follows a **shared AI Sync Prompt** workflow:

* A master prompt acts as a single source of truth
* All team members use the same prompt before generating code
* New ideas go through approval before implementation
* Completed features are tracked and updated

This ensures consistency in:

* Code structure
* Naming conventions
* Architecture decisions

---

## 🚧 Current Project Status

**Phase:** Development (Backend + Frontend)

### Completed

* Initial project planning
* System architecture design
* Database schema design

### In Progress

* FIR APIs
* Hotspot detection service
* Frontend map integration

### Pending

* Reports & export module
* Authentication UI
* Final testing & deployment

---

## 🚀 Future Enhancements

* Real-time FIR updates
* Predictive ML models for crime forecasting
* Mobile app / PWA for field officers
* Automated alerts for emerging hotspots
* Integration with external datasets (weather, events)

---

## 📘 Academic Note

This project is developed **strictly for academic purposes** as part of a final-year curriculum. Live police systems are **not directly integrated**; mock or sample data is used during development.

---

## 👥 Team

* Team Size: 3 Members
* Roles: Frontend, Backend, Data/Analytics (collaborative)

---

## 📄 License

This project is intended for **educational use only**.
