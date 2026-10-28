import { clamp } from "./utils";

let flowGradientPeriod = 100;
let animFrameId: number | null = null;

export function getFlowGradientPeriod(): number {
  return flowGradientPeriod;
}

export function updateSankey(totalGen: number, totalUse: number, imbalance: number): void {
  const svg = document.getElementById("sankey-svg");
  const energyPath = document.getElementById("flow-energy");
  if (!svg || !energyPath) return;

  const VB_W = 600;
  const VB_H = 300;
  const yMid = 128;
  const xC = 300;
  const maxStroke = 36;
  const minStroke = 8;

  const scale = (v: number) => minStroke + (clamp(v, 0, 200) / 200) * (maxStroke - minStroke);
  const flowW = scale(Math.min(totalGen, totalUse, 180));

  const excess = imbalance > 3;
  const deficit = imbalance < -3;

  const awBase = 12 + flowW * 0.16;
  const ew = clamp(awBase * 0.78 * 2, 10, 56);
  const xRight = VB_W;
  const xLeft = 0;

  let dEnergy = "";
  if (!excess && !deficit) {
    dEnergy = `M ${xRight} ${yMid} L ${xLeft} ${yMid}`;
  } else if (excess) {
    dEnergy = `M ${xRight} ${yMid} L ${xC} ${yMid} L ${xC} ${VB_H} L ${xC} ${yMid} L ${xLeft} ${yMid}`;
  } else {
    dEnergy = `M ${xRight} ${yMid} L ${xC} ${yMid} L ${xC} 0 L ${xC} ${yMid} L ${xLeft} ${yMid}`;
  }

  energyPath.setAttribute("d", dEnergy);
  energyPath.setAttribute("stroke-width", String(ew));

  const gradEl = document.getElementById("energy-flow-gradient");
  if (gradEl) {
    const period = Math.max(72, Math.round(ew * 7.2));
    gradEl.setAttribute("x2", String(period));
    gradEl.setAttribute("x1", "0");
    flowGradientPeriod = period;
  }

  const arrowHead = svg.querySelector("#arrowhead-flow");
  if (arrowHead) arrowHead.remove();
}

export function startFlowAnimation(): void {
  if (animFrameId !== null) return;
  const loop = () => {
    const grad = document.getElementById("energy-flow-gradient");
    if (grad) {
      const tile = Math.max(1, flowGradientPeriod);
      const pxPerSec = 42;
      const shift = ((performance.now() / 1000) * pxPerSec) % tile;
      grad.setAttribute("gradientTransform", `translate(${-shift}, 0)`);
    }
    animFrameId = requestAnimationFrame(loop);
  };
  animFrameId = requestAnimationFrame(loop);
}

export function stopFlowAnimation(): void {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
}
