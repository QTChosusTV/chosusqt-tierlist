# HTML to Next.js TypeScript Conversion Guide

## Key Conversion Steps

### 1. File Structure Changes

**HTML (Single File)**
```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <div class="container">...</div>
    <script>...</script>
  </body>
</html>
```

**Next.js (Multiple Files)**
```
src/
├── app/
│   ├── page.tsx       # Main content
│   ├── layout.tsx     # HTML wrapper
│   └── globals.css    # Styles
└── components/
    └── Component.tsx  # Reusable parts
```

---

### 2. Style Conversion

**HTML (Inline `<style>`)**
```html
<style>
  .row {
    display: grid;
    grid-template-columns: 80px 54px 220px 100px repeat(8, 1fr);
  }
</style>
```

**Next.js (Tailwind)**
```tsx
<div className="grid gap-3.5" style={{
  gridTemplateColumns: '80px 54px 220px 100px repeat(8, 1fr)'
}}>
```

**Or (CSS Modules)**
```css
/* Component.module.css */
.row {
  display: grid;
  grid-template-columns: 80px 54px 220px 100px repeat(8, 1fr);
}
```

```tsx
import styles from './Component.module.css';
<div className={styles.row}>
```

---

### 3. Script to React Conversion

**HTML (Vanilla JavaScript)**
```html
<script>
  const container = document.getElementById("list");
  const { data, error } = await supabase.from("tiers").select("*");
  
  data.forEach(player => {
    const row = document.createElement("div");
    row.className = "row";
    row.textContent = player.username;
    container.appendChild(row);
  });
</script>
```

**Next.js (React + Hooks)**
```tsx
'use client';

import { useEffect, useState } from 'react';

export default function TierList() {
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from("tiers").select("*");
      setPlayers(data);
    }
    fetchData();
  }, []);

  return (
    <div>
      {players.map(player => (
        <div key={player.uuid} className="row">
          {player.username}
        </div>
      ))}
    </div>
  );
}
```

---

### 4. Type Safety

**HTML (No types)**
```javascript
const modes = [
  { key: "axe", icon: "axe.svg" }
];
```

**Next.js TypeScript**
```typescript
interface Mode {
  key: string;
  icon: string;
}

const modes: Mode[] = [
  { key: "axe", icon: "axe.svg" }
];
```

---

### 5. Image Handling

**HTML**
```html
<img src="axe.svg" alt="axe" />
<img src="https://mc-heads.net/avatar/uuid" />
```

**Next.js (Optimized)**
```tsx
import Image from 'next/image';

// Local images
<Image src="/axe.svg" alt="axe" width={54} height={54} />

// Remote images (configure in next.config.mjs)
<Image 
  src={`https://mc-heads.net/avatar/${uuid}`}
  alt="avatar"
  width={54}
  height={54}
/>
```

---

### 6. Class vs className

**HTML**
```html
<div class="row">
```

**Next.js**
```tsx
<div className="row">
```

---

### 7. Dynamic Classes

**HTML (String concatenation)**
```javascript
icon.className = `icon ${m.key} ${tier === "U" ? "u" : tier}`;
```

**Next.js (Template literals)**
```tsx
<div className={`icon ${mode.key} ${tier === "U" ? "u" : tier}`}>
```

**Next.js (Library - clsx/cn)**
```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  "icon",
  mode.key,
  tier === "U" ? "u" : tier
)}>
```

---

### 8. Event Handlers

**HTML**
```javascript
button.onclick = () => console.log('clicked');
button.addEventListener('click', handleClick);
```

**Next.js**
```tsx
<button onClick={() => console.log('clicked')}>
<button onClick={handleClick}>
```

---

### 9. State Management

**HTML (Global variables)**
```javascript
let players = [];
let loading = true;

// Later...
players = data;
loading = false;
```

**Next.js (React State)**
```tsx
const [players, setPlayers] = useState([]);
const [loading, setLoading] = useState(true);

// Later...
setPlayers(data);
setLoading(false);
```

---

### 10. API Calls

**HTML (Top-level await)**
```javascript
const { data } = await supabase.from("tiers").select("*");
```

**Next.js (useEffect)**
```tsx
useEffect(() => {
  async function fetchData() {
    const { data } = await supabase.from("tiers").select("*");
    setPlayers(data);
  }
  fetchData();
}, []); // Empty array = run once on mount
```

---

### 11. Conditionals

**HTML (if statements)**
```javascript
if (tier !== "U") {
  const tooltip = document.createElement("div");
  tooltip.className = "tooltip";
  cell.appendChild(tooltip);
}
```

**Next.js (JSX conditionals)**
```tsx
{tier !== "U" && (
  <div className="tooltip">
    ...
  </div>
)}
```

---

### 12. Loops

**HTML (forEach/for)**
```javascript
data.forEach(player => {
  const row = document.createElement("div");
  container.appendChild(row);
});
```

**Next.js (map)**
```tsx
{data.map(player => (
  <div key={player.uuid}>
    ...
  </div>
))}
```

---

## Complete Comparison

### HTML Version
```html
<script type="module">
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  
  const supabase = createClient(url, key);
  const { data } = await supabase.from("tiers").select("*");
  
  const container = document.getElementById("list");
  
  data.forEach(player => {
    const div = document.createElement("div");
    div.textContent = player.username;
    container.appendChild(div);
  });
</script>
```

### Next.js Version
```tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Player {
  uuid: string;
  username: string;
}

export default function TierList() {
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await supabase.from("tiers").select("*");
      setPlayers(data || []);
    }
    fetchPlayers();
  }, []);

  return (
    <div>
      {players.map(player => (
        <div key={player.uuid}>
          {player.username}
        </div>
      ))}
    </div>
  );
}
```

---

## Quick Reference Table

| HTML | Next.js TypeScript |
|------|-------------------|
| `<div class="">` | `<div className="">` |
| `document.createElement()` | `<Component />` |
| `element.appendChild()` | `{array.map()}` |
| `element.addEventListener()` | `onClick={handler}` |
| `let variable = value` | `const [state, setState] = useState(value)` |
| `<script type="module">` | `'use client'` + `useEffect` |
| `<img src="">` | `<Image src="" width={} height={} />` |
| `<style>` | `globals.css` or Tailwind |
| Global variables | React state/props |
| Top-level await | `useEffect` + async function |

---

## TypeScript Benefits

1. **Type Safety** - Catch errors before runtime
2. **IntelliSense** - Better autocomplete
3. **Refactoring** - Safer code changes
4. **Documentation** - Self-documenting interfaces
5. **Team Collaboration** - Clearer contracts

---

## Common Pitfalls

❌ **Don't**: Use `class` instead of `className`
✅ **Do**: Always use `className`

❌ **Don't**: Mutate state directly
✅ **Do**: Use `setState` functions

❌ **Don't**: Forget `key` prop in lists
✅ **Do**: Add unique `key` to mapped items

❌ **Don't**: Use `var` or forget types
✅ **Do**: Use `const`/`let` with TypeScript types

---

This conversion maintains all functionality while adding:
- Type safety
- Better performance
- Server-side rendering
- Automatic code splitting
- Image optimization
- Better developer experience
