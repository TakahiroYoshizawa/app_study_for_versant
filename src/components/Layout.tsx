import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { PracticeLevelProvider } from '../lib/level';
import { micChecked } from '../lib/mic-check';
import { GeminiBanner } from './GeminiBanner';
import { ExamModeContext } from './exam-mode';

export function Layout() {
  const location = useLocation();
  const [exam, setExamState] = useState(false);
  const setExam = useCallback((value: boolean) => setExamState(value), []);
  const mode = useMemo(() => ({ exam, setExam }), [exam, setExam]);
  const needsMic = location.pathname !== '/mic' && !micChecked();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [menuOpen]);

  return (
    <PracticeLevelProvider>
      <ExamModeContext value={mode}>
      {exam ? null : (
        <header ref={headerRef} className={menuOpen ? 'topbar is-open' : 'topbar'}>
          <div className="topbar-inner">
            <NavLink to="/" end className="brand">
              Versant
            </NavLink>
            <button
              ref={menuButtonRef}
              type="button"
              className="nav-toggle"
              aria-expanded={menuOpen}
              aria-controls="site-nav"
              data-testid="nav-toggle"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="nav-toggle-bars" aria-hidden="true" />
              <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Menu'}</span>
            </button>
            <nav id="site-nav" className="nav" onClick={() => setMenuOpen(false)}>
              <NavLink to="/" end>
                Home
              </NavLink>
              <NavLink to="/a">Read</NavLink>
              <NavLink to="/b">Repeat</NavLink>
              <NavLink to="/c">Questions</NavLink>
              <NavLink to="/d">Builds</NavLink>
              <NavLink to="/e">Retell</NavLink>
              <NavLink to="/f">Open</NavLink>
              <NavLink to="/mic" data-testid="nav-mic">
                Mic
              </NavLink>
              <NavLink to="/history">History</NavLink>
              <NavLink to="/settings">Key</NavLink>
            </nav>
          </div>
          <GeminiBanner />
        </header>
      )}
        {needsMic ? <Navigate to="/mic" replace /> : <Outlet />}
      </ExamModeContext>
    </PracticeLevelProvider>
  );
}
