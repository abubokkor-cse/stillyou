import { describe, expect, it } from "vitest";
import {
  facePose,
  overlayTransform,
  smoothPose,
  type FaceAnchors,
} from "../src/lib/live-ar/geometry";

const front: FaceAnchors = {
  left: { x: 0.3, y: 0.4 },
  right: { x: 0.7, y: 0.4 },
  nose: { x: 0.5, y: 0.55 },
};

describe("live wig alignment", () => {
  it("follows translation and scale using eye anchors rather than the whole photo", () => {
    const source = facePose(front, 400, 400)!;
    const shifted = Object.fromEntries(
      Object.entries(front).map(([key, point]) => [
        key,
        { x: point.x + 0.1, y: point.y + 0.05 },
      ]),
    ) as FaceAnchors;
    const live = facePose(shifted, 800, 800)!;
    const transform = overlayTransform(source, live, 1, 0);
    expect(transform.scale).toBeCloseTo(2);
    expect(transform.x).toBeCloseTo(480);
    expect(transform.y).toBeCloseTo(360);
    expect(transform.anchorX).toBeCloseTo(200);
    expect(transform.anchorY).toBeCloseTo(160);
  });
  it("uses roll from the eyes and rejects excessive head turns", () => {
    const tilted = {
      ...front,
      left: { x: 0.3, y: 0.35 },
      right: { x: 0.7, y: 0.45 },
    };
    expect(facePose(tilted, 400, 400)!.angle).toBeCloseTo(Math.atan2(40, 160));
    expect(
      facePose({ ...front, nose: { x: 0.65, y: 0.55 } }, 400, 400),
    ).toBeNull();
    expect(
      facePose({ ...front, right: { x: 0.4, y: 0.8 } }, 400, 400),
    ).toBeNull();
  });
  it("hides the overlay for tiny faces and invalid landmarks", () => {
    expect(
      facePose(
        {
          left: { x: 0.49, y: 0.4 },
          right: { x: 0.51, y: 0.4 },
          nose: { x: 0.5, y: 0.41 },
        },
        640,
        480,
      ),
    ).toBeNull();
    expect(
      facePose({ ...front, nose: { x: Number.NaN, y: 0.5 } }, 640, 480),
    ).toBeNull();
  });
  it("smooths movement without retaining a previous pose after tracking is lost", () => {
    const pose = { x: 200, y: 160, span: 160, angle: 0 };
    expect(smoothPose(null, pose)).toEqual(pose);
    const moved = smoothPose(pose, { ...pose, x: 300 });
    expect(moved.x).toBeGreaterThan(200);
    expect(moved.x).toBeLessThan(300);
  });
  it("treats manual alignment as display controls rather than physical cap measurements", () => {
    const reference = { x: 200, y: 160, span: 160, angle: 0 };
    const transform = overlayTransform(reference, reference, 1.2, -0.1);
    expect(transform.scale).toBe(1.2);
    expect(transform.y).toBe(144);
    expect(reference.y).toBe(160);
  });
});
