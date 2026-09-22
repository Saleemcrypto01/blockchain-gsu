# Build a complete, production-quality Blockchain-Based Final Year Project Repository System from...

Build a complete, production-quality “Blockchain-Based Final Year Project Repository System” from scratch.

Use the attached reference image as the PRIMARY visual design reference. Match its overall UI language closely: dark navy sidebar, blue primary color, white/light dashboard cards, compact tables, rounded buttons, status badges, top navbar, spacing, typography, icons, borders and professional university/admin dashboard appearance. Do not create a generic template.

TECH STACK

Frontend:

- React

- Vite

- JavaScript

- HTML

- Tailwind CSS

Backend:

- Supabase as the complete backend

- Supabase Auth

- PostgreSQL database

- Supabase Storage

- Row Level Security (RLS)

- Supabase Edge Functions where server-side logic is required

Blockchain:

- Solidity smart contract

- Web3 integration

- Store document/project hash, project ID, submission ID, timestamp and transaction reference on-chain

- NEVER store PDF files directly on blockchain

- Store actual documents in Supabase Storage

- Implement real hash generation and blockchain verification, not a fake UI

IMPORTANT:

Lovable must implement and configure the complete Supabase backend architecture required by the application. Do not leave backend functionality as placeholders, mock APIs or TODOs.

AUTHENTICATION & REGISTRATION

Create THREE clearly separated registration options on the authentication page:

1. STUDENT REGISTRATION

Fields:

- Email

- Password

- Matriculation Number (example: UG22/SCCS/1001)

Student registration must create the appropriate user profile and assign the STUDENT role automatically.

2. SUPERVISOR REGISTRATION

Fields:

- Email

- Password

Supervisor registration must create the appropriate profile and assign the SUPERVISOR role automatically.

3. ADMIN REGISTRATION

Fields:

- Email

- Password

Admin registration must create the appropriate profile and assign the ADMIN role.

The registration UI must visually separate these three options clearly, for example:

“Register as Student”

“Register as Supervisor”

“Register as Admin”

Do not allow users to select an arbitrary role from a normal dropdown and gain another role.

Implement secure role-based authorization using Supabase Auth metadata/database roles and PostgreSQL RLS. Admin privileges must never depend only on frontend code.

APPLICATION ROLES

STUDENT:

- Dashboard

- My Project

- Create Project

- Submit Project

- Submission History

- Project Version History

- Blockchain Verification

- Profile

Students can create and manage their own project, upload PDF documents, save drafts, submit projects, see supervisor feedback and track submission status.

SUPERVISOR:

- Dashboard

- Assigned Projects

- Project Details

- Review Submissions

- Review History

- Blockchain Verification

- Profile

Supervisors can only access projects assigned to them. They can review submissions, download documents, approve submissions or request revisions and leave review comments.

ADMIN:

- Dashboard

- Manage Students

- Manage Supervisors

- Assign Supervisors

- Manage Projects

- Manage Submissions

- Blockchain Records

- Audit Logs

- System Settings

- Profile

Admin can manage the entire repository, users, projects, supervisor assignments, submissions, blockchain records and audit logs.

PROJECT WORKFLOW

Student:

Create Project → Save Draft → Upload PDF → Submit → Supervisor Review → Approved / Revision Requested → Final Submission

Implement proper status transitions and prevent users from bypassing workflow rules from the frontend.

DOCUMENT HANDLING

- Accept PDF project documents

- Validate file type and size

- Store documents securely in Supabase Storage

- Generate SHA-256 hash for every submitted document

- Save document metadata and hash in PostgreSQL

- Record the hash/provenance on blockchain

- Maintain submission/version history

- Never store the actual PDF on-chain

BLOCKCHAIN VERIFICATION

Create a professional Blockchain Verification page.

It must allow an authorized user to verify a project document by:

1. Reading the stored document hash

2. Calculating/comparing the document hash

3. Reading the blockchain record

4. Comparing the blockchain hash

5. Showing a clear verification result:

   - VERIFIED

   - NOT VERIFIED

Display relevant information such as:

- Project ID

- Submission ID

- Document hash

- Blockchain transaction hash

- Timestamp

- Verification status

DATABASE

Design a proper relational Supabase PostgreSQL database including appropriate tables for:

- Profiles / Users

- Student Profiles

- Supervisor Profiles

- Projects

- Project Submissions

- Project Versions

- Reviews

- Supervisor Assignments

- Blockchain Records

- Audit Logs

- Notifications

Create proper foreign keys, indexes, constraints, timestamps and relationships.

SECURITY

Implement real Supabase Row Level Security.

Students can only access their own profile, projects, submissions and related records.

Supervisors can only access projects assigned to them and their related reviews.

Admins can manage authorized system data.

Protect sensitive operations through secure server-side logic / Edge Functions where appropriate.

Never trust role information supplied by the client.

LANDING PAGE

Create a beautiful, modern, professional landing page before authentication.

Include:

- Professional hero section

- Strong project title

- Short explanation of the blockchain-based repository

- “Get Started” / “Login” buttons

- Features section

- How It Works section

- Blockchain verification explanation

- Student / Supervisor / Admin role overview

- Security section

- Professional footer

The landing page should look like a real university technology product, not a simple student template.

DASHBOARD UI

Follow the attached reference image closely.

Use:

- Dark navy left sidebar

- Professional top navbar

- Blue primary buttons

- White/light cards

- Blue/green/orange/red status badges

- Clean tables

- Dashboard statistics

- Rounded cards

- Consistent icons

- Responsive layouts

- Proper loading, empty and error states

Create separate dashboards for Student, Supervisor and Admin.

QUALITY REQUIREMENTS

Build this as a complete working website, not a prototype.

Every button, navigation item, form, table action and workflow must perform its intended function.

Use reusable React components and clean architecture.

Do not use fake data for core application functionality.

Do not leave TODOs, placeholder pages, fake blockchain verification, fake authentication or disconnected UI.

Test the important user flows:

Registration → Login → Dashboard → Project Creation → PDF Upload → Submission → Supervisor Assignment → Supervisor Review → Revision/Approval → Blockchain Hash → Blockchain Verification.

Make sure the application works correctly after deployment using Supabase environment variables and the configured blockchain network.

Before considering the project complete, inspect the entire application for broken routes, authorization issues, missing database relationships, incorrect RLS policies, non-functional buttons, console errors and inconsistent UI.

The final result should feel like a polished, production-quality university blockchain repository platform rather than a basic CRUD application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c99cd62e-f48e-467c-953d-67195affa0e2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
