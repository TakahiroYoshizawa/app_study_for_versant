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
                ホーム
              </NavLink>
              <NavLink to="/a">音読</NavLink>
              <NavLink to="/b">リピート</NavLink>
              <NavLink to="/history">記録</NavLink>
            </nav>
          </div>
        </header>
      )}
      <Outlet />
    </ExamModeContext>
  );
}
