import type { SVGProps } from 'react';
import type { RoleName } from '../types';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export const MicIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </Base>
);

export const MicOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6a3 3 0 0 1 6 0v5a3 3 0 0 1-.5 1.7M9 9.5V11a3 3 0 0 0 4.6 2.5" />
    <path d="M5 11a7 7 0 0 0 11.4 5.4M19 11a7 7 0 0 1-.6 2.8M12 18v3M4 4l16 16" />
  </Base>
);

export const CameraIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="13" height="12" rx="2.5" />
    <path d="m16 10 5-3v10l-5-3" />
  </Base>
);

export const CameraOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M8 6h5.5A2.5 2.5 0 0 1 16 8.5v5M16 10l5-3v10M16 16v-.5M13.5 18H5.5A2.5 2.5 0 0 1 3 15.5v-7A2.5 2.5 0 0 1 5.5 6M4 4l16 16" />
  </Base>
);

export const CrownIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m3 8 4.5 3.5L12 5l4.5 6.5L21 8l-1.5 10h-15L3 8Z" />
  </Base>
);

export const SkullIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3a8 8 0 0 0-8 8c0 2.7 1.3 5 3.5 6.4V20a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-2.6A7.9 7.9 0 0 0 20 11a8 8 0 0 0-8-8Z" />
    <circle cx="9" cy="11" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11" r="1.4" fill="currentColor" stroke="none" />
    <path d="M12 14.5v2" />
  </Base>
);

export const MoonIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 13.5A8 8 0 0 1 10.5 4 8 8 0 1 0 20 13.5Z" />
  </Base>
);

export const SunIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4 12H2m20 0h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
  </Base>
);

export const TimerIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </Base>
);

export const VoteIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m9 11 3 3 8-8" />
    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
  </Base>
);

export const ExitIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h11" />
  </Base>
);

export const LinkIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10 14a4.5 4.5 0 0 0 6.4.4l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.5 1.5" />
    <path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.5-1.5" />
  </Base>
);

export const GearIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Base>
);

export const PlayIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 4.5v15l12-7.5L7 4.5Z" fill="currentColor" stroke="none" />
  </Base>
);

export const PauseIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </Base>
);

export const StopIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" stroke="none" />
  </Base>
);

export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="m4 12.5 5 5L20 6.5" />
  </Base>
);

export const XIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Base>
);

export const ReviveIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
  </Base>
);

export const EyeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const EyeOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M10.7 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M14 14.2a3 3 0 0 1-4.2-4.2M6.6 6.9A16.7 16.7 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4-1M4 4l16 16" />
  </Base>
);

export const UsersIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 12 0M16 5a3.5 3.5 0 0 1 0 7M17.5 14.5A6 6 0 0 1 21 20" />
  </Base>
);

export const CopyIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Base>
);

export const WifiOffIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M2 8.5a15 15 0 0 1 5.7-3.2M9.7 5.2A15 15 0 0 1 22 8.5M5 12a10.5 10.5 0 0 1 3.4-2.2M12.5 9.6A10.5 10.5 0 0 1 19 12M8.5 15.5a6 6 0 0 1 7 0M12 19h.01M3 3l18 18" />
  </Base>
);

/* ---------- Role emblems (filled, decorative) ---------- */

export const FedoraIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="1.6">
    <path d="M7 12c0-1 .5-5.5 2-7 .8-.8 5.2-.8 6 0 1.5 1.5 2 6 2 7" />
    <path d="M2.5 13.5c2 1.6 6 2.5 9.5 2.5s7.5-.9 9.5-2.5c-1 2.5-5 4.5-9.5 4.5s-8.5-2-9.5-4.5Z" fill="currentColor" />
    <path d="M7 11.5h10" />
  </Base>
);

export const DetectiveIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="1.6">
    <circle cx="10" cy="10" r="6" />
    <path d="m14.5 14.5 6 6M8 10a2 2 0 0 1 2-2" />
  </Base>
);

export const DoctorCrossIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="1.6">
    <path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z" />
  </Base>
);

/* Дон: перстень с печаткой */
export const DonIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="1.6">
    <circle cx="12" cy="14" r="6" />
    <rect x="8.5" y="2.5" width="7" height="6" rx="1.5" fill="currentColor" stroke="none" />
    <path d="M10 14l1.5 1.5L14.5 12" />
  </Base>
);

/* Маньяк: нож */
export const ManiacIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="1.6">
    <path d="M13.5 10.5 20 4c.5 3.5-.5 7-3.5 10l-3-3.5Z" fill="currentColor" stroke="none" />
    <path d="m13.5 10.5-8 8M8 15l1.5 1.5M4 22l2.5-2.5" />
  </Base>
);

export const CivilianIcon = (p: IconProps) => (
  <Base {...p} strokeWidth="1.6">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Base>
);

export function RoleIcon({ role, ...p }: IconProps & { role: RoleName }) {
  switch (role) {
    case 'mafia':
      return <FedoraIcon {...p} />;
    case 'don':
      return <DonIcon {...p} />;
    case 'maniac':
      return <ManiacIcon {...p} />;
    case 'commissioner':
      return <DetectiveIcon {...p} />;
    case 'doctor':
      return <DoctorCrossIcon {...p} />;
    default:
      return <CivilianIcon {...p} />;
  }
}

/* Logo: венецианская маска из двух половин */
export function LogoMark({ size = 40, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden {...p}>
      <path
        d="M6 14c4-3 9-4 12-2l6 4 6-4c3-2 8-1 12 2-1 9-5 16-10 18-3 1.2-5.5 0-8-3-2.5 3-5 4.2-8 3-5-2-9-9-10-18Z"
        fill="url(#lg)"
        stroke="#c2a14a"
        strokeWidth="1.5"
      />
      <path d="M14 20c1.5-1.5 4.5-1.5 6 0M28 20c1.5-1.5 4.5-1.5 6 0" stroke="#0b0a0c" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="lg" x1="6" y1="10" x2="42" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#c9252f" />
          <stop offset="1" stopColor="#7f1d24" />
        </linearGradient>
      </defs>
    </svg>
  );
}
