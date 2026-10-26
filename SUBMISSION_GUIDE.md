# Submission Guide & Step-by-Step Instructions

This guide provides step-by-step instructions for submitting your project according to the assignment requirements.

---

## 📋 Required Deliverables Checklist

- [ ] **1. Video Demo (Unlisted YouTube Video)**
  - Max 10 minutes total duration
  - **Part 1 (max 5 min)**: Client pitch & portal demo
  - **Part 2 (max 5 min)**: Tech lead architecture & code review
  - Script provided in [VIDEO_SCRIPT.md](file:///Users/kratikjain12/Desktop/Interview%20questions/wind-power-dashboard/VIDEO_SCRIPT.md)
- [ ] **2. Anonymous Public GitHub Repository**
  - Anonymous name (e.g. `wnd-k7q9x` or `kjhwr-windtrack`)
  - Contains complete code, Dockerfile, docker-compose.yml, and [README.md](file:///Users/kratikjain12/Desktop/Interview%20questions/wind-power-dashboard/README.md)
  - Explicit AI tool usage disclosure included in README
- [ ] **3. Live Deployment URL**
  - Frontend deployed on Vercel or Heroku
  - Backend API accessible
- [ ] **4. Microsoft Form Submission**
  - Form URL: [https://forms.cloud.microsoft/r/FTX6K2bbnU](https://forms.cloud.microsoft/r/FTX6K2bbnU)
  - Verified in Incognito mode

---

## 🚀 Step 1: Push to Anonymous Public GitHub Repository

Run the following commands in terminal:

```bash
cd "/Users/kratikjain12/Desktop/Interview questions/wind-power-dashboard"

# Initialize git repository
git init
git add .
git commit -m "feat: complete UK wind power intelligence & day-ahead procurement dashboard"

# Create a new repository on GitHub with an anonymous name (e.g., wnd-p9x2a)
# (Ensure repository visibility is set to Public)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/wnd-p9x2a.git
git branch -M main
git push -u origin main
```

---

## ☁️ Step 2: Live Deployment

### Deploy Backend (Heroku or Render):

**Via Heroku CLI:**
```bash
cd backend
heroku login
heroku create windtrack-api-<random-suffix>
git subtree push --prefix backend heroku main
```

**Alternative (Render or Railway - 2 clicks):**
- Create a new Web Service pointing to your GitHub repo (`backend` root directory, start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`).

### Deploy Frontend (Vercel):

```bash
cd frontend
# Install Vercel CLI if needed: npm i -g vercel
vercel
# Link and deploy
# Set environment variable VITE_API_URL to your deployed backend URL
```

Update the links in your `README.md` once deployed!

---

## 🎥 Step 3: Record & Upload Video Demo

1. Open [VIDEO_SCRIPT.md](file:///Users/kratikjain12/Desktop/Interview%20questions/wind-power-dashboard/VIDEO_SCRIPT.md).
2. Start screen recording (OBS, Loom, or QuickTime).
3. **Part 1 (0:00 - 4:45)**: Follow the Client Pitch script while showing `http://localhost:5173` (or your live Vercel URL).
4. **Part 2 (4:45 - 9:30)**: Follow the Tech Lead Review script showing the codebase in VS Code and architecture diagrams.
5. Upload to YouTube as **Unlisted** (so only people with the link can view it).
6. Test the YouTube link in an Incognito window to confirm it plays smoothly without requiring a login.

---

## 📝 Step 4: Complete the Submission Form

Open [https://forms.cloud.microsoft/r/FTX6K2bbnU](https://forms.cloud.microsoft/r/FTX6K2bbnU) in your browser:
1. Enter your candidate contact information.
2. Paste the **Unlisted YouTube video link**.
3. Paste the **Public GitHub repository URL** (e.g., `https://github.com/.../wnd-p9x2a`).
4. Paste the **Live application link** (Vercel / Heroku).
5. Submit the form!
