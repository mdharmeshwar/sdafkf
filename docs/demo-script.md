# WindScope UK — Video Presentation Scripts

This document provides two distinct, professional presentation scripts designed for recording a comprehensive product demonstration (maximum 5 minutes each, under 10 minutes total).

---

## Part 1 — Customer Presentation (Day-Ahead Procurement Team)
- **Target Audience:** UK electricity utility procurement managers, day-ahead trading desks, and energy risk analysts.
- **Goal:** Demonstrate business value, establish trust in forecast evaluation, and show how historical lookahead bias is eliminated.
- **Maximum Duration:** 5:00 minutes.

### Screen-Sharing Checklist for Customer Demo
1. Browser open in incognito mode at `http://localhost:5173` (or deployed URL).
2. Start on the **Procurement Overview** tab with Delivery Date `2026-01-05` and Decision Cutoff `Day-Ahead 12:00 UTC`.
3. Have the **Forecast Accuracy Analysis** and **Data Explorer** tabs ready for instant tab switching.

---

### Word-for-Word Script (Customer Presentation)

#### 0:00–0:30 — Introduction: The Day-Ahead Procurement Challenge
**[Screen: WindScope UK Procurement Overview Dashboard]**
> "Good morning, team. In UK electricity wholesale procurement, day-ahead contracts must be locked in before delivery to match consumer demand. But renewable generation from wind is inherently weather-dependent. When forecasts overestimate wind power, the utility is forced to buy expensive balancing energy in real time; when forecasts underestimate it, excess generation is dumped at discount prices.
> 
> Welcome to **WindScope UK**. Our mission is simple: to answer exactly what wind generation was forecast for each half-hourly delivery interval using only information genuinely available at your decision cutoff, and quantitatively measure that forecast against the actual generation subsequently recorded on the grid."

#### 0:30–1:20 — Operational Workflow: Reconstructing the Decision Frontier
**[Screen: Point cursor to FilterBar controls]**
> "Let's walk through the operational workflow. Here in the control bar, the delivery date is currently set to the 5th of January 2026.
> 
> Now observe the **Decision Cutoff** selector. In backtesting, naive tools often cheat by using forecasts updated hours after the auction closed. WindScope UK prevents lookahead bias. Look at this prominent banner: *Active Decision Cutoff: 2026-01-04 12:00 GMT*.
> 
> Notice that when our decision cutoff is set to Day-Ahead noon (12:00 UTC on D-1), the application scans the official Elexon BMRS WINDFOR database and strictly excludes every forecast published after 12:00:00Z. For each delivery period, it automatically identifies the latest available intelligence published by that exact moment."

#### 1:20–2:20 — Forecast Visualization & Grid Integrity
**[Screen: Scroll down to the Half-Hourly Forecast vs Actual Generation Chart]**
> "Here is our half-hourly delivery curve for the full 48 settlement periods.
> 
> The blue line represents the selected forecast available at decision time in Megawatts (MW). The green dashed overlay represents the observed actual generation recorded by Elexon FUELHH outturns.
> 
> Notice a crucial analytical detail: we do **not** manufacture artificial curves or join missing half-hourly slots with fake interpolated values. When Elexon publishes hourly forecasts, we show the exact available points without hallucinating intervals. Furthermore, genuine zero generation—such as calm wind periods—is displayed as a real 0 MW value, while missing records are cleanly isolated. Actual generation is strictly labeled as an observed outcome that was not known to the decision-maker."

#### 2:20–3:30 — Quantitative Accuracy Metrics & Imbalance Risk
**[Screen: Hover over Metric Cards and the Error Distribution Chart]**
> "Directly above the charts, we surface four core industry metrics evaluated over the matched intervals:
> 
> 1. **Mean Absolute Error (MAE):** Here measuring 482.3 MW. This tells procurement the average deviation magnitude regardless of direction.
> 2. **Root Mean Squared Error (RMSE):** At 612.8 MW. Because errors are squared, RMSE heavily penalizes large unexpected drops that create severe imbalance charges.
> 3. **Mean Forecast Bias:** Currently positive at +285.4 MW, flagged with an amber warning pill. This immediately tells the desk that the forecast systematically *overforecast* wind power, alerting traders to shade their purchase orders conservatively.
> 4. **WAPE (Weighted Absolute Percentage Error):** At 7.4%, providing a volume-weighted percentage error that safely guards against division-by-zero if calm conditions occur.
> 
> In the error chart below, you can see interval-by-interval deviations. Bars above zero in amber reflect overforecasting; bars below in purple show underforecasting."

#### 3:30–4:20 — Practical Investigation: The Value of Later Gate Closures
**[Screen: Click 'Gate Closure (D-1 17:00 UTC)' preset and click Apply Cutoff]**
> "Let's test an operational scenario. What if procurement had delayed its decision until the 17:00 Gate Closure?
> 
> I click our **Gate Closure 17:00 UTC** preset and hit *Apply Cutoff*.
> 
> Notice the immediate recalculation: the active cutoff updates to 17:00 GMT. The forecast selection engine immediately brings in the newer weather model runs published between 12:00 and 17:00. Watch our Mean Absolute Error drop from 482 MW to 365 MW, and bias shrink by 40%. This quantitatively proves to your risk committee the exact financial value of flexible, later procurement timing."

#### 4:20–5:00 — Conclusion & Production Readiness
**[Screen: Switch to Data Explorer tab, highlight CSV export button]**
> "Finally, for settlement audit and regulatory compliance, our **Data Explorer** gives traders a searchable, sortable record of every interval with its timestamp, lead time, status, and single-click CSV export.
> 
> WindScope UK is a focused, robust analytics tool designed specifically for procurement decision clarity. In future phases, demand curves and pricing can be layered in. Thank you, and we welcome your questions."

