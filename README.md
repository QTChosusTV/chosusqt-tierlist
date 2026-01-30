# ChosusQT's Tier List - Next.js TypeScript

A fully-typed Next.js application for displaying Minecraft PvP tier rankings with Supabase integration.

## 🚀 Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** (Strict mode)
- **Tailwind CSS** (Utility-first styling)
- **Supabase** (Database & real-time)
- **React 18** (Server & Client Components)

## 📁 Project Structure

```
tier-list-nextjs/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Home page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles + Tailwind
│   ├── components/
│   │   ├── TierList.tsx      # Main tier list component
│   │   ├── PlayerRow.tsx     # Individual player row
│   │   └── TierCell.tsx      # Tier cell with tooltip
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   └── utils.ts          # Utility functions
│   └── types/
│       ├── database.ts       # Supabase database types
│       └── tierlist.ts       # Tier list types & constants
├── public/
│   ├── axe.svg              # Mode icons (add your SVGs here)
│   ├── sword.svg
│   ├── smp.svg
│   ├── mace.svg
│   ├── uhc.svg
│   ├── nethop.svg
│   ├── vanilla.svg
│   └── pot.svg
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
