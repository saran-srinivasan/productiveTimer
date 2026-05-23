import { formatDuration } from "../utils/format";

export function Header({ todaySeconds }) {
  return (
    <section className="command-strip">
      <div>
        <p className="eyebrow">Focus Ledger</p>
        <h1>I will do it.</h1>
      </div>
      <div className="today-stamp">
        <span>Today</span>
        <strong>{formatDuration(todaySeconds)}</strong>
      </div>
    </section>
  );
}
