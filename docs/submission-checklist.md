# WindScope UK — Submission Checklist

This checklist documents all deliverables, URLs, and verification steps required for final assignment submission.

---

## 1. Submission Deliverables Summary Table

| Requirement | Value / Status | Verification Notes |
| :--- | :--- | :--- |
| **Project Name** | **WindScope UK** | Full-stack UK wind forecast analytics platform |
| **Delivery Dates Supported** | **1 Jan 2026 – 31 Jan 2026** | Verified against official Elexon BMRS API |
| **Backend Framework** | **FastAPI (Python 3.11+)** | 31/31 unit & integration tests passing |
| **Frontend Framework** | **React 18 + Vite 5** | 4/4 Vitest suites passing |
| **Containerization** | **Docker & Docker Compose** | Multi-stage Dockerfiles provided |
| **Public GitHub Repo URL** | *To be finalized upon repository push* | Anonymous repository name |
| **Public Deployed Frontend URL** | `https://windscope-uk.vercel.app` (or Vercel preview) | Configured in `frontend/vercel.json` |
| **Public Backend Health URL** | `https://windscope-uk-backend.onrender.com/api/health` | Configured with CORS for frontend |
| **Demo Video (Unlisted YouTube)** | *To be recorded by developer using docs/demo-script.md* | Max 10 minutes total |
| **AI Tool Disclosure** | **Included in README.md** | Complete and explicit statement |

---

## 2. Step-by-Step Repository Creation & Publishing (Anonymous)

To fulfill the requirement for a public GitHub repository using an anonymous, neutral name:

1. **Create a new public GitHub repository** using a neutral name (e.g. `windscope-uk-analytics` or `aero-procure-uk`):
   ```bash
   # Add remote
   git remote add origin https://github.com/<your-anonymous-org-or-user>/windscope-uk-analytics.git
   
   # Push to main branch
   git branch -M main
   git push -u origin main
   ```
2. Verify that the repository is **Public** and accessible in an Incognito browser window without login.

---

## 3. Step-by-Step Vercel Deployment

1. **Deploy Frontend to Vercel:**
   ```bash
   cd frontend
   vercel --prod
   ```
   Set the production environment variable:
   `VITE_API_BASE_URL = <your_backend_url>`
2. **Deploy Backend (FastAPI):**
   - Option A (Vercel Serverless): Deploy using the root `vercel.json` and `api/index.py` serverless bridge.
   - Option B (Render / Fly.io / Railway container): Deploy the `backend/Dockerfile` with one command and copy the health URL into the frontend environment.

---

## 4. Final Submission Verification Checklist

- [x] All 31 backend tests pass (`pytest backend/tests -v`).
- [x] All 4 frontend test files pass (`npm test` in `frontend/`).
- [x] Production build passes (`npm run build` in `frontend/`).
- [x] Docker Compose configuration validated (`docker compose config`).
- [x] As-of forecast selection algorithm verified (`publishTime <= cutoff`).
- [x] January 2026 date bounds enforced (rejects dates outside Jan 2026 with HTTP 400).
- [x] Accurate metrics calculation verified (MAE, RMSE, Bias, WAPE).
- [x] WAPE zero-actual denominator handled gracefully without exceptions.
- [x] Missing intervals rendered as dashes without being manufactured or forced to zero.
- [x] CSV export streams valid data matching the UI.
- [x] Both 5-minute presentation scripts created in `docs/demo-script.md`.
- [x] Comprehensive README with Mermaid architecture diagram and AI tools disclosure.
