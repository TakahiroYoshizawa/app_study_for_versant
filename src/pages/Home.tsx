import { Link } from 'react-router-dom';

export function Home() {
  return (
    <main className="page">
      <p className="eyebrow">Versant 練習</p>
      <h1>パートを選ぶ</h1>
      <p className="lede">音読と、聞こえた文を繰り返すリピートが練習できます。見て読むは、リピートの文を見ながら読む別練習です。</p>
      <Link to="/a" className="card part-card" data-testid="open-part-a">
        <p className="eyebrow">Part A</p>
        <h2>音読</h2>
        <p>8文が画面に出ます。番号だけが読まれるので、その文を読みます。</p>
      </Link>
      <section className="card">
        <p className="eyebrow">Part B</p>
        <h2>リピート</h2>
        <p>英文が一度だけ読まれます。画面には出さないので、聞こえたとおりに繰り返します。</p>
        <div className="actions">
          <Link to="/practice" className="btn" data-testid="start-practice">
            練習を始める
          </Link>
          <Link to="/b" className="btn secondary">
            説明を見る
          </Link>
        </div>
      </section>
      <section className="card">
        <p className="eyebrow">Part B · かんたん</p>
        <h2>見て読む</h2>
        <p>リピートと同じ文です。最初に音声が流れ、文は画面に出たままなので、そのあと見ながら読みます。</p>
        <div className="actions">
          <Link to="/read" className="btn secondary" data-testid="start-read">
            見て読む
          </Link>
        </div>
      </section>
      <div className="actions">
        <Link to="/history" className="btn secondary">
          記録を見る
        </Link>
      </div>
    </main>
  );
}
