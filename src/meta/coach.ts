import { ko } from '../copy/ko';

// §2.3 코치 피드: 세션마다 수치 요약 + 다음 행동 1개
export interface SessionSummary {
  durationSec: number;
  highZoneSec: number;
  warmupDone: boolean;
  newNoteLabels: string[];
  stoppedForDiscomfort: boolean;
  selfCheckNegative: boolean;
  energyLeftSec: number;
  playedClimber: boolean;
}

export function coachMessage(s: SessionSummary): string {
  const parts: string[] = [ko.coach.summary(Math.max(1, Math.round(s.durationSec / 60)), Math.round(s.highZoneSec))];
  if (s.newNoteLabels.length) parts.push(ko.coach.noteHeld(s.newNoteLabels[s.newNoteLabels.length - 1]));
  if (s.stoppedForDiscomfort) parts.push(ko.coach.stoppedEarly);
  else if (s.selfCheckNegative) parts.push(ko.coach.selfcheckNegative);
  else if (!s.warmupDone) parts.push(ko.coach.nextWarmup);
  else if (s.energyLeftSec <= 0) parts.push(ko.coach.nextRest);
  else if (s.playedClimber) parts.push(ko.coach.nextClimber);
  else parts.push(ko.coach.nextSiren);
  return parts.join(' ');
}
