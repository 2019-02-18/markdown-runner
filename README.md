# Markdown Runner

> Enhance Markdown code blocks on any webpage — copy, run, diff, and more.

A Chrome extension (Manifest V3) that supercharges code blocks on any webpage. Works on GitHub, dev.to, Medium, Stack Overflow, and everywhere else.

## Features

### 1. One-Click Copy

Hover over any code block to reveal a **Copy** button. Copies clean code without line numbers or language tags.

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
console.log(greet("World"));
```

### 2. Language Labels

Automatically detects the language from `class="language-xxx"` and shows it in the top-left corner.

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

for i in range(10):
    print(fibonacci(i), end=" ")
```

### 3. Line Numbers

Optional line numbers for easy reference ("there's a bug on line 12").

```rust
use std::collections::HashMap;

fn word_count(text: &str) -> HashMap<&str, usize> {
    let mut map = HashMap::new();
    for word in text.split_whitespace() {
        *map.entry(word).or_insert(0) += 1;
    }
    map
}

fn main() {
    let text = "hello world hello rust world";
    let counts = word_count(text);
    for (word, count) in &counts {
        println!("{}: {}", word, count);
    }
}
```

### 4. Code Folding

Long code blocks (20+ lines by default) are automatically collapsed with a "Show more" button.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  updatedAt: Date;
}

interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

async function fetchUsers(): Promise<ApiResponse<User[]>> {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return {
    data: data.users,
    status: response.status,
    message: 'Success',
  };
}

async function getUserById(id: number): Promise<User | null> {
  const response = await fetch(`/api/users/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function formatUser(user: User): string {
  return `${user.name} (${user.email}) - ${user.role}`;
}

async function main() {
  const { data: users } = await fetchUsers();
  for (const user of users) {
    console.log(formatUser(user));
  }
}
```

### 5. Code Runner (Killer Feature!)

JavaScript, HTML/CSS, and TypeScript code blocks get a **Run** button. Execute code right in the page!

#### JavaScript

```javascript
// Array manipulation
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const evens = numbers.filter(n => n % 2 === 0);
console.log("Evens:", evens);

const doubled = numbers.map(n => n * 2);
console.log("Doubled:", doubled);

const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log("Sum:", sum);

console.log("Average:", sum / numbers.length);
```

#### HTML + CSS

```html
<style>
  .card {
    font-family: system-ui, sans-serif;
    max-width: 300px;
    padding: 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  }
  .card h2 { margin: 0 0 8px; }
  .card p { margin: 0; opacity: 0.9; }
</style>
<div class="card">
  <h2>Markdown Runner</h2>
  <p>Run this code block to see a beautiful card rendered right here!</p>
</div>
```

### 6. Diff Mode

When two consecutive code blocks share the same language, a **Diff** button appears between them.

**Before refactoring:**

```javascript
function processData(data) {
  var result = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i].active == true) {
      result.push(data[i].name.toUpperCase());
    }
  }
  return result;
}
```

**After refactoring:**

```javascript
function processData(data) {
  return data
    .filter(item => item.active)
    .map(item => item.name.toUpperCase());
}
```

### 7. Floating TOC

A floating table of contents appears on the right side, highlighting your current reading position. Only scans headings in the main content area (not navigation menus).

### 8. Reading Progress Bar

A thin progress bar at the top of the page shows how far you've scrolled.

---

## Installation

### From Source

```bash
git clone git@github.com:2019-02-18/markdown-runner.git
cd markdown-runner
npm install
npm run build
```

Then load the `dist/` folder as an unpacked extension in `chrome://extensions`.

### From Chrome Web Store

Coming soon!

## Tech Stack

| Category | Choice |
|----------|--------|
| Language | TypeScript |
| UI | Vanilla DOM (no framework) |
| Build | Vite + @crxjs/vite-plugin |
| CSS | Native CSS |
| Manifest | V3 |

## Architecture

```
src/
├── background/sw.ts          ← Service Worker
├── content/
│   ├── content-main.ts       ← Content Script entry
│   ├── features/             ← 8 feature modules
│   └── utils/                ← DOM, Observer, Shadow DOM utils
├── popup/                    ← Feature toggle panel
├── options/                  ← Settings page (4 tabs)
├── sandbox/                  ← Code execution sandbox
├── shared/                   ← Types, storage, messaging, i18n
└── locales/                  ← EN + ZH-CN language packs
```

## License

MIT
