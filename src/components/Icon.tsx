import React from "react";

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Icon: React.FC<IconProps> = ({ name, size = 18, color = "currentColor", className, style }) => {
  const icons: Record<string, React.ReactNode> = {
    shield: <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z" strokeWidth="1.5" stroke={color} fill="none"/>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" stroke={color}/><line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" stroke={color}/></>,
    arrow: <polyline points="9,18 15,12 9,6" strokeWidth="2" stroke={color} fill="none"/>,
    arrowLeft: <polyline points="15,18 9,12 15,6" strokeWidth="2" stroke={color} fill="none"/>,
    arrowDown: <polyline points="6,9 12,15 18,9" strokeWidth="2" stroke={color} fill="none"/>,
    arrowUp: <polyline points="18,15 12,9 6,15" strokeWidth="2" stroke={color} fill="none"/>,
    check: <polyline points="20,6 9,17 4,12" strokeWidth="2" stroke={color} fill="none"/>,
    checkCircle: <><circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="16,9 10.5,14.5 8,12" strokeWidth="2" stroke={color} fill="none"/></>,
    info: <><circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/><line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" stroke={color}/><circle cx="12" cy="8" r="0.5" fill={color}/></>,
    alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeWidth="1.5" stroke={color} fill="none"/><line x1="12" y1="9" x2="12" y2="13" strokeWidth="2" stroke={color}/><circle cx="12" cy="16.5" r="0.5" fill={color}/></>,
    alertCircle: <><circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/><line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" stroke={color}/><circle cx="12" cy="16" r="0.5" fill={color}/></>,
    file: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="14,2 14,8 20,8" strokeWidth="1.5" stroke={color} fill="none"/></>,
    fileText: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="14,2 14,8 20,8" strokeWidth="1.5" stroke={color} fill="none"/><line x1="16" y1="13" x2="8" y2="13" strokeWidth="1.5" stroke={color}/><line x1="16" y1="17" x2="8" y2="17" strokeWidth="1.5" stroke={color}/><line x1="10" y1="9" x2="8" y2="9" strokeWidth="1.5" stroke={color}/></>,
    clock: <><circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="12,6 12,12 16,14" strokeWidth="1.5" stroke={color} fill="none"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 016.5 17H20" strokeWidth="1.5" stroke={color} fill="none"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" strokeWidth="1.5" stroke={color} fill="none"/></>,
    search: <><circle cx="11" cy="11" r="8" strokeWidth="1.5" stroke={color} fill="none"/><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2" stroke={color}/></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" strokeWidth="1.5" stroke={color} fill="none"/><line x1="4" y1="22" x2="4" y2="15" strokeWidth="1.5" stroke={color}/></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="7,10 12,15 17,10" strokeWidth="1.5" stroke={color} fill="none"/><line x1="12" y1="15" x2="12" y2="3" strokeWidth="1.5" stroke={color}/></>,
    layers: <><polygon points="12,2 2,7 12,12 22,7" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="2,17 12,22 22,17" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="2,12 12,17 22,12" strokeWidth="1.5" stroke={color} fill="none"/></>,
    zap: <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" strokeWidth="1.5" stroke={color} fill="none"/>,
    list: <><line x1="8" y1="6" x2="21" y2="6" strokeWidth="1.5" stroke={color}/><line x1="8" y1="12" x2="21" y2="12" strokeWidth="1.5" stroke={color}/><line x1="8" y1="18" x2="21" y2="18" strokeWidth="1.5" stroke={color}/><circle cx="3.5" cy="6" r="1.5" fill={color}/><circle cx="3.5" cy="12" r="1.5" fill={color}/><circle cx="3.5" cy="18" r="1.5" fill={color}/></>,
    bar: <><line x1="18" y1="20" x2="18" y2="10" strokeWidth="2.5" stroke={color} strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" strokeWidth="2.5" stroke={color} strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" strokeWidth="2.5" stroke={color} strokeLinecap="round"/></>,
    ext: <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="15,3 21,3 21,9" strokeWidth="1.5" stroke={color} fill="none"/><line x1="10" y1="14" x2="21" y2="3" strokeWidth="1.5" stroke={color}/></>,
    user: <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" strokeWidth="1.5" stroke={color} fill="none"/><circle cx="12" cy="7" r="4" strokeWidth="1.5" stroke={color} fill="none"/></>,
    users: <><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" strokeWidth="1.5" stroke={color} fill="none"/><circle cx="10" cy="7" r="4" strokeWidth="1.5" stroke={color} fill="none"/><path d="M21 21v-2a4 4 0 00-3-3.87" strokeWidth="1.5" stroke={color} fill="none"/><path d="M16 3.13a4 4 0 010 7.75" strokeWidth="1.5" stroke={color} fill="none"/></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2" strokeWidth="1.5" stroke={color} fill="none"/><path d="M8 11V8a4 4 0 118 0v3" strokeWidth="1.5" stroke={color} fill="none"/></>,
    home: <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="1.5" stroke={color} fill="none"/><polyline points="9,22 9,12 15,12 15,22" strokeWidth="1.5" stroke={color} fill="none"/></>,
    globe: <><circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/><line x1="2" y1="12" x2="22" y2="12" strokeWidth="1.5" stroke={color}/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" strokeWidth="1.5" stroke={color} fill="none"/></>,
    cpu: <><rect x="4" y="4" width="16" height="16" rx="2" strokeWidth="1.5" stroke={color} fill="none"/><rect x="9" y="9" width="6" height="6" strokeWidth="1.5" stroke={color} fill="none"/><line x1="9" y1="1" x2="9" y2="4" strokeWidth="1.5" stroke={color}/><line x1="15" y1="1" x2="15" y2="4" strokeWidth="1.5" stroke={color}/><line x1="9" y1="20" x2="9" y2="23" strokeWidth="1.5" stroke={color}/><line x1="15" y1="20" x2="15" y2="23" strokeWidth="1.5" stroke={color}/><line x1="20" y1="9" x2="23" y2="9" strokeWidth="1.5" stroke={color}/><line x1="20" y1="14" x2="23" y2="14" strokeWidth="1.5" stroke={color}/><line x1="1" y1="9" x2="4" y2="9" strokeWidth="1.5" stroke={color}/><line x1="1" y1="14" x2="4" y2="14" strokeWidth="1.5" stroke={color}/></>,
    settings: <><circle cx="12" cy="12" r="3" strokeWidth="1.5" stroke={color} fill="none"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" strokeWidth="1.5" stroke={color} fill="none"/></>,
    edit: <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeWidth="1.5" stroke={color} fill="none"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="1.5" stroke={color} fill="none"/></>,
    scale: <><path d="M16 3l5 5-5 5" strokeWidth="1.5" stroke={color} fill="none"/><path d="M8 3L3 8l5 5" strokeWidth="1.5" stroke={color} fill="none"/><line x1="12" y1="22" x2="12" y2="2" strokeWidth="1.5" stroke={color}/></>,
    heart: <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeWidth="1.5" stroke={color} fill="none"/></>,
    menu: <><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" stroke={color}/><line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" stroke={color}/><line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" stroke={color}/></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" stroke={color}/><line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" stroke={color}/></>,
    helpCircle: <><circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeWidth="1.5" stroke={color} fill="none"/><circle cx="12" cy="17" r="0.5" fill={color}/></>,
    refresh: <><polyline points="23,4 23,10 17,10" strokeWidth="1.5" stroke={color} fill="none"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" strokeWidth="1.5" stroke={color} fill="none"/></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="1.5" stroke={color} fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="1.5" stroke={color} fill="none"/></>,
    printer: <><polyline points="6,9 6,2 18,2 18,9" strokeWidth="1.5" stroke={color} fill="none"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" strokeWidth="1.5" stroke={color} fill="none"/><rect x="6" y="14" width="12" height="8" strokeWidth="1.5" stroke={color} fill="none"/></>,
    circle: <circle cx="12" cy="12" r="10" strokeWidth="1.5" stroke={color} fill="none"/>,
    circleFilled: <circle cx="12" cy="12" r="10" fill={color}/>,
    dot: <circle cx="12" cy="12" r="4" fill={color}/>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
    >
      {icons[name] || icons.info}
    </svg>
  );
};
