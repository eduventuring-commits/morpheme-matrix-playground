import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  Student, Teacher, ClassRoom, MorphemeMatrix,
  ProgressEntry, AppView,
} from '../types';
import { SYSTEM_MATRICES } from '../data/matrices';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  // Navigation
  view: AppView;
  activeStudentId: string | null;
  activeTeacherId: string | null;
  editingMatrixId: string | null;

  // Data
  students: Student[];
  teachers: Teacher[];
  classes: ClassRoom[];
  customMatrices: MorphemeMatrix[];
  progress: ProgressEntry[];

  // Actions — Navigation
  setView: (v: AppView) => void;
  setActiveStudent: (id: string | null) => void;
  setActiveTeacher: (id: string | null) => void;
  setEditingMatrix: (id: string | null) => void;

  // Actions — Students
  addStudent: (name: string, grade: string, classId?: string, avatar?: string) => Student;
  updateStudent: (id: string, changes: Partial<Student>) => void;
  removeStudent: (id: string) => void;

  // Actions — Teachers
  addTeacher: (name: string, email?: string) => Teacher;
  updateTeacher: (id: string, changes: Partial<Teacher>) => void;

  // Actions — Classes
  addClass: (name: string, teacherId: string, gradeLevel: string) => ClassRoom;
  updateClass: (id: string, changes: Partial<ClassRoom>) => void;
  removeClass: (id: string) => void;
  assignMatrixToClass: (classId: string, matrixId: string) => void;
  removeMatrixFromClass: (classId: string, matrixId: string) => void;

  // Actions — Matrices
  addMatrix: (matrix: Omit<MorphemeMatrix, 'id' | 'createdAt'>) => MorphemeMatrix;
  updateMatrix: (id: string, changes: Partial<MorphemeMatrix>) => void;
  removeMatrix: (id: string) => void;

  // Actions — Progress
  addProgressEntry: (entry: Omit<ProgressEntry, 'id' | 'timestamp'>) => void;
  clearStudentProgress: (studentId: string) => void;

  // Derived helpers
  getAllMatrices: () => MorphemeMatrix[];
  getMatrixById: (id: string) => MorphemeMatrix | undefined;
  getStudentProgress: (studentId: string) => ProgressEntry[];
  getClassStudents: (classId: string) => Student[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      view: 'landing',
      activeStudentId: null,
      activeTeacherId: null,
      editingMatrixId: null,

      students: [],
      teachers: [],
      classes: [],
      customMatrices: [],
      progress: [],

      // ── Navigation ─────────────────────────────────────────────────────────
      setView: (view) => set({ view }),
      setActiveStudent: (id) => set({ activeStudentId: id }),
      setActiveTeacher: (id) => set({ activeTeacherId: id }),
      setEditingMatrix: (id) => set({ editingMatrixId: id }),

      // ── Students ───────────────────────────────────────────────────────────
      addStudent: (name, grade, classId, avatar) => {
        const student: Student = {
          id: uuidv4(),
          name,
          grade,
          classId,
          avatar: avatar ?? '🧑',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ students: [...s.students, student] }));
        if (classId) {
          set((s) => ({
            classes: s.classes.map((c) =>
              c.id === classId
                ? { ...c, studentIds: [...c.studentIds, student.id] }
                : c
            ),
          }));
        }
        return student;
      },
      updateStudent: (id, changes) =>
        set((s) => ({
          students: s.students.map((st) => (st.id === id ? { ...st, ...changes } : st)),
        })),
      removeStudent: (id) =>
        set((s) => ({
          students: s.students.filter((st) => st.id !== id),
          classes: s.classes.map((c) => ({
            ...c,
            studentIds: c.studentIds.filter((sid) => sid !== id),
          })),
        })),

      // ── Teachers ───────────────────────────────────────────────────────────
      addTeacher: (name, email) => {
        const teacher: Teacher = {
          id: uuidv4(),
          name,
          email,
          classIds: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ teachers: [...s.teachers, teacher] }));
        return teacher;
      },
      updateTeacher: (id, changes) =>
        set((s) => ({
          teachers: s.teachers.map((t) => (t.id === id ? { ...t, ...changes } : t)),
        })),

      // ── Classes ────────────────────────────────────────────────────────────
      addClass: (name, teacherId, gradeLevel) => {
        const classroom: ClassRoom = {
          id: uuidv4(),
          name,
          teacherId,
          gradeLevel,
          studentIds: [],
          assignedMatrixIds: [],
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          classes: [...s.classes, classroom],
          teachers: s.teachers.map((t) =>
            t.id === teacherId ? { ...t, classIds: [...t.classIds, classroom.id] } : t
          ),
        }));
        return classroom;
      },
      updateClass: (id, changes) =>
        set((s) => ({
          classes: s.classes.map((c) => (c.id === id ? { ...c, ...changes } : c)),
        })),
      removeClass: (id) =>
        set((s) => ({ classes: s.classes.filter((c) => c.id !== id) })),
      assignMatrixToClass: (classId, matrixId) =>
        set((s) => ({
          classes: s.classes.map((c) =>
            c.id === classId && !c.assignedMatrixIds.includes(matrixId)
              ? { ...c, assignedMatrixIds: [...c.assignedMatrixIds, matrixId] }
              : c
          ),
        })),
      removeMatrixFromClass: (classId, matrixId) =>
        set((s) => ({
          classes: s.classes.map((c) =>
            c.id === classId
              ? { ...c, assignedMatrixIds: c.assignedMatrixIds.filter((id) => id !== matrixId) }
              : c
          ),
        })),

      // ── Matrices ───────────────────────────────────────────────────────────
      addMatrix: (matrix) => {
        const m: MorphemeMatrix = {
          ...matrix,
          id: uuidv4(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ customMatrices: [...s.customMatrices, m] }));
        return m;
      },
      updateMatrix: (id, changes) =>
        set((s) => ({
          customMatrices: s.customMatrices.map((m) =>
            m.id === id ? { ...m, ...changes } : m
          ),
        })),
      removeMatrix: (id) =>
        set((s) => ({
          customMatrices: s.customMatrices.filter((m) => m.id !== id),
        })),

      // ── Progress ───────────────────────────────────────────────────────────
      addProgressEntry: (entry) =>
        set((s) => ({
          progress: [
            ...s.progress,
            { ...entry, id: uuidv4(), timestamp: new Date().toISOString() },
          ],
        })),
      clearStudentProgress: (studentId) =>
        set((s) => ({
          progress: s.progress.filter((p) => p.studentId !== studentId),
        })),

      // ── Derived ────────────────────────────────────────────────────────────
      getAllMatrices: () => [...SYSTEM_MATRICES, ...get().customMatrices],
      getMatrixById: (id) =>
        [...SYSTEM_MATRICES, ...get().customMatrices].find((m) => m.id === id),
      getStudentProgress: (studentId) =>
        get().progress.filter((p) => p.studentId === studentId),
      getClassStudents: (classId) => {
        const cls = get().classes.find((c) => c.id === classId);
        if (!cls) return [];
        return get().students.filter((s) => cls.studentIds.includes(s.id));
      },
    }),
    {
      name: 'morpheme-playground-v1',
      partialize: (state) => ({
        students: state.students,
        teachers: state.teachers,
        classes: state.classes,
        customMatrices: state.customMatrices,
        progress: state.progress,
        activeTeacherId: state.activeTeacherId,
      }),
    }
  )
);
