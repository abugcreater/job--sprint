import { ArrowRight, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function ReviewEmptyProfile() {
  return (
    <main className="app-main">
      <section className="app-page">
        <article className="command-card p-5">
          <div className="flex items-center gap-3 text-brand-700">
            <span className="grid size-12 place-items-center rounded-control bg-brand-100">
              <ClipboardCheck size={22} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-black text-brand-700">今日复盘</p>
              <h1 className="text-3xl font-black text-ink-900">先建立你的求职画像</h1>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-ink-500">
            复盘需要绑定到当天个人日历。请先导入简历或 JD，生成画像和今日行动后再记录结果。
          </p>
          <Link to="/coach" className="primary-button mt-5">
            <ArrowRight size={16} aria-hidden="true" />
            去创建画像
          </Link>
        </article>
      </section>
    </main>
  );
}
