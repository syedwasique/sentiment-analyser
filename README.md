# MindPulse — Natural Language Psychological Diagnostics & Sentiment AI

MindPulse is a Natural Language Processing (NLP) tool that analyzes social media text for sentiment, psychological indicators (depression, anxiety, stress, anger, happiness), sarcasm, and Roman Urdu keywords. It combines a fine-tuned **RoBERTa** model (`twitter-roberta-base-sentiment`), an irony detector (`cardiffnlp/twitter-roberta-base-irony`), and the **NRC Emotion Lexicon** (10-dimensional scoring).

---

## 🚀 System Architecture

- **Backend (`/backend`)**: Flask REST API serving PyTorch ML inference models.
- **Frontend (`/frontend`)**: Modern React application powered by Vite, Tailwind CSS v4, GSAP, Lenis, Framer Motion, Lucide icons, and Recharts.

---

## 💻 Local Development Setup

### 1. Backend (Flask API Server — Port 5000)
Navigate to the `backend/` folder, activate your virtual environment, and start the server:

```bash
cd backend

# Install Python requirements
pip install -r requirements.txt

# Run the Flask backend
python src/app.py
```
*The Flask backend will serve at `http://127.0.0.1:5000`.*

### 2. Frontend (React + Vite App — Port 5173)
Open a second terminal window:

```bash
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```
*The React app will open at `http://localhost:5173`.*

---

## 🎨 Frontend Features & Routes

- **Landing Page (`/`)**:
  - High-impact product showcase with GSAP scroll-triggered animations and Lenis smooth scrolling.
  - Features grid highlighting RoBERTa, NRC Lexicon, Roman Urdu support, sub-50ms latency, and academic validation details.
- **Interactive Dashboard (`/dashboard`)**:
  - Elevated Google Cloud Console dark aesthetic.
  - Interactive sample preset triggers (Anxiety, Depression, Sarcasm, Roman Urdu, Achievement).
  - Multi-tab system (Sentiment & Diagnostics, Class Probabilities, Sarcasm & Features, JSON Response).
  - Calm, informative psychological risk alert callout.
  - 5-axis Radar chart and animated bar charts via Recharts.

---

## 📦 Production Build & Deployment

### Option A: Static Production Build
To create a production bundle of the React frontend:

```bash
cd frontend
npm run build
```
This generates optimized static assets inside `frontend/dist/`.

### Option B: Flask Static File Serving
Flask can serve the `frontend/dist` static build directly by pointing `static_folder` to `frontend/dist`.

### Option C: Decoupled Cloud Deployment
- **Frontend**: Deploy `/frontend` to Vercel, Netlify, or Cloudflare Pages.
- **Backend**: Deploy Flask + PyTorch to Railway, Render, or GCP Cloud Run. Set `VITE_API_BASE_URL` in the frontend to point to the backend URL.
