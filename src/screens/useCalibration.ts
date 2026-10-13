import { engine } from '../audio/engine';
import { median } from '../audio/pitchTrack';
import type { TrackedFrame } from '../audio/types';
import { saveCalib } from '../app/store';
import { useAudioStatus } from '../audio/engine';

/** 2초 무음 → 소음 바닥 */
export async function calibrateNoise(): Promise<number> {
  const floor = await engine.measureNoiseFloor(2);
  await saveCalib({ noiseFloorDb: floor, processing: useAudioStatus.getState().processing });
  return floor;
}

/** 편한 "아" 3초 → refDb(유성 프레임 rmsDb 중앙값). 유성 프레임이 부족하면 null */
export async function calibrateRef(): Promise<number | null> {
  const frames = (await engine.collect(3)) as TrackedFrame[];
  const voiced = frames.filter((f) => f.status === 'voiced');
  if (voiced.length < 30) return null;
  const ref = median(voiced.map((f) => f.rmsDb));
  engine.setCalibration({ refDb: ref });
  await saveCalib({ refDb: ref });
  return ref;
}
