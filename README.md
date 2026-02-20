# 🧩 Morpheme Matrix Playground

A powerful, teacher-friendly morphology learning app for Grades 2–6.  
Built with **React + TypeScript + Vite + Tailwind CSS**.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (check with `node --version`)
- **npm** v9+ (check with `npm --version`)

### Install & Run

```bash
# 1. Navigate to this folder
cd /Users/melindakarshner/CodeIDK/playground

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Build for production

```bash
npm run build
# Output goes to /dist — deploy to Netlify, GitHub Pages, etc.
```

---

## ✨ Features

### For Students
- 🧩 Pick from 6 built-in morpheme matrices (more coming!)
- Combine **prefixes + base words + suffixes** to build words
- Judge whether each word is **real or made-up** — and justify your answer
- Hear words spoken aloud with the 🔊 button (text-to-speech)
- See your session score and accuracy in real time
- Random combo button for discovery

### For Teachers
- 📊 **Dashboard** with real-time activity overview
- 🏫 **Classes** — create class groups, add students, assign matrices
- 🧩 **Matrix Editor** — build custom morpheme matrices with your own word key
- 📈 **Progress tab** — view per-student accuracy, word history, and justifications
- 🖨️ **Print** student progress reports and blank worksheets

---

## 📁 Project Structure

```
src/
  components/
    student/
      StudentSelect.tsx      # Student login / name selection
      StudentPlayground.tsx  # Main word-building interface
    teacher/
      TeacherDashboard.tsx   # Overview, Classes, Matrices, Progress tabs
      MatrixEditor.tsx       # Create/edit custom morpheme matrices
    shared/
      LandingPage.tsx        # Home screen
      Button.tsx             # Reusable button
      UI.tsx                 # Card, Badge, MorphemeChip, etc.
  context/
    store.ts                 # Zustand global state (persisted to localStorage)
  data/
    matrices.ts              # 6 built-in morpheme matrices
  hooks/
    useSpeech.ts             # Web Speech API hook
  utils/
    export.ts                # Print worksheet / progress report
  types/
    index.ts                 # TypeScript types
```

---

## 🧩 Built-in Matrices

| Matrix | Grade | Theme |
|--------|-------|-------|
| Re- & Un- Actions | 3–4 | Common prefix patterns |
| Greek Roots: Life, Earth & Writing | 4–5 | bio, geo, graph |
| Suffix Power: -tion, -ness, -ful, -less | 3–5 | Noun & adjective formation |
| Latin Roots: Carry, Break & Speak | 4–5 | port, rupt, dict |
| Number Prefixes: 1, 2, 3, 4... | 3–5 | uni, bi, tri, quad |
| Character & Feelings | 3–4 | SEL vocabulary |

---

## 🛠️ Adding More Matrices

Edit `src/data/matrices.ts` and add a new object to `SYSTEM_MATRICES`.  
Or use the **Teacher Dashboard → Create Matrix** button in the app!

---

## 💾 Data Storage

All data (students, progress, custom matrices) is saved to **localStorage** in the browser.  
Nothing is sent to a server — it's fully offline-capable.

To back up or transfer data, use the browser's DevTools → Application → Local Storage,  
or we can add an export/import JSON feature in a future update.

---

## 🔮 Future Ideas

- [ ] Student login with PIN codes
- [ ] AI-powered definition lookup (Claude API)
- [ ] Drag-and-drop word building
- [ ] Animated confetti on correct answers
- [ ] Spaced repetition review mode
- [ ] CSV export of progress data
- [ ] Multiplayer class challenge mode

---

Made with ❤️ for educators and word explorers.
