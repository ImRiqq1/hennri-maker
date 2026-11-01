import { Link } from 'react-router-dom'
import { fileUrl } from '../lib/api'
import type { CourseSummary } from '../lib/types'

const HATCH = 'repeating-linear-gradient(-45deg, var(--mist-300) 0 2px, transparent 2px 7px)'

export function CourseCard({ course }: { course: CourseSummary }) {
  const cover = fileUrl(course.cover_key)
  const pct = course.total > 0 ? Math.round((course.done / course.total) * 100) : 0
  const done = course.status === 'concluido'
  return (
    <Link
      to={`/cursos/${course.id}`}
      className="group relative block overflow-hidden rounded-[28px] border border-mist-200 bg-surface p-2 shadow-soft outline-none transition-[transform,box-shadow] duration-500 ease-apple hover:-translate-y-1 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-ice-200"
    >
      <div className="relative flex aspect-[16/7] items-center justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-mist-100 via-mist-100 to-ice-100">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-apple group-hover:scale-[1.04]"
          />
        ) : (
          <i className="ri-graduation-cap-line text-[34px] text-abyss-500/35" />
        )}
        <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-surface/90 py-1 pr-2.5 pl-1.5 text-[11.5px] font-medium text-abyss-700 shadow-soft backdrop-blur">
          <span className={done ? 'h-1.5 w-1.5 rounded-full bg-success' : 'h-1.5 w-1.5 rounded-full bg-ice-500'} />
          {done ? 'Concluído' : 'Em andamento'}
        </span>
        <span className="absolute right-3 bottom-3 flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <i className="ri-arrow-right-up-line text-[17px]" />
        </span>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-5 pb-4">
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[20px] font-light tracking-[-0.03em] text-fg">{course.name}</span>
            {course.author && <span className="truncate text-[12.5px] text-sub">{course.author}</span>}
          </div>
          <div className="flex flex-none flex-col items-end gap-1">
            <span className="tnum text-[15px] font-medium text-abyss-600">{pct}%</span>
            <span className="tnum text-[12px] text-sub">
              {course.done}/{course.total} aulas
            </span>
          </div>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full" style={{ backgroundImage: HATCH }}>
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-apple"
            style={{ width: `${pct > 0 ? Math.max(pct, 4) : 0}%` }}
          />
        </div>
      </div>
    </Link>
  )
}
