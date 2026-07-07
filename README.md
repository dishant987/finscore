# 💳 AI/ML-Driven MSME Financial Health Score Platform

An advanced, end-to-end financial health assessment platform designed for **New-to-Credit (NTC)** and **New-to-Bank (NTB)** micro, small, and medium enterprises (MSMEs). 

This platform aggregates alternate transactional data feeds, computes a multi-dimensional risk score, visualizes insights, and integrates natively with modern national financial infrastructures: **Account Aggregator (AA)**, **Unified Lending Interface (ULI)**, and the **Open Credit Enablement Network (OCEN)**.

---

## 🚀 Key Features

*   **⚡ Real-Time Ingest & Live Updates:** Real-time transaction webhooks trigger dynamic score recomputation. Updates are broadcast directly to the frontend using **Server-Sent Events (SSE)**.
*   **📂 Multi-Source Data Aggregator:** Normalizes and parses inputs from 5 alternate data sources:
    1.  **GST Portal:** Filing punctuality, liability vs. Input Tax Credit (ITC) checks.
    2.  **UPI / Payment Rails:** Monthly transactional volume, seasonality, and client concentration.
    3.  **Account Aggregator (AA):** Multi-bank statements, average balances, cash flow trends, EMIs, and cheque bounce flags.
    4.  **EPFO Portal:** Headcount metrics, employee vintage, and PF filing compliance.
    5.  **e-Invoice Register:** Invoice cancel ratios and volume compliance.
*   **📊 Multidimensional Scoring Engine:** A scoring framework computing a cash-flow-first overall score (0–100), risk band classification, default probability, and risk tiering based on:
    *   *Cash Flow Health (25% Weight)*
    *   *Compliance (20% Weight)*
    *   *Growth Trajectory (20% Weight)*
    *   *Stability (20% Weight)*
    *   *Debt Serviceability (15% Weight)*
*   **🤖 AI-Powered Lending Insights:** High-quality qualitative underwriting reports generated via a failover-safe LLM router (routing requests through **Gemini**, **Groq**, or **Mistral**).
*   **🛡️ Ecosystem Integrations Hub:**
    *   **Account Aggregator (AA) Consent Sandbox:** A multi-step state machine (`consent_requested` ➔ `consent_approved` ➔ `data_pulled`).
    *   **Unified Lending Interface (ULI):** Returns standard ULI credit reports including default probability, interest rate pricing, and data source checks.
    *   **Open Credit Enablement Network (OCEN):** Simulates LSP-to-Lender handshake schemas.
*   **🌟 High-Fidelity UI/UX:** A stunning dark-mode analytics console styled with vanilla CSS custom variables, glassmorphic widgets, interactive gauges, and custom charts.

---

## 📐 Architecture Overview

Detailed system flow and architecture data can be found in [ARCHITECTURE.md](file:///e:/assigment/Financial%20Health%20Score/ARCHITECTURE.md).

```
                        ┌─────────────────────────────────────────────────────┐
                        │                    MSME Borrower                     │
                        │       (GSTIN, UPI, Bank A/c, EPFO, e-Invoice)       │
                        └────────────┬──────────┬──────────┬──────────────────┘
                                     │          │          │
                     ┌────────────────▼──┐  ┌────▼────┐  ┌──▼─────────────────┐
                     │  GST Portal       │  │   AA    │  │  EPFO Portal       │
                     │  (Mock Connector) │  │(Account │  │  (Mock Connector)  │
                     │                   │  │Aggreg.) │  │                    │
                     └────────┬──────────┘  └────┬────┘  └────────┬───────────┘
                              │                  │                │
                              └──────────────────┴────────────────┘
                                                 │
                                                 ▼
                               ┌─────────────────────────────────────┐
                               │       Data Aggregation Service      │
                               └──────────────┬──────────────────────┘
                                              │
                                              ▼
                               ┌─────────────────────────────────────┐
                               │     Multidimensional Score Engine   │
                               └──────────────┬──────────────────────┘
                                              │
                     ┌────────────────────────┼────────────────────────┐
                     │                        │                        │
                     ▼                        ▼                        ▼
       ┌─────────────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
       │     OCEN / ULI Layer    │  │  Dashboard & API  │  │  Real-time Events    │
       └─────────────────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## 🛠️ Project Structure

```filepath
Financial Health Score/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── controllers/      # Route controllers (auth, msme, score, integrations, etc.)
│   │   ├── core/             # DB setup, security, config
│   │   ├── models/           # SQLModel database tables
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Scoring engine, LLM router, and Data connectors
│   ├── seed.py               # Database initialization and mock data populator
│   └── pyproject.toml        # Backend dependencies (uv setup)
│
├── frontend/                 # Vite + React (TypeScript) Application
│   ├── src/
│   │   ├── api/              # Axios API clients
│   │   ├── components/       # Layout, charts, and common UI elements
│   │   ├── features/         # Core application features (dashboard, onboarding, profiles)
│   │   └── routes/           # Routing configuration
│   └── package.json          # Frontend dependencies
│
└── ARCHITECTURE.md           # Deep-dive architectural documentation
```

---

## ⚙️ Setup & Installation

### Backend Setup (FastAPI)

1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and configure your environment file (`.env`):
   ```bash
   cp .env.example .env
   ```
   Add your Neon database URLs and LLM API keys:
   ```env
   DATABASE_URL=postgresql+asyncpg://...
   GEMINI_API_KEY=your_gemini_key
   ```
3. Install dependencies and run the server using `uv` (recommended):
   ```bash
   uv sync
   uv run uvicorn app.main:app --reload
   ```

### Seeding Mock Data
To populate the database with mock MSME profiles, transactional ledgers, GST records, EPFO logs, and calculated health scores:
```bash
uv run seed.py
```

---

### Frontend Setup (React + Vite)

1. Navigate to the `frontend` folder:
   ```bash
   cd ../frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the dashboard UI at `http://localhost:5173`.

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **POST** | `/score/{id}/compute` | Compute health scores, default probability, and run LLM insights. |
| **POST** | `/msme/ntc/onboard` | Quick onboarding path with alt-data provisional score. |
| **GET** | `/msme/{id}/comparison` | Renders a Traditional vs Alt-Data bureau comparison report. |
| **POST** | `/integrations/uli/credit-report` | Returns a standardized credit report payload for the ULI grid. |
| **POST** | `/integrations/ocen/loan-request` | Performs OCEN LSP-to-Lender handshake schemas. |
| **POST** | `/integrations/aa-consent/request` | Creates an Account Aggregator consent artifact record. |
| **POST** | `/integrations/aa-consent/{id}/approve`| Approves a consent token (mock signature). |
| **POST** | `/integrations/aa-consent/{id}/pull` | Simulates alternate data retrieval from bank feeds. |
| **POST** | `/integrations/ingest/transaction` | Ingestion webhook (auto-recomputes scores). |
| **GET** | `/integrations/events` | SSE Stream endpoint pushing real-time score updates. |
