import { useCallback, useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ExamModeContext } from './exam-mode';

export function Layout() {
  const [exam, setExamState] = useState(false);
  const setExam = useCallback((value: boolean) => setExamState(value), []);
  const mode = useMemo(() => ({ exam, setExam }), [exam, setExam]);

  return (
    <ExamModeContext value={mode}>
      {exam ? null : (
        <header className="topbar">
          <div className="topbar-inner">
            <NavLink to="/" end className="brand">
              Versant
            </NavLink>
            <nav className="nav">
              <NavLink to="/" end>
                Home
              </NavLink>
              <NavLink to="/a">Read</NavLink>
              <NavLink to="/b">Repeat</NavLink>
              <NavLink to="/history">History</NavLink>
            </nav>
          </div>
        </header>
      )}
      <Outlet />
    </ExamModeContext>
  );
}
