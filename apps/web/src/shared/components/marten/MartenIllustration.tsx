import { MartenMascot, type MartenMascotPose } from './MartenMascot';
import './marten.css';

export type IllustrationPose = MartenMascotPose | 'peek' | 'loaf' | 'look-right' | 'perch' | 'nap' | 'look-back' | 'side-sleep';
const aliases: Partial<Record<IllustrationPose, MartenMascotPose>> = {
  peek: 'stand',
  loaf: 'rest',
  'look-right': 'thinking',
  'look-back': 'thinking',
  perch: 'sit',
  nap: 'rest',
  'side-sleep': 'rest',
};

/** 2D SVG Marten illustration for inline notes and empty states. */
export function MartenIllustration({ className, pose = 'idle' }: { className?: string; pose?: IllustrationPose; trackPointer?: boolean }) {
  const resolved = aliases[pose] ?? (pose as MartenMascotPose);
  return <MartenMascot className={className} pose={resolved} size="sm" />;
}
