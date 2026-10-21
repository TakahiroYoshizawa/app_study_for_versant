import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AttemptDetail } from './pages/AttemptDetail';
import { History } from './pages/History';
import { Home } from './pages/Home';
import { MicCheck } from './pages/MicCheck';
import { BuildPractice } from './pages/BuildPractice';
import { BuildProgress } from './pages/BuildProgress';
import { PartBHome } from './pages/PartBHome';
import { PartCHome } from './pages/PartCHome';
import { PartDHome } from './pages/PartDHome';
import { PartEHome } from './pages/PartEHome';
import { PartFHome } from './pages/PartFHome';
import { StoryPractice } from './pages/StoryPractice';
import { StoryProgress } from './pages/StoryProgress';
import { OpenPractice } from './pages/OpenPractice';
import { OpenProgress } from './pages/OpenProgress';
import { QuestionPractice } from './pages/QuestionPractice';
import { QuestionProgress } from './pages/QuestionProgress';
import { Practice } from './pages/Practice';
import { Questions } from './pages/Questions';
import { ReadingHome } from './pages/ReadingHome';
import { ReadingPractice } from './pages/ReadingPractice';
import { ReadingQuestions } from './pages/ReadingQuestions';
import { GeminiCheck } from './pages/GeminiCheck';
import { SessionReview } from './pages/SessionReview';
import { Settings } from './pages/Settings';

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
          <Route path="/c" element={<PartCHome />} />
          <Route path="/c/practice" element={<QuestionPractice />} />
          <Route path="/c/questions" element={<QuestionProgress />} />
          <Route path="/d" element={<PartDHome />} />
          <Route path="/d/practice" element={<BuildPractice />} />
          <Route path="/d/progress" element={<BuildProgress />} />
          <Route path="/e" element={<PartEHome />} />
          <Route path="/e/practice" element={<StoryPractice />} />
          <Route path="/e/stories" element={<StoryProgress />} />
          <Route path="/f" element={<PartFHome />} />
          <Route path="/f/practice" element={<OpenPractice />} />
          <Route path="/f/progress" element={<OpenProgress />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/read" element={<Practice visible />} />
          <Route path="/read/questions" element={<Questions visible />} />
          <Route path="/session" element={<SessionReview />} />
          <Route path="/session/:id" element={<SessionReview />} />
          <Route path="/gemini" element={<GeminiCheck />} />
          <Route path="/mic" element={<MicCheck />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<AttemptDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
