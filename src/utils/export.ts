import type { MorphemeMatrix, Student, ProgressEntry } from '../types';

// ─── Worksheet export ──────────────────────────────────────────────────────

export function generateWorksheetHTML(matrix: MorphemeMatrix, studentName?: string): string {
  const prefixes = matrix.prefixes.map((p) => p.text).join(', ');
  const bases    = matrix.bases.map((b) => b.text).join(', ');
  const suffixes = matrix.suffixes.map((s) => s.text).join(', ');

  const wordKeyRows = matrix.wordKey
    .map(
      (w) => `
      <tr>
        <td style="font-weight:700;padding:6px 10px;border:1px solid #ddd;">${w.word}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;">${w.definition}</td>
        <td style="padding:6px 10px;border:1px solid #ddd;color:#555;">${w.example ?? ''}</td>
      </tr>`
    )
    .join('');

  const practiceLines = Array.from({ length: 8 })
    .map(
      (_, i) => `
      <tr>
        <td style="padding:8px 10px;border:1px solid #ddd;">${i + 1}.</td>
        <td style="padding:8px 10px;border:1px solid #ddd;"></td>
        <td style="padding:8px 10px;border:1px solid #ddd;"></td>
        <td style="padding:8px 10px;border:1px solid #ddd;"></td>
        <td style="padding:8px 10px;border:1px solid #ddd;min-width:140px;"></td>
      </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Morpheme Worksheet — ${matrix.name}</title>
  <style>
    body { font-family: 'Nunito', 'Segoe UI', sans-serif; margin: 32px; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 15px; color: #555; margin-top: 0; font-weight: normal; }
    .section { margin: 20px 0; }
    .section h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th { background: #f0f4ff; padding: 8px 10px; border: 1px solid #ddd; text-align: left; font-weight: 700; }
    .chip { display: inline-block; padding: 3px 10px; border-radius: 99px; font-weight: 700; margin: 3px; font-size: 13px; }
    .prefix { background: #e0f2fe; color: #0369a1; }
    .base   { background: #dcfce7; color: #15803d; }
    .suffix { background: #fef9c3; color: #a16207; }
    .student-line { border-bottom: 1px solid #999; display: inline-block; width: 240px; margin-left: 8px; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;">
    <div>
      <h1>${matrix.icon ?? '📚'} ${matrix.name}</h1>
      <h2>${matrix.description ?? ''}</h2>
    </div>
    <div style="font-size:13px;color:#555;">
      Name: <span class="student-line">${studentName ?? ''}</span><br/>
      Date: <span class="student-line"></span><br/>
      Grade: <span class="student-line"></span>
    </div>
  </div>

  <div class="section">
    <h3>🧩 Morpheme Bank</h3>
    <div>
      <strong style="font-size:13px;color:#0369a1">PREFIXES:</strong>
      ${matrix.prefixes.map((p) => `<span class="chip prefix">${p.text}– <em style="font-weight:400;font-size:11px">${p.meaning}</em></span>`).join('')}
    </div>
    <div style="margin-top:6px;">
      <strong style="font-size:13px;color:#15803d">BASE WORDS:</strong>
      ${matrix.bases.map((b) => `<span class="chip base">${b.text}</span>`).join('')}
    </div>
    <div style="margin-top:6px;">
      <strong style="font-size:13px;color:#a16207">SUFFIXES:</strong>
      ${matrix.suffixes.map((s) => `<span class="chip suffix">–${s.text} <em style="font-weight:400;font-size:11px">${s.meaning}</em></span>`).join('')}
    </div>
  </div>

  <div class="section">
    <h3>📝 Build Your Words</h3>
    <p style="font-size:12px;color:#666;">Pick parts from the bank above. Write the word, mark Real or Made-Up, then write a sentence.</p>
    <table>
      <thead><tr>
        <th>#</th>
        <th>Prefix</th>
        <th>Base</th>
        <th>Suffix</th>
        <th>Word + Real/Made-Up?</th>
      </tr></thead>
      <tbody>${practiceLines}</tbody>
    </table>
  </div>

  <div class="section">
    <h3>📖 Word Key</h3>
    <p style="font-size:12px;color:#666;">These are known real words you can make with this matrix.</p>
    <table>
      <thead><tr>
        <th>Word</th>
        <th>Definition</th>
        <th>Example Sentence</th>
      </tr></thead>
      <tbody>${wordKeyRows}</tbody>
    </table>
  </div>
</body>
</html>`;
}

export function printWorksheet(matrix: MorphemeMatrix, studentName?: string) {
  const html = generateWorksheetHTML(matrix, studentName);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Progress report export ────────────────────────────────────────────────

export function generateProgressReportHTML(
  student: Student,
  entries: ProgressEntry[],
  matrixNames: Record<string, string>
): string {
  const correct  = entries.filter((e) => e.correct).length;
  const accuracy = entries.length > 0 ? Math.round((correct / entries.length) * 100) : 0;

  const rows = entries
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map(
      (e) => `
    <tr style="background:${e.correct ? '#f0fdf4' : '#fef2f2'}">
      <td style="padding:6px 10px;border:1px solid #ddd;">${new Date(e.timestamp).toLocaleDateString()}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;font-weight:700;">${e.word}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${matrixNames[e.matrixId] ?? e.matrixId}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${e.isRealWord ? '✅ Real' : '🔮 Made-up'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;">${e.correct ? '✅ Correct' : '❌ Incorrect'}</td>
      <td style="padding:6px 10px;border:1px solid #ddd;color:#555;">${e.studentJustification ?? ''}</td>
    </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Progress Report — ${student.name}</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; margin: 32px; color: #1a1a1a; }
    h1 { font-size: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th { background: #f0f4ff; padding: 8px 10px; border: 1px solid #ddd; text-align: left; }
    .stat { display: inline-block; margin: 0 16px; text-align: center; }
    .stat-val { font-size: 28px; font-weight: 900; color: #0284c7; }
    .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  </style>
</head>
<body>
  <h1>📊 Progress Report — ${student.avatar ?? '🧑'} ${student.name}</h1>
  <p style="color:#555;">Grade ${student.grade} &middot; Generated ${new Date().toLocaleDateString()}</p>

  <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:12px;">
    <div class="stat"><div class="stat-val">${entries.length}</div><div class="stat-label">Words Tried</div></div>
    <div class="stat"><div class="stat-val">${correct}</div><div class="stat-label">Correct</div></div>
    <div class="stat"><div class="stat-val">${accuracy}%</div><div class="stat-label">Accuracy</div></div>
    <div class="stat"><div class="stat-val">${new Set(entries.map((e) => e.matrixId)).size}</div><div class="stat-label">Matrices Used</div></div>
  </div>

  <h2 style="font-size:15px;">Activity Log</h2>
  <table>
    <thead><tr>
      <th>Date</th>
      <th>Word</th>
      <th>Matrix</th>
      <th>Student's Guess</th>
      <th>Result</th>
      <th>Justification</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export function printProgressReport(
  student: Student,
  entries: ProgressEntry[],
  matrixNames: Record<string, string>
) {
  const html = generateProgressReportHTML(student, entries, matrixNames);
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}
