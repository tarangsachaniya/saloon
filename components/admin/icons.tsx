import type { SVGProps } from "react";

/**
 * Hand-rolled 20x20 stroke icons for the admin navigation and buttons.
 *
 * No icon library: the whole set is nine glyphs, and pulling in a dependency
 * (plus its tree-shaking caveats) to draw nine paths would cost more bytes than
 * the app's entire admin bundle saves. They inherit `currentColor` and size
 * from the class, so a nav item and a button can share one glyph.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="6.5" height="6.5" rx="1.5" />
      <rect x="11" y="2.5" width="6.5" height="4" rx="1.5" />
      <rect x="11" y="8.5" width="6.5" height="9" rx="1.5" />
      <rect x="2.5" y="11" width="6.5" height="6.5" rx="1.5" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="4" width="15" height="13.5" rx="2" />
      <path d="M2.5 8h15M6.5 2.5v3M13.5 2.5v3" />
    </Icon>
  );
}

export function ScissorsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="15" r="2.3" />
      <circle cx="15" cy="15" r="2.3" />
      <path d="M13.6 13.2L5.8 3.2M6.4 13.2L14.2 3.2" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.6 2.5H17v7.4l-7.7 7.7a1.5 1.5 0 01-2.1 0l-5.3-5.3a1.5 1.5 0 010-2.1z" />
      <circle cx="13.6" cy="6.4" r="1.1" />
    </Icon>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="6.5" r="3" />
      <path d="M2.5 17c0-2.8 2.5-4.6 5.5-4.6s5.5 1.8 5.5 4.6" />
      <path d="M14 4.2a3 3 0 010 5.8M15.5 12.8c1.4.6 2.5 1.9 2.5 3.7" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="M10 1.8l1 2.1 2.3-.5 1 1.8-1.5 1.8 1.5 1.8-1 1.8-2.3-.5-1 2.1h-.1l-1-2.1-2.3.5-1-1.8 1.5-1.8-1.5-1.8 1-1.8 2.3.5 1-2.1z" />
    </Icon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M17 10a7 7 0 11-2.1-5" />
      <path d="M17.5 2.5V6h-3.5" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4v12M4 10h12" />
    </Icon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 5.5h13M8 5.5V3.8h4v1.7M5 5.5l.8 10.2a1.5 1.5 0 001.5 1.3h5.4a1.5 1.5 0 001.5-1.3L15 5.5" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.8" cy="8.8" r="5.3" />
      <path d="M12.8 12.8l4 4" />
    </Icon>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.5 6V4a1.5 1.5 0 00-1.5-1.5H4A1.5 1.5 0 002.5 4v12A1.5 1.5 0 004 17.5h7a1.5 1.5 0 001.5-1.5v-2" />
      <path d="M7.5 10h10M14.5 7l3 3-3 3" />
    </Icon>
  );
}
