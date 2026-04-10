import React from 'react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 18, color = 'currentColor', style }) => {
  const icons: Record<string, React.ReactNode> = {
    shield: (
      <path
        d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"
        strokeWidth="1.5"
        stroke={color}
        fill="none"
      />
    ),
    arrow: <polyline points="9,18 15,12 9,6" strokeWidth="2" stroke={color} fill="none" />,
    arrowLeft: <polyline points="15,18 9,12 15,6" strokeWidth="2" stroke={color} fill="none" />,
    arrowUp: <polyline points="18,15 12,9 6,15" strokeWidth="2" stroke={color} fill="none" />,
    arrowDown: <polyline points="6,9 12,15 18,9" strokeWidth="2" stroke={color} fill="none" />,
    menu: (
      <>
        <line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" stroke={color} />
        <line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" stroke={color} />
        <line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" stroke={color} />
      </>
    ),
    x: (
      <>
        <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" stroke={color} />
        <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" stroke={color} />
      </>
    ),
    check: <polyline points="20,6 9,17 4,12" strokeWidth="2" stroke={color} fill="none" />,
    checkCircle: (
      <>
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none" />
        <polyline points="16,9 10.5,14.5 8,12" strokeWidth="2" stroke={color} fill="none" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none" />
        <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" stroke={color} />
        <circle cx="12" cy="8" r="0.5" fill={color} />
      </>
    ),
    alert: (
      <>
        <path
          d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          strokeWidth="1.5"
          stroke={color}
          fill="none"
        />
        <line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" stroke={color} />
        <circle cx="12" cy="16.5" r="0.5" fill={color} />
      </>
    ),
    alertCircle: (
      <>
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none" />
        <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" stroke={color} />
        <circle cx="12" cy="16" r="0.5" fill={color} />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.5" stroke={color} fill="none" />
        <polyline points="14,2 14,8 20,8" strokeWidth="1.5" stroke={color} fill="none" />
        <line x1="16" y1="13" x2="8" y2="13" strokeWidth="1.5" stroke={color} />
        <line x1="16" y1="17" x2="8" y2="17" strokeWidth="1.5" stroke={color} />
        <line x1="10" y1="9" x2="8" y2="9" strokeWidth="1.5" stroke={color} />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none" />
        <polyline points="12,6 12,12 16,14" strokeWidth="1.5" stroke={color} fill="none" />
      </>
    ),
    book: (
      <>
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeWidth="1.5" stroke={color} fill="none" />
        <path
          d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
          strokeWidth="1.5"
          stroke={color}
          fill="none"
        />
      </>
    ),
    layers: (
      <>
        <polygon points="12,2 2,7 12,12 22,7" strokeWidth="1.5" stroke={color} fill="none" />
        <polyline points="2,17 12,22 22,17" strokeWidth="1.5" stroke={color} fill="none" />
        <polyline points="2,12 12,17 22,12" strokeWidth="1.5" stroke={color} fill="none" />
      </>
    ),
    zap: <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" strokeWidth="1.5" stroke={color} fill="none" />,
    lock: (
      <>
        <rect x="4" y="11" width="16" height="10" rx="2" strokeWidth="1.5" stroke={color} fill="none" />
        <path d="M8 11V8a4 4 0 118 0v3" strokeWidth="1.5" stroke={color} fill="none" />
      </>
    ),
    home: (
      <>
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1.5" stroke={color} fill="none" />
        <polyline points="9,22 9,12 15,12 15,22" strokeWidth="1.5" stroke={color} fill="none" />
      </>
    ),
    cpu: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" stroke={color} fill="none" />
        <rect x="9" y="9" width="6" height="6" strokeWidth="1.5" stroke={color} fill="none" />
        <line x1="9" y1="1" x2="9" y2="4" strokeWidth="1.5" stroke={color} />
        <line x1="15" y1="1" x2="15" y2="4" strokeWidth="1.5" stroke={color} />
        <line x1="9" y1="20" x2="9" y2="23" strokeWidth="1.5" stroke={color} />
        <line x1="15" y1="20" x2="15" y2="23" strokeWidth="1.5" stroke={color} />
        <line x1="20" y1="9" x2="23" y2="9" strokeWidth="1.5" stroke={color} />
        <line x1="20" y1="14" x2="23" y2="14" strokeWidth="1.5" stroke={color} />
        <line x1="1" y1="9" x2="4" y2="9" strokeWidth="1.5" stroke={color} />
        <line x1="1" y1="14" x2="4" y2="14" strokeWidth="1.5" stroke={color} />
      </>
    ),
    scale: (
      <>
        <path d="M16 3l5 5-5 5" strokeWidth="1.5" stroke={color} fill="none" />
        <path d="M8 3L3 8l5 5" strokeWidth="1.5" stroke={color} fill="none" />
        <line x1="12" y1="22" x2="12" y2="2" strokeWidth="1.5" stroke={color} />
      </>
    ),
    refresh: (
      <>
        <polyline points="23,4 23,10 17,10" strokeWidth="1.5" stroke={color} fill="none" />
        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" strokeWidth="1.5" stroke={color} fill="none" />
      </>
    ),
    printer: (
      <>
        <polyline points="6,9 6,2 18,2 18,9" strokeWidth="1.5" stroke={color} fill="none" />
        <path
          d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"
          strokeWidth="1.5"
          stroke={color}
          fill="none"
        />
        <rect x="6" y="14" width="12" height="8" strokeWidth="1.5" stroke={color} fill="none" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {icons[name] || icons.info}
    </svg>
  );
};
