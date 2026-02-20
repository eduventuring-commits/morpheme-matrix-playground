import React, { useState } from 'react';
import { Users, BookOpen, BarChart2, Plus, Settings, ChevronRight, Trash2, Printer } from 'lucide-react';
import { Card, Button, SectionHeader, EmptyState, Badge } from '../shared/UI';
import { useStore } from '../../context/store';
import { SYSTEM_MATRICES } from '../../data/matrices';
import type { MorphemeMatrix, Student } from '../../types';
import { printProgressReport } from '../../utils/export';

type TeacherTab = 'overview' | 'classes' | 'matrices' | 'progress';

interface TeacherDashboardProps {
  onEditMatrix: (id: string | null) => void;
  onBack: () => void;
}

// ── Overview stats ────────────────────────────────────────────────────────────

const OverviewTab: React.FC<{ onEditMatrix: (id: string | null) => void }> = ({ onEditMatrix }) => {
  const { students, classes, customMatrices, progress, getAllMatrices } = useStore();
  const allMatrices = getAllMatrices();

  const stats = [
    { label: 'Students', value: students.length, icon: '👥', color: 'bg-sky-50 border-sky-200' },
    { label: 'Classes',  value: classes.length,  icon: '🏫', color: 'bg-emerald-50 border-emerald-200' },
    { label: 'Matrices', value: allMatrices.length, icon: '🧩', color: 'bg-purple-50 border-purple-200' },
    { label: 'Responses', value: progress.length, icon: '📝', color: 'bg-amber-50 border-amber-200' },
  ];

  const recentProgress = progress.slice(-20).reverse();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-2xl border-2 p-4 text-center ${s.color}`}>
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-3xl font-extrabold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {recentProgress.length > 0 && (
        <Card padding="md">
          <SectionHeader title="Recent Activity" icon="📊" subtitle="Last 20 student responses" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-2 pr-4">Student</th>
                  <th className="pb-2 pr-4">Word</th>
                  <th className="pb-2 pr-4">Matrix</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentProgress.map((p) => {
                  const student = students.find((s) => s.id === p.studentId);
                  const matrix  = allMatrices.find((m) => m.id === p.matrixId);
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-4 font-semibold">{student?.avatar} {student?.name ?? '?'}</td>
                      <td className="py-2 pr-4 font-mono font-bold text-gray-700">{p.word}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{matrix?.name ?? p.matrixId}</td>
                      <td className="py-2 pr-4">
                        {p.correct
                          ? <span className="text-success-600 font-bold">✅ Correct</span>
                          : <span className="text-red-500 font-bold">❌ Incorrect</span>}
                      </td>
                      <td className="py-2 text-gray-400 text-xs">
                        {new Date(p.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card padding="md">
        <SectionHeader
          title="Quick Actions"
          icon="⚡"
          action={
            <Button size="sm" onClick={() => onEditMatrix(null)} icon={<Plus className="w-4 h-4" />}>
              New Matrix
            </Button>
          }
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onEditMatrix(null)}
            className="p-4 bg-primary-50 border-2 border-primary-200 rounded-2xl text-left hover:border-primary-400 transition-colors"
          >
            <div className="text-2xl mb-2">🧩</div>
            <div className="font-bold text-primary-700">Create Matrix</div>
            <div className="text-xs text-gray-500">Build a custom morpheme set</div>
          </button>
          <button className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl text-left hover:border-emerald-400 transition-colors opacity-60 cursor-not-allowed">
            <div className="text-2xl mb-2">🏫</div>
            <div className="font-bold text-emerald-700">Add Class</div>
            <div className="text-xs text-gray-500">Use the Classes tab</div>
          </button>
          <button className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:border-amber-400 transition-colors opacity-60 cursor-not-allowed">
            <div className="text-2xl mb-2">📊</div>
            <div className="font-bold text-amber-700">Print Reports</div>
            <div className="text-xs text-gray-500">Use the Progress tab</div>
          </button>
        </div>
      </Card>
    </div>
  );
};

// ── Classes tab ───────────────────────────────────────────────────────────────

const ClassesTab: React.FC = () => {
  const { classes, addClass, removeClass, students, addStudent, getAllMatrices, assignMatrixToClass, removeMatrixFromClass } = useStore();
  const [showAdd, setShowAdd]       = useState(false);
  const [className, setClassName]   = useState('');
  const [gradeLevel, setGradeLevel] = useState('3');
  const [newStudentName, setNewStudentName] = useState('');
  const [addingToClass, setAddingToClass]   = useState<string | null>(null);
  const allMatrices = getAllMatrices();

  const handleAddClass = () => {
    if (!className.trim()) return;
    addClass(className.trim(), 'default-teacher', gradeLevel);
    setClassName('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Classes"
        icon="🏫"
        subtitle="Manage your class groups"
        action={
          <Button size="sm" onClick={() => setShowAdd(true)} icon={<Plus className="w-4 h-4" />}>
            Add Class
          </Button>
        }
      />

      {showAdd && (
        <Card className="border-2 border-primary-200 animate-slide-up" padding="md">
          <h3 className="font-bold mb-3">New Class</h3>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="Class name, e.g. '3rd Period Reading'"
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-primary-400 focus:outline-none"
            />
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-3 py-2 focus:border-primary-400 focus:outline-none"
            >
              {['2','3','4','5','6'].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <Button onClick={handleAddClass}>Create</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {classes.length === 0 && !showAdd && (
        <EmptyState icon="🏫" title="No classes yet" message="Create a class to organize your students and assign matrices." />
      )}

      {classes.map((cls) => {
        const classStudents = students.filter((s) => cls.studentIds.includes(s.id));
        return (
          <Card key={cls.id} padding="md">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-extrabold text-lg text-gray-800">{cls.name}</h3>
                <div className="text-gray-400 text-sm">Grade {cls.gradeLevel} · {classStudents.length} students</div>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => removeClass(cls.id)}
              >
                Delete
              </Button>
            </div>

            {/* Students */}
            <div className="mb-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Students</div>
              <div className="flex flex-wrap gap-2">
                {classStudents.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1 text-sm">
                    <span>{s.avatar}</span>
                    <span className="font-semibold">{s.name}</span>
                  </div>
                ))}
                {addingToClass === cls.id ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="Student name"
                      className="border-2 border-gray-200 rounded-lg px-2 py-1 text-sm w-32 focus:border-primary-400 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newStudentName.trim()) {
                          addStudent(newStudentName.trim(), cls.gradeLevel, cls.id);
                          setNewStudentName('');
                          setAddingToClass(null);
                        }
                      }}
                    >
                      Add
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAddingToClass(null)}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingToClass(cls.id)}
                    className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-700 font-semibold"
                  >
                    <Plus className="w-3 h-3" /> Add Student
                  </button>
                )}
              </div>
            </div>

            {/* Assigned matrices */}
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assigned Matrices</div>
              <div className="flex flex-wrap gap-2">
                {allMatrices.map((m) => {
                  const assigned = cls.assignedMatrixIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => assigned ? removeMatrixFromClass(cls.id, m.id) : assignMatrixToClass(cls.id, m.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                        assigned ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-primary-300'
                      }`}
                    >
                      {m.icon} {m.name} {assigned ? '✓' : '+'}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

