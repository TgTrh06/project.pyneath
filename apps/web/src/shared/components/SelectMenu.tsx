import { useEffect, useId, useRef, useState } from 'react';
import './select-menu.css';

export type SelectOption = { value: string; label: string };

export function SelectMenu({ label, value, options, onChange, disabled = false }: {
  label: string; value: string; options: readonly SelectOption[]; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(Math.max(0, options.findIndex(option => option.value === value)));
  const selected = Math.max(0, options.findIndex(option => option.value === value));
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) requestAnimationFrame(() => button.current?.focus()); };
  const choose = (index: number) => { const option = options[index]; if (option) onChange(option.value); close(true); };
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); };
  }, [open]);
  return <div className="select-menu" ref={root}>
    <span className="select-menu-label" id={`${id}-label`}>{label}</span>
    <button ref={button} type="button" className="select-menu-trigger" aria-labelledby={`${id}-label ${id}-value`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-listbox`} aria-activedescendant={open ? `${id}-option-${active}` : undefined} disabled={disabled}
      onClick={() => { setActive(selected); setOpen(current => !current); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive(current => open ? (current + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length : selected); setOpen(true); }
        if ((event.key === ' ' || event.key === 'Enter') && !open) { event.preventDefault(); setActive(selected); setOpen(true); }
        if (event.key === 'Enter' && open) { event.preventDefault(); choose(active); }
        if (event.key === 'Home' && open) { event.preventDefault(); setActive(0); }
        if (event.key === 'End' && open) { event.preventDefault(); setActive(options.length - 1); }
      }}>
      <span id={`${id}-value`}>{options[selected]?.label ?? ''}</span><span className="select-menu-chevron" aria-hidden="true"/>
    </button>
    {open && <ul className="select-menu-list" id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}>
      {options.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={index === selected}
        className="select-menu-option" data-active={index === active || undefined} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}>{option.label}</li>)}
    </ul>}
  </div>;
}
