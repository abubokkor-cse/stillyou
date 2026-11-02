export type Point = { x: number; y: number };
export type FaceAnchors = { left: Point; right: Point; nose: Point };
export type Pose = { x: number; y: number; span: number; angle: number };

export function facePose(
  anchors: FaceAnchors,
  width: number,
  height: number,
): Pose | null {
  const left = { x: anchors.left.x * width, y: anchors.left.y * height };
  const right = { x: anchors.right.x * width, y: anchors.right.y * height };
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const span = Math.hypot(dx, dy);
  if (
    ![left.x, left.y, right.x, right.y, anchors.nose.x, anchors.nose.y].every(
      Number.isFinite,
    ) ||
    span < width * 0.09
  )
    return null;
  const x = (left.x + right.x) / 2;
  const y = (left.y + right.y) / 2;
  const angle = Math.atan2(dy, dx);
  const nx = anchors.nose.x * width - x;
  const ny = anchors.nose.y * height - y;
  const yaw = Math.abs((nx * dx + ny * dy) / (span * span));
  const pitch = (ny * dx - nx * dy) / (span * span);
  if (
    yaw > 0.24 ||
    Math.abs(angle) > Math.PI / 5 ||
    pitch < -0.12 ||
    pitch > 0.85
  )
    return null;
  return { x, y, span, angle };
}

export function smoothPose(previous: Pose | null, next: Pose): Pose {
  if (!previous) return next;
  const weight = 0.65;
  return {
    x: previous.x + (next.x - previous.x) * weight,
    y: previous.y + (next.y - previous.y) * weight,
    span: previous.span + (next.span - previous.span) * weight,
    angle: previous.angle + (next.angle - previous.angle) * weight,
  };
}

export function overlayTransform(
  reference: Pose,
  live: Pose,
  size: number,
  offset: number,
) {
  return {
    x: live.x,
    y: live.y + live.span * offset,
    scale: (live.span / reference.span) * size,
    rotation: live.angle - reference.angle,
    anchorX: reference.x,
    anchorY: reference.y,
  };
}
