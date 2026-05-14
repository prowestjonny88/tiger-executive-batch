# ESUM x RExharge Case Study Competition - Briefing Key Points

## Implementation Status Note
This file summarizes organizer competition context and delivery constraints.

It is not the source of truth for the live application architecture. The current runtime direction is:
- Round 1 package-backed diagnosis from `data/round1/`
- taxonomy-first triage contract
- Postgres + pgvector primary persistence
- resolver-tier routing as the live decision backbone

For implementation truth, prefer:
- `docs/OmniTriage_Comprehensive_Execution_Plan.md`
- `docs/OmniTriage_Technical_Architecture.md`
- `docs/progress_tracker.md`
- `docs/prd_task_breakdown.md`

## 1. About RExharge / RECharge Xolutions
- Malaysia-based sustainable energy company founded in **2021**.
- Provides end-to-end renewable energy solutions and infrastructure.
- Core offerings:
  - EV charging solutions for residential, commercial, and industrial use
  - EV charger installation, operation, and maintenance
  - Solar PV and energy storage integration
  - Smart energy management
- Mission: accelerate the transition to electric mobility and sustainable energy.
- Vision: become a leading e-mobility charging infrastructure solutions provider in Malaysia.

## 2. Competition Purpose / Expected Learning Outcomes
The briefing frames the competition as a practical engineering and product challenge. Expected outcomes include:
- applying theory to real-world energy and infrastructure problems
- building a functional MVP as proof of work
- learning Malaysia's green-tech, tariff, and renewable-energy context
- bridging software engineering, electrical design, and business logic
- using data analytics and AI to improve financial and operational efficiency
- improving technical pitching through demos and structured reports

## 3. Competition Timeline
- **1 Apr 2026, 8:00 pm** - Online briefing session
- **3 Apr 2026, 11:59 pm** - Theme selection deadline
- **4-10 Apr 2026** - Round 1 / first dataset release
- **22-24 Apr 2026** - Mentoring Session 1 (online) + Round 2 data release
- **22 May 2026, 11:59 pm** - Proposal + MVP submission deadline
- **26 May 2026** - Finalist announcement
- **29 May 2026** - Mentoring Session 2 (physical)
- **8-12 Jun 2026** - Round 3 / final dataset release window
- **12 Jun 2026** - Pitching / D-Day

## 4. Data Release Structure
### Round 1: Data and Photos
Data for all themes is distributed through Google Drive after teams choose their topics.
- Theme 1: load profile data (no solar and with solar)
- Theme 2: faulty EV charger photos with solved explanation
- Theme 3: rooftop photos, TNB bill, solar PV products

Important note:
- every group must build a **working MVP** to test the given data with its own algorithm and demonstrate accuracy
- Theme 2 teams get an **additional 30-minute briefing** (date TBC)

### Round 2: Alpha Testing
- During Mentoring Session 1, each group is expected to already have a **working MVP**
- A **new dataset** will be given during the session
- Each group **must test using its own algorithm**
- The goal of Mentoring Sessions 1 and 2 is to improve **accuracy and efficiency**
- Marked **subject to change**

### Round 3: Deployment
- Final datasets are released before D-Day
- Each theme may receive the new dataset anywhere from **1 day to 30 minutes before D-Day**
- Timing depends on evaluation of team performance during Mentoring Session 2
- Marked **subject to change**

## 5. Important Competition Rules / Reminders
- Teams must attend:
  - the online briefing session
  - Mentoring Session 1
- All groups must submit a **proposal by 22 May, 11:59 pm** to qualify for finals
- Finalists are announced in the WhatsApp group
- Final qualifying groups must attend **physical Mentoring Session 2**
- All participants must join the participants' WhatsApp group
- Updated judging rubric and handbook will be announced in the WhatsApp group

## 6. Submission / Deliverables
### Required Submission Mode
- hand in via Google Form

### What Is Submitted
- **Working MVP**
- **Demo video** (max 10 minutes)
- **Technical report (PDF)**

### Technical Report Requirements
- Maximum **10 pages**
- Font: **Times New Roman, size 12**
- Line spacing: **1.15**
