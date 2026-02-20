this doc is not instructions for ai, only a personal note on what I learned from this project.

YOUR ProjectVAGE (React + Express)        OUR RentalManagement (Next.js App Router)
──────────────────────────────────         ────────────────────────────────────────

ProjectVAGE/                               RentalManagementSystem/
├── server.js          ← Express entry     ├── (no server.js — Next.js IS the server)
├── db.js              ← DB connection     ├── src/lib/db.ts        ← same role
├── routes/            ← API endpoints     ├── src/app/api/         ← same role, different syntax
│   ├── signup.js                          │   ├── concerts/route.ts
│   ├── login.js                           │   ├── orders/route.ts
│   ├── posts.js                           │   ├── devices/route.ts
│   └── upload.js                          │   └── availability/route.ts
├── middleware/                            ├── src/middleware.ts     ← Next.js built-in
│   └── auth.js                            │
├── client/            ← SEPARATE React    ├── src/app/         ← Pages live HERE (no separate client/)
│   ├── src/                               │   ├── layout.tsx        ← replaces index.html
│   │   ├── App.js     ← React Router      │   ├── page.tsx          ← landing page (/)
│   │   ├── Home.jsx                       │   ├── [locale]/
│   │   ├── Login.jsx                      │   │   └── [clientId]/
│   │   ├── Posts.jsx                      │   │       ├── page.tsx  ← calendar (main)
│   │   ├── NewPost.jsx                    │   │       ├── orders/
│   │   └── Profile.jsx                    │   │       │   ├── page.tsx
│   └── public/                            │   │       │   ├── create-concert/page.tsx
│       └── index.html                     │   │       │   └── create-order/page.tsx
│                                          │   │       └── inventory/page.tsx
├── .env                                   ├── .env
├── package.json       ← server deps       ├── package.json    ← ONE package.json for everything
└── client/package.json ← client deps      └── (no second package.json)
