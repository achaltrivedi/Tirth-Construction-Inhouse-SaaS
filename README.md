# COLS - Construction Inhouse SaaS

**Financial Ledger + Worker Attendance System** bounded in a single service tailored for construction site management and operational tracking.

## 🏗️ Core Context & Architecture
Based on the firm's evolving business logic, here are the key operational paradigms:
- **Decoupled Workers**: Workers are no longer strictly bound to a single fixed site assignment. This enables flexible daily site-based attendance tracking (e.g., a worker can be marked present at Site A on Monday, and Site B on Tuesday).
- **Attendance Tracking**: Removed "master site filters" for attendance in favor of granular, per-date daily entries. Includes capabilities to export detailed attendance reports and breakdown via Excel/CSV.
- **Financial Ledger**: Tracks granular site-wise transactions (Cash Out, Cash In) along with their net values.
- **Audit Logging**: Every core financial transaction and attendance entry intentionally tracks the user who created/marked it, maintaining a persistent and fully traceable audit trail.

## 💻 Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database ORM**: Prisma 6
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js v5 (beta)
- **Icons & UI**: Lucide React

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL database instance (running locally or a cloud provider)

### 2. Environment Variables
Create a `.env` file in the root directory. You will need:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/cols_db"
AUTH_SECRET="your-nextauth-secret-string"
```
*(Tip: You can generate a random auth secret using `npx auth secret`)*

### 3. Database Setup
Run the following commands to initialize your database schema and seed it with initial data (like the default operator/admin credentials):
```bash
# Install dependencies
npm install

# Apply the Prisma schema to the database
npx prisma migrate dev

# Generate the Prisma Client
npx prisma generate

# Seed the database 
npm run prisma:seed
```

### 4. Running the Development Server
Install dependencies and run the Next.js frontend:
```bash
npm run dev
```
The application will be available at [http://localhost:3000](http://localhost:3000). You can view the raw database tables locally by running `npm run prisma:studio`.

## 🤖 Context for AI Assistants
If you are an AI assistant or a new dev picking up this codebase, keep these points in mind:
- **Schema Updates**: Always run `npx prisma generate` immediately after modifying `prisma/schema.prisma` before attempting to fix any TypeScript errors involving missing relations.
- **Worker/Site Logic**: A single worker's root `siteId` is nullable because workers float between sites. Focus instead on `Attendance.siteId` to track where a worker was dispatched to on any specific date.
- **TypeScript Caching**: When NextAuth or Prisma types throw obscure errors (`Conversion of type 'AdapterUser & User'`, or `Object literal may only specify known properties`), verify that Prisma has been generated and IDE TS server cache is refreshed.