// ── Matrices tab ──────────────────────────────────────────────────────────────

const MatricesTab: React.FC<{ onEdit: (id: string | null) => void }> = ({ onEdit }) => {
  const { customMatrices, removeMatrix } = useStore();
  const allMatrices = [
    ...SYSTEM_MATRICES.map((m) => ({ ...m, isSystem: true })),
    ...customMatrices.map((m) => ({ ...m, isSystem: false })),
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Morpheme Matrices"
        icon="🧩"
        subtitle={`${SYSTEM_MATRICES.length} built-in · ${customMatrices.length} custom`}
        action={
          <Button size="sm" onClick={() => onEdit(null)} icon={<Plus className="w-4 h-4" />}>
            Create Matrix
          </Button>
        }
      />
      <div className="grid gap-3">
        {allMatrices.map((m) => (
          <Card key={m.id} padding="md">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{m.icon ?? '📚'}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-gray-800">{m.name}</span>
                  {m.isSystem ? (
                    <Badge color="blue">Built-in</Badge>
                  ) : (
                    <Badge color="purple">Custom</Badge>
                  )}
                </div>
                <div className="text-gray-500 text-sm">{m.description}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {m.prefixes.length} prefixes · {m.bases.length} bases · {m.suffixes.length} suffixes · {m.wordKey.length} word key entries
                </div>
              </div>
              <div className="flex gap-2">
                {!m.isSystem && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => onEdit(m.id)} icon={<Settings className="w-3 h-3" />}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removeMatrix(m.id)} icon={<Trash2 className="w-3 h-3" />}>
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ── Progress tab ──────────────────────────────────────────────────────────────

const ProgressTab: React.FC = () => {
  const { students, progress, getAllMatrices, clearStudentProgress } = useStore();
  const allMatrices = getAllMatrices();
  const matrixNames = Object.fromEntries(allMatrices.map((m) => [m.id, m.name]));
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const filteredProgress = selectedStudentId
    ? progress.filter((p) => p.studentId === selectedStudentId)
    : progress;

  return (
    <div className="space-y-4">
      <SectionHeader title="Student Progress" icon="📊" subtitle="Track every student's morpheme exploration" />

      {/* Student filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedStudentId(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
            !selectedStudentId ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}
        >
          All Students
        </button>
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStudentId(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
              selectedStudentId === s.id ? 'bg-primary-100 border-primary-400 text-primary-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {s.avatar} {s.name}
          </button>
        ))}
      </div>

      {/* Summary cards per student */}
      {students.filter((s) => !selectedStudentId || s.id === selectedStudentId).map((s) => {
        const sp = progress.filter((p) => p.studentId === s.id);
        const correct = sp.filter((p) => p.correct).length;
        const accuracy = sp.length > 0 ? Math.round((correct / sp.length) * 100) : 0;
        const matricesUsed = new Set(sp.map((p) => p.matrixId)).size;

        return (
          <Card key={s.id} padding="md">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{s.avatar}</span>
              <div className="flex-1">
                <div className="font-extrabold text-gray-800">{s.name}</div>
                <div className="text-gray-400 text-sm">Grade {s.grade}</div>
              </div>
              <div className="flex items-center gap-3 text-center">
                <div>
                  <div className="font-extrabold text-2xl text-gray-800">{sp.length}</div>
                  <div className="text-xs text-gray-400">Tried</div>
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-success-600">{correct}</div>
                  <div className="text-xs text-gray-400">Correct</div>
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-primary-600">{accuracy}%</div>
                  <div className="text-xs text-gray-400">Accuracy</div>
                </div>
                <div>
                  <div className="font-extrabold text-2xl text-purple-600">{matricesUsed}</div>
                  <div className="text-xs text-gray-400">Matrices</div>
                </div>
              </div>
            </div>

            {sp.length > 0 && (
              <>
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wider border-b">
                        <th className="text-left pb-1 pr-3">Word</th>
                        <th className="text-left pb-1 pr-3">Matrix</th>
                        <th className="text-left pb-1 pr-3">Guess</th>
                        <th className="text-left pb-1 pr-3">Result</th>
                        <th className="text-left pb-1">Justification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sp.slice(-15).reverse().map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3 font-bold font-mono">{entry.word}</td>
                          <td className="py-1.5 pr-3 text-gray-500 text-xs">{matrixNames[entry.matrixId] ?? '?'}</td>
                          <td className="py-1.5 pr-3 text-xs">{entry.isRealWord ? '✅ Real' : '🔮 Made-up'}</td>
                          <td className="py-1.5 pr-3">
                            {entry.correct
                              ? <span className="text-success-600 font-bold text-xs">✅ Correct</span>
                              : <span className="text-red-500 font-bold text-xs">❌ Wrong</span>}
                          </td>
                          <td className="py-1.5 text-gray-500 text-xs italic truncate max-w-xs">
                            {entry.studentJustification ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Printer className="w-4 h-4" />}
                    onClick={() => printProgressReport(s, sp, matrixNames)}
                  >
                    Print Report
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={() => clearStudentProgress(s.id)}
                  >
                    Clear Data
                  </Button>
                </div>
              </>
            )}

            {sp.length === 0 && (
              <p className="text-gray-400 text-sm italic">No activity recorded yet.</p>
            )}
          </Card>
        );
      })}

      {students.length === 0 && (
        <EmptyState icon="👥" title="No students yet" message="Add students via the Student mode so their progress will appear here." />
      )}
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onEditMatrix, onBack }) => {
  const [tab, setTab] = useState<TeacherTab>('overview');

  const tabs: { id: TeacherTab; label: string; icon: string }[] = [
    { id: 'overview',  label: 'Overview',  icon: '🏠' },
    { id: 'classes',   label: 'Classes',   icon: '🏫' },
    { id: 'matrices',  label: 'Matrices',  icon: '🧩' },
    { id: 'progress',  label: 'Progress',  icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <button onClick={onBack} className="text-gray-400 hover:text-gray-600 font-semibold text-sm">
              ← Home
            </button>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">🍎</span>
              <div>
                <div className="font-extrabold text-gray-800">Teacher Dashboard</div>
                <div className="text-xs text-gray-500">Morpheme Matrix Playground</div>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 pb-0 border-b-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 font-bold text-sm transition-all border-b-2 ${
                  tab === t.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'overview'  && <OverviewTab onEditMatrix={onEditMatrix} />}
        {tab === 'classes'   && <ClassesTab />}
        {tab === 'matrices'  && <MatricesTab onEdit={onEditMatrix} />}
        {tab === 'progress'  && <ProgressTab />}
      </div>
    </div>
  );
};
