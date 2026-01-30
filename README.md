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

## 🛠️ Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file:

```bash
cp .env.local.example .env.local
```

Update with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_KEY=your_supabase_key
```

### 3. Add Mode Icons

Place your SVG icons in the `public/` folder:
- `axe.svg`
- `sword.svg`
- `smp.svg`
- `mace.svg`
- `uhc.svg`
- `nethop.svg`
- `vanilla.svg`
- `pot.svg`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📊 Supabase Database Schema

Your `tiers` table should have the following columns:

```sql
CREATE TABLE tiers (
  uuid TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  axe TEXT,
  smp TEXT,
  sword TEXT,
  mace TEXT,
  uhc TEXT,
  nethop TEXT,
  vanilla TEXT,
  diapot TEXT
);
```

Tier values: `LT6`, `HT6`, `LT5`, `HT5`, `LT4`, `HT4`, `LT3`, `HT3`, `LT2`, `HT2`, `LT1`, `HT1`

## 🎨 Features

- ✅ **Full TypeScript** - Type-safe components and data
- ✅ **Responsive Grid** - Adapts to different screen sizes
- ✅ **Hover Tooltips** - Show tier details on hover
- ✅ **Point Calculation** - Automatic ranking system
- ✅ **Tie Handling** - Proper rank display for tied scores
- ✅ **Image Optimization** - Next.js Image component
- ✅ **Loading States** - User-friendly loading indicators
- ✅ **Error Handling** - Graceful error messages

## 📝 Key Type Definitions

### Player Type
```typescript
interface Player {
  uuid: string;
  username: string;
  axe?: string;
  smp?: string;
  sword?: string;
  mace?: string;
  uhc?: string;
  nethop?: string;
  vanilla?: string;
  diapot?: string;
}
```

### Tier Point System
- LT6: 1 point
- HT6: 4 points
- LT5: 9 points
- HT5: 16 points
- LT4: 25 points
- HT4: 36 points
- LT3: 49 points
- HT3: 64 points
- LT2: 81 points
- HT2: 100 points
- LT1: 121 points
- HT1: 144 points

## 🚢 Deployment

### Vercel (Recommended)

```bash
npm run build
```

Deploy to [Vercel](https://vercel.com):
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Other Platforms

Works on any platform supporting Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with `npm start`

## 🔧 Customization

### Change Colors

Edit `src/app/globals.css` to modify tier and mode colors:

```css
.color-HT1 { color: #ffffff; }
.color-axe { color: #4aa3ff; }
```

### Add More Modes

1. Update `MODES` in `src/types/tierlist.ts`
2. Add icon to `public/`
3. Update database schema
4. Update TypeScript types

## 📄 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📜 License

MIT
