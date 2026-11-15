import { useState, type ReactNode } from 'react';

export function ForestSection({ title, children, open = false }: { title: string; children: ReactNode; open?: boolean }) {
  const [expanded, setExpanded] = useState(open);
  return <details className="forest-section" open={expanded} onToggle={event => setExpanded(event.currentTarget.open)}>
    <summary>{title}<span aria-hidden="true">＋</span></summary>
    <div className="forest-section-body">{children}</div>
  </details>;
}
