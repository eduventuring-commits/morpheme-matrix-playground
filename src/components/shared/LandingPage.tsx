import React from 'react';
import { useStore } from '../../context/store';
import { Button } from '../shared/UI';

interface LandingPageProps {
  onStudentMode: () => void;
  onTeacherMode: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStudentMode, onTeacherMode }) => {
  const { students, progress } = useStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-emerald-100 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="text-7xl mb-4 animate-bounce-gentle">🧩</div>
        <h1 className="text-5xl sm:text-6xl font-black text-gray-800 mb-3 leading-tight">
          Morpheme Matrix
          <br />
          <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
            Playground
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mb-2">
          Build words. Discover meaning. Explore the building blocks of language.
        </p>
        <p className="text-gray-400 mb-10">
          Grades 2–6 &middot; Prefixes · Base Words · Suffixes
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <button
            onClick={onStudentMode}
            className="flex-1 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-3xl p-6 text-center shadow-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-100"
          >
            <div className="text-5xl mb-2">🧒</div>
            <div className="font-extrabold text-xl">I'm a Student</div>
            <div className="text-primary-200 text-sm mt-1">Play & explore words</div>
          </button>
          <div className="flex-1 flex flex-col items-center">
            <button
              disabled
              className="w-full bg-gradient-to-br from-amber-200 to-orange-300 text-white rounded-3xl p-6 text-center shadow-md opacity-60 cursor-not-allowed"
            >
              <div className="text-5xl mb-2">🍎</div>
              <div className="font-extrabold text-xl">I'm a Teacher</div>
              <div className="text-amber-100 text-sm mt-1">Manage classes & view progress</div>
            </button>
            <div className="mt-2 text-xs font-extrabold tracking-widest text-amber-500 uppercase">
              Coming Soon!
            </div>
          </div>
        </div>

        {/* Quick stats */}
        {(students.length > 0 || progress.length > 0) && (
          <div className="flex gap-6 mt-10 text-center">
            {students.length > 0 && (
              <div>
                <div className="text-2xl font-extrabold text-gray-700">{students.length}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Students</div>
              </div>
            )}
            {progress.length > 0 && (
              <div>
                <div className="text-2xl font-extrabold text-gray-700">{progress.length}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Words Tried</div>
              </div>
            )}
            {progress.filter(p => p.correct).length > 0 && (
              <div>
                <div className="text-2xl font-extrabold text-success-600">
                  {Math.round((progress.filter(p => p.correct).length / progress.length) * 100)}%
                </div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">Accuracy</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feature highlights */}
      <div className="bg-white/80 border-t border-gray-100 px-4 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          {[
            { icon: '🧩', label: '6 Built-in Matrices', desc: 'Greek roots, Latin roots, suffixes & more' },
            { icon: '📊', label: 'Progress Tracking',   desc: 'Per-student accuracy and history' },
            { icon: '🖨️', label: 'Print Worksheets',    desc: 'Export as printable classroom sheets' },
            { icon: '✏️', label: 'Custom Matrices',     desc: 'Teachers can build their own' },
          ].map((f) => (
            <div key={f.label} className="px-2">
              <div className="text-3xl mb-1">{f.icon}</div>
              <div className="font-bold text-gray-700 text-sm">{f.label}</div>
              <div className="text-gray-400 text-xs mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
