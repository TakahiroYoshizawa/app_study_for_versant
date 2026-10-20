import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AttemptDetail } from './pages/AttemptDetail';
import { History } from './pages/History';
import { Home } from './pages/Home';
import { PartBHome } from './pages/PartBHome';
import { Practice } from './pages/Practice';
import { Questions } from './pages/Questions';
import { ReadingHome } from './pages/ReadingHome';
import { ReadingPractice } from './pages/ReadingPractice';
import { ReadingQuestions } from './pages/ReadingQuestions';
import { SessionReview } from './pages/SessionReview';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/a" element={<ReadingHome />} />
          <Route path="/a/practice" element={<ReadingPractice />} />
          <Route path="/a/questions" element={<ReadingQuestions />} />
          <Route path="/b" element={<PartBHome />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/read" element={<Practice visible />} />
          <Route path="/read/questions" element={<Questions visible />} />
          <Route path="/session" element={<SessionReview />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<AttemptDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
