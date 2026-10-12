import { Link } from 'react-router-dom'
import { fileUrl } from '../lib/api'
import type { CourseSummary } from '../lib/types'
import { HoverGlow } from './HoverGlow'
import { IndexNum } from './IndexNum'

export function CourseCard({ course, index }: { course: CourseSummary; index: number }) {
  const cover = fileUrl(course.cover_key)
  const pct = course.total > 0 ? Math.round((course.done / course.total) * 100) : 0
  return (
    <Link
      to={`/cursos/${course.id}`}
      data-hot="1"
      tabIndex={0}
      className="group relative block cursor-none overflow-hidden border border-cream/12 bg-smoke outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-paper"
    >
      <HoverGlow className="inset-x-0 bottom-0 h-[70%]" />
      <div className="relative flex aspect-[16/7] items-start justify-between border-b border-cream/10 bg-[#101013] p-3.5">
        {cover ? (
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="font-mono text-[10px] tracking-[0.14em] text-cream/28 uppercase">[capa]</span>
        )}
        <IndexNum n={index} className="relative ml-auto text-cream/35" />
      </div>
      <div className="relative flex flex-col gap-4 px-5 pt-4.5 pb-5">
        <div className="flex items-start justify-between gap-5">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[19px] font-semibold tracking-[-0.02em] text-paper">{course.name}</span>
            {course.author && (
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-cream/50 uppercase">{course.author}</span>
            )}
          </div>
          <span className="flex-none font-mono text-[11px] tracking-[0.1em] text-cream">
            {course.done}/{course.total} aulas
          </span>
        </div>
        <div className="h-0.5 bg-cream/12">
          <div className="h-0.5 bg-paper" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  )
}
