import './marten.css';

export type MartenMascotPose = 'idle' | 'focus' | 'thinking' | 'happy' | 'rest' | 'sit' | 'stand' | 'stretch';
export type MartenMascotSize = 'xs' | 'sm' | 'md' | 'lg';

/** Lightweight 2D SVG pine marten mascot with gentle CSS animations. */
export function MartenMascot({
  pose = 'idle',
  size = 'md',
  className = '',
  label,
}: {
  pose?: MartenMascotPose;
  size?: MartenMascotSize;
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={`marten-mascot marten-mascot--${size} marten-mascot--${pose} ${className}`.trim()}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 96 84" fill="none" xmlns="http://www.w3.org/2000/svg" className="marten-mascot__svg">
        {/* Fluffy tail */}
        <path
          className="marten-mascot__tail"
          d="M66 60c11-2 19-10 18-19-1-6-7-9-12-5-4 3-5 10-8 14"
          fill="#5C3B20"
          stroke="#2A1D12"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Body */}
        <ellipse cx="47" cy="57" rx="22" ry="17" fill="#79512F" stroke="#2A1D12" strokeWidth="2.2" />
        {/* Warm cream throat bib */}
        <path
          d="M35 48c4 8 15 9 20 2 1 8-4 14-10 14-7 0-12-7-10-16Z"
          fill="#F4D7A5"
        />
        {/* Paws */}
        <ellipse cx="36" cy="72" rx="6" ry="4" fill="#3D2918" stroke="#2A1D12" strokeWidth="1.8" />
        <ellipse cx="56" cy="72" rx="6" ry="4" fill="#3D2918" stroke="#2A1D12" strokeWidth="1.8" />

        {/* Head group */}
        <g className="marten-mascot__head">
          {/* Ears */}
          <path d="M27 26c-2-10 5-15 11-9l4 7" fill="#79512F" stroke="#2A1D12" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M30 24c-1-5 3-7 6-4" fill="#E1B77B" />
          <path d="M63 26c2-10-5-15-11-9l-4 7" fill="#79512F" stroke="#2A1D12" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M60 24c1-5-3-7-6-4" fill="#E1B77B" />

          {/* Head */}
          <ellipse cx="45" cy="34" rx="19" ry="16" fill="#8C5F38" stroke="#2A1D12" strokeWidth="2.2" />
          {/* Cream muzzle */}
          <ellipse cx="45" cy="40" rx="10" ry="7.5" fill="#F7F4E9" />
          {/* Nose */}
          <ellipse cx="45" cy="37.5" rx="3.2" ry="2.2" fill="#2A1D12" />
          {/* Gentle smile */}
          <path d="M41.5 41.5c1.5 1.8 5.5 1.8 7 0" stroke="#2A1D12" strokeWidth="1.8" strokeLinecap="round" />

          {/* Eyes */}
          {pose === 'rest' ? (
            <>
              <path d="M33 32c2 2 5 2 7 0" stroke="#2A1D12" strokeWidth="2" strokeLinecap="round" />
              <path d="M50 32c2 2 5 2 7 0" stroke="#2A1D12" strokeWidth="2" strokeLinecap="round" />
            </>
          ) : (
            <g className="marten-mascot__eyes">
              <circle cx="36.5" cy="31.5" r="2.7" fill="#1E1710" />
              <circle cx="35.6" cy="30.6" r="0.9" fill="#FFFDF7" />
              <circle cx="53.5" cy="31.5" r="2.7" fill="#1E1710" />
              <circle cx="52.6" cy="30.6" r="0.9" fill="#FFFDF7" />
            </g>
          )}
        </g>

        {/* Thinking indicator */}
        {pose === 'thinking' && (
          <g className="marten-mascot__thought" fill="#E1B77B">
            <circle cx="72" cy="18" r="2.2" />
            <circle cx="79" cy="12" r="3" />
            <circle cx="87" cy="7" r="3.8" />
          </g>
        )}
      </svg>
    </span>
  );
}
