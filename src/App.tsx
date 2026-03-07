import React, { useState } from 'react';
import { LandingPage } from './components/shared/LandingPage';
import { StudentSelect } from './components/student/StudentSelect';
import { StudentPlayground } from './components/student/StudentPlayground';
import { PrefixPlayground } from './components/student/PrefixPlayground';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { MatrixEditor } from './components/teacher/MatrixEditor';

type Screen =
  | { name: 'landing' }
  | { name: 'student-select' }
  | { name: 'student-play'; studentId: string; matrixId: string; startBaseIndex: number }
  | { name: 'prefix-play'; matrixId: string }
  | { name: 'teacher-dashboard' }
  | { name: 'matrix-editor'; matrixId: string | null };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'landing' });

  const goto = (s: Screen) => setScreen(s);

  return (
    <>
      {screen.name === 'landing' && (
        <LandingPage
          onStudentMode={() => goto({ name: 'student-select' })}
          onTeacherMode={() => goto({ name: 'teacher-dashboard' })}
        />
      )}
      {screen.name === 'student-select' && (
        <StudentSelect
          onSelectStudent={(studentId, matrixId, startBaseIndex = 0) =>
            goto({ name: 'student-play', studentId, matrixId, startBaseIndex })
          }
          onSelectPrefixMatrix={(matrixId) =>
            goto({ name: 'prefix-play', matrixId })
          }
          onBack={() => goto({ name: 'landing' })}
        />
      )}
      {screen.name === 'student-play' && (
        <StudentPlayground
          studentId={screen.studentId}
          matrixId={screen.matrixId}
          startBaseIndex={screen.startBaseIndex}
          onBack={() => goto({ name: 'student-select' })}
        />
      )}
      {screen.name === 'prefix-play' && (
        <PrefixPlayground
          matrixId={screen.matrixId}
          onBack={() => goto({ name: 'student-select' })}
        />
      )}
      {screen.name === 'teacher-dashboard' && (
        <TeacherDashboard
          onEditMatrix={(id) => goto({ name: 'matrix-editor', matrixId: id })}
          onBack={() => goto({ name: 'landing' })}
        />
      )}
      {screen.name === 'matrix-editor' && (
        <MatrixEditor
          matrixId={screen.matrixId}
          onSave={() => goto({ name: 'teacher-dashboard' })}
          onCancel={() => goto({ name: 'teacher-dashboard' })}
        />
      )}
    </>
  );
}
