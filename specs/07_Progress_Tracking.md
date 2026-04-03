# 07_Progress_Tracking

## Overview
The Progress Tracking feature addresses the user's need to track the status of 360 feedback requests they have initiated. It replaces the old statistical top cards with a streamlined, action-oriented "My Requests & Progress" tracking list directly on the Dashboard.

## Core Features
1. **My Requests & Progress Section:**
   - Displays a list of all `Nominations` where the current user is the requester.
   - Integrated status and progress bar UI.
2. **Dynamic Statuses:**
   - **主管審核中 (Pending Manager):** When nomination status is `Pending`. Progress is 0. Button: `提醒主管` (Remind Manager).
   - **收集中 (Collecting):** When nomination status is `Approved` but completed responses < total reviewers. Button: `一鍵催繳` (One-click Nudge).
   - **已結案 (Completed):** When nomination status is `Approved` and completed responses == total reviewers. Button: `查看 AI 報告` (View AI Report).
3. **Empty State Onboarding:**
   - If the user has no initiated requests AND no pending evaluation tasks, the system hides the list containers and displays only the dark "How to start" guide section, acting as a clean onboarding screen.
4. **Pending Approvals (Manager only):**
   - Visible only to users with `isManager: true`.
   - Displays nominations from subordinates with `Pending` status.
   - UI includes subordinate avatar, name, nomination title, and reviewer count.
   - Actions: 
     - **一鍵核准 (Quick Approve)**: Immediately updates status to `Approved` and triggers Slack notifications to reviewers.
     - **詳細審核 (Detailed Review)**: Navigates to the full `Approvals` tab.
5. **Action Consistency:**
   - Tracking action buttons use a secondary, clean style (white bg, gray border) to contrast with the primary "start evaluation" action items.

## Database & API
- Relies on existing `nominations` table.
- A new API method `api.getFeedbacksByNominationIds` is introduced to batch-fetch completed feedback IDs to compute the progress (# of submissions vs `reviewer_ids.length`).

## Sorting Logic
List items are sorted by urgency:
1. `收集中` (Actionable)
2. `主管審核中` (Pending)
3. `已結案` (Done)
Within the same status, items are sorted by `createdAt` descending (newest first).