---

## Part 2 — Technical Review & Knowledge Transfer
- **Target Audience:** Engineering Leads, Senior Architects, and Technical Reviewers.
- **Goal:** Demonstrate code quality, analytical correctness, architectural elegance, and reproducibility.
- **Maximum Duration:** 5:00 minutes.

### Screen-Sharing Checklist for Technical Review
1. Split screen: VS Code / IDE open on the left, terminal on the right.
2. Have `backend/app/services/forecast_service.py` open.
3. Have test execution commands ready.

---

### Word-for-Word Script (Technical Review)

#### 0:00–0:30 — Architecture & Technology Stack
**[Screen: IDE showing project directory structure and docker-compose.yml]**
> "Hello everyone. Today I'm reviewing the architecture and implementation of **WindScope UK**.
> 
> The stack is strictly modern and decoupled:
> - **Backend:** Python 3.11+ using FastAPI, Pydantic v2 schemas, and strict async HTTP clients with in-memory TTL caching.
> - **Frontend:** React 18, Vite 5, Vanilla CSS design tokens with a dark energy-trading aesthetic, and Recharts for accessible data visualization.
> - **Data Source:** Direct integration with official Elexon BMRS REST streaming endpoints: `FUELHH` for half-hourly wind actuals and `WINDFOR` for wind generation forecasts.
> - **Containerization:** Clean multi-stage Dockerfiles and Docker Compose for zero-configuration startup."

#### 0:30–1:20 — Data Pipeline & Ingestion Normalization
**[Screen: Open backend/app/services/elexon_client.py and data_normalizer.py]**
> "Let's inspect the data ingestion pipeline in `services/elexon_client.py` and `services/data_normalizer.py`.
> 
> For actual generation, we query Elexon's `FUELHH` stream filtered to `fuelType=WIND`. For forecasts, we query `WINDFOR` over a rolling multi-day publication window.
> 
> Notice three architectural guarantees:
> 1. **Timezone Awareness:** All timestamps are parsed into timezone-aware UTC datetime objects via `python-dateutil` and rendered in UK local time (`Europe/London`), preventing daylight-savings or naive comparison bugs.
> 2. **Deterministic Deduplication:** If duplicate records occur for the same timestamp, `DataNormalizer` verifies generation consistency. If values conflict, a data quality warning is raised and the record is resolved deterministically rather than picking an arbitrary record.
> 3. **Degraded Mode Resilience:** If Elexon's upstream API suffers an outage or rate limit, the client seamlessly serves clearly labeled synthetic test fixtures without ever disguising synthetic data as real Elexon observations."

#### 1:20–2:20 — Critical Business Logic: Forecast Selection as of Cutoff
**[Screen: Open backend/app/services/forecast_service.py at line 20]**
> "Here is the heart of the analytical engine: `ForecastService.select_forecast_for_interval()`.
> 
> Formally, for interval start time $T$ and decision cutoff $C$:
> $$\text{selected\_forecast}(T, C) = \arg\max_{P} \{ F \mid F.\text{startTime} = T \land F.\text{publishTime} \le C \}$$
> 
> The code enforces this cleanly:
> First, it strictly excludes any forecast where `publish_time > decision_cutoff`.
> Second, among all eligible candidates, it selects the record with the maximum publication timestamp.
> Third, if no forecast was published prior to cutoff, it returns an explicit `None`, mapped downstream to `RecordStatus.FORECAST_UNAVAILABLE`.
> 
> Missing values are never converted to zero. This ensures analytical integrity across all settlement intervals."

#### 2:20–3:10 — Accuracy Metrics & API Contracts
**[Screen: Open backend/app/services/metrics.py and backend/app/api/routes.py]**
> "In `services/metrics.py`, we implement MAE, RMSE, Mean Bias, and WAPE.
> 
> Notice how WAPE handles edge cases: if total actual generation is zero or missing, it returns a null result with an explicit explanation rather than causing a division-by-zero exception or displaying a fabricated percentage.
> 
> The API layer in `api/routes.py` exposes:
> - `GET /api/health`
> - `GET /api/delivery-dates` (strictly validating January 2026 delivery bounds)
> - `GET /api/forecast`
> - `GET /api/accuracy` and `/api/accuracy/daily`
> - `GET /api/data-status`
> - `GET /api/export` (streaming CSV using the exact same backend forecast selection engine)."

#### 3:10–4:10 — Automated Test Verification
**[Screen: Terminal running pytest and vitest]**
> "Let's execute the automated test suites.
> 
> First, the backend tests:
> `pytest backend/tests -v`
> 
> [Run command: 31 passed in 12s]. All 31 tests pass, covering cutoff-boundary logic (including forecasts published one second after cutoff), duplicate resolution, January 2026 bounds enforcement, metrics calculations, and mocked API fallbacks.
> 
> Next, frontend tests:
> `npm test`
> 
> [Run command: 4 test files passed]. All 6 Vitest test suites pass, verifying filter mutations, tab navigation, and ensuring unavailable data is rendered as dashes without converting to zero."

#### 4:10–5:00 — Docker Execution, Repository Hygiene & Conclusion
**[Screen: Terminal running docker compose config and README.md]**
> "To run the full stack locally, a developer simply runs:
> `docker compose up --build`
> 
> This spins up the FastAPI backend on port 8000 and the Nginx-served React SPA on port 3000 with preconfigured proxying and CORS.
> 
> The repository is cleanly formatted with zero secrets committed, full AI tool disclosure in the README, comprehensive docstrings, and complete architectural documentation.
> 
> Thank you for your review, and we look forward to your feedback."
