import { Link } from 'react-router-dom';
import { LevelPicker } from '../components/LevelPicker';
import { getAudioContext } from '../lib/speech';
import { useGeminiJobs } from '../lib/use-gemini-jobs';

export function Home() {
  const { jobs } = useGeminiJobs();
  return (
    <main className="page">
      <p className="eyebrow">Versant</p>
      <h1>Practice</h1>
      <p className="lede">
        Part A から Part F まで、同じメニューから入ります。練習できるのは Part A、Part B、Part C、Part D、Part E、Part F です。Part B は、繰り返すか見ながら読むかを選べます。
      </p>
      <section className="card">
        <h2>Difficulty</h2>
        <LevelPicker detail />
      </section>
      <div className="part-grid">
        <section className="card part-card">
          <div className="part-copy">
            <p className="eyebrow">Part A</p>
            <h2>Read</h2>
            <p>8文が画面に出ます。番号だけが読まれるので、その文を読みます。</p>
          </div>
          <div className="actions">
            <Link to="/a" className="btn" data-testid="open-part-a">
              Start
            </Link>
          </div>
        </section>
        <section className="card part-card">
          <div className="part-copy">
            <p className="eyebrow">Part B</p>
            <h2>Repeat</h2>
            <p>英文が一度だけ読まれます。繰り返すか、同じ文を見ながら読むかを選べます。</p>
          </div>
          <div className="actions">
            <Link to="/practice" className="btn" data-testid="start-practice" onClick={() => getAudioContext()}>
              Repeat
            </Link>
            <Link to="/read" className="btn secondary" data-testid="start-read" onClick={() => getAudioContext()}>
              Read along
            </Link>
            <Link to="/b" className="btn secondary">
              About
            </Link>
          </div>
        </section>
        <section className="card part-card">
          <div className="part-copy">
            <p className="eyebrow">Part C</p>
            <h2>Questions</h2>
            <p>短い質問が一度だけ読まれます。単語か、短い句で答えます。</p>
          </div>
          <div className="actions">
            <Link to="/c" className="btn" data-testid="open-part-c">
              Start
            </Link>
          </div>
        </section>
        <section className="card part-card">
          <div className="part-copy">
            <p className="eyebrow">Part D</p>
            <h2>Sentence builds</h2>
            <p>3つの句が一度だけ読まれます。並べ替えて、1つの文として話します。</p>
          </div>
          <div className="actions">
            <Link to="/d" className="btn" data-testid="open-part-d">
              Start
            </Link>
          </div>
        </section>
        <section className="card part-card">
          <div className="part-copy">
            <p className="eyebrow">Part E</p>
            <h2>Retell</h2>
            <p>短い話が一度だけ読まれます。自分の言葉で、要点を話します。</p>
          </div>
          <div className="actions">
            <Link to="/e" className="btn" data-testid="open-part-e">
              Start
            </Link>
          </div>
        </section>
        <section className="card part-card">
          <div className="part-copy">
            <p className="eyebrow">Part F</p>
            <h2>Open questions</h2>
            <p>設問が一度だけ読まれます。40秒で、描写するか、意見と理由を話します。</p>
          </div>
          <div className="actions">
            <Link to="/f" className="btn" data-testid="open-part-f">
              Start
            </Link>
          </div>
        </section>
      </div>
      <div className="actions">
        <Link to="/history" className="btn secondary">
          History
        </Link>
        {jobs.length > 0 ? (
          <Link to="/gemini" className="btn secondary" data-testid="open-gemini">
            Geminiの採点
          </Link>
        ) : null}
      </div>
    </main>
  );
}
