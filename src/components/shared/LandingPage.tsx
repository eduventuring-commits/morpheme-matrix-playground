import React, { useState } from 'react';
import { useStore } from '../../context/store';
import { Button } from '../shared/UI';

interface LandingPageProps {
  onStudentMode: () => void;
  onTeacherMode: () => void;
}

const TermsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-800">Terms of Use</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
      </div>
      <div className="overflow-y-auto p-5 text-sm text-gray-600 space-y-4">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Last updated: February 2026</p>

        <p>Morpheme Matrix Playground is an educational tool created by <strong>Melinda Karshner / EduVentures</strong>. By using this application, you agree to the following terms.</p>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">1. Educational Use</h3>
          <p>This app is intended for classroom use, tutoring, and individual learning. Commercial use, resale, or redistribution of this tool or its contents is not permitted without prior written consent.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">2. Intellectual Property</h3>
          <p>All content, including word matrices, instructional materials, design, and software, is the property of Melinda Karshner / EduVentures and is protected by copyright. You may not copy, reproduce, modify, distribute, or create derivative works without permission.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">3. Acceptable Use</h3>
          <p>You agree not to misuse this application, including attempting to copy, reverse engineer, disrupt, or interfere with the functionality of the tool.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">4. No Warranty</h3>
          <p>This application is provided "as is" without warranties of any kind. EduVentures makes no guarantees regarding accuracy, reliability, or availability.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">5. Limitation of Liability</h3>
          <p>EduVentures is not responsible for any decisions, outcomes, or impacts resulting from the use of this tool, including instructional, academic, or student-related outcomes. Use of this tool does not establish any professional, legal, or educational advisory relationship.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">6. Privacy</h3>
          <p>This app does not collect or store personal data. Any information entered is stored locally in your browser and is not transmitted to external servers. Users are responsible for ensuring they do not enter sensitive student information.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">7. Changes to Terms</h3>
          <p>These terms may be updated at any time. Continued use of the application constitutes acceptance of any changes.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">8. Governing Law</h3>
          <p>These terms are governed by the laws of the State of Colorado.</p>
        </div>

        <div>
          <h3 className="font-bold text-gray-700 mb-1">9. Contact</h3>
          <p>For permissions or questions, contact Melinda Karshner / EduVentures.</p>
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 text-center">
        <button
          onClick={onClose}
          className="bg-primary-600 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-700 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onStudentMode, onTeacherMode }) => {
  const { students, progress } = useStore();
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-emerald-100 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-8 sm:py-16">
        <div className="text-5xl sm:text-7xl mb-3 sm:mb-4 animate-bounce-gentle">🧩</div>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-800 mb-3 leading-tight">
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
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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

      {/* Footer */}
      <div className="bg-white/60 border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Melinda Karshner / EduVentures. All rights reserved.
        &nbsp;&middot;&nbsp;
        <button
          onClick={() => setShowTerms(true)}
          className="underline hover:text-gray-600 transition-colors"
        >
          Terms of Use
        </button>
      </div>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
};
