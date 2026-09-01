import type {SVGProps} from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function Icon({children, ...props}: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="20"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PreviousIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 5v14" />
      <path d="m18 5-9 7 9 7V5Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 5h3v14H8zM14 5h3v14h-3z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function NextIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 5v14" />
      <path d="m6 5 9 7-9 7V5Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
      <path d="M19 6a8 8 0 0 1 0 12" />
    </Icon>
  );
}

export function MutedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 10v4h4l5 4V6L8 10H4Z" />
      <path d="m16 10 4 4m0-4-4 4" />
    </Icon>
  );
}
