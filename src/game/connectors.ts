import { readPlayerControls } from "./controls";

function cubicAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function cubicTangentAt(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

export function drawFlowConnectors(): void {
  const svg = document.getElementById("flow-connectors");
  const grid = document.querySelector(".main-grid");
  const sankey = document.getElementById("sankey-svg");
  if (!svg || !grid || !sankey) return;
  if (window.matchMedia("(max-width: 900px)").matches) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    return;
  }

  const { batteryMode } = readPlayerControls();

  const gRect = grid.getBoundingClientRect();
  const w = Math.max(1, Math.round(gRect.width));
  const h = Math.max(1, Math.round(gRect.height));
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.setAttribute("width", String(w));
  svg.setAttribute("height", String(h));

  const toLocal = (el: Element) => {
    const r = el.getBoundingClientRect();
    return {
      left: r.left - gRect.left,
      top: r.top - gRect.top,
      right: r.right - gRect.left,
      cx: (r.left + r.right) / 2 - gRect.left,
      cy: (r.top + r.bottom) / 2 - gRect.top,
    };
  };

  const flow = sankey.getBoundingClientRect();
  const flowLeft = flow.left - gRect.left;
  const flowRight = flow.right - gRect.left;
  const flowTop = flow.top - gRect.top;
  const flowWpx = flow.width;
  const flowH = flow.height;
  const flowMidY = flowTop + flowH / 2;

  const svgNS = "http://www.w3.org/2000/svg";
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const addPath = (d: string) => {
    const p = document.createElementNS(svgNS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", "flow-connector-line");
    svg.appendChild(p);
  };

  const addMidArrow = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, flip = false) => {
    const mx = cubicAt(0.5, x0, x1, x2, x3);
    const my = cubicAt(0.5, y0, y1, y2, y3);
    const tx = cubicTangentAt(0.5, x0, x1, x2, x3);
    const ty = cubicTangentAt(0.5, y0, y1, y2, y3);
    let angle = (Math.atan2(ty, tx) * 180) / Math.PI;
    if (flip) angle += 180;

    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("transform", `translate(${mx} ${my}) rotate(${angle})`);
    const arrow = document.createElementNS(svgNS, "path");
    arrow.setAttribute("class", "flow-connector-mid-arrow");
    const half = 7;
    const head = 4.5;
    const tip = half - 0.5;
    const wing = 3.5;
    arrow.setAttribute(
      "d",
      `M ${-half} 0 L ${tip - head} 0 M ${tip - head} 0 L ${tip - head - wing} ${-wing} M ${tip - head} 0 L ${tip - head - wing} ${wing}`
    );
    g.appendChild(arrow);
    svg.appendChild(g);
  };

  const prodKeys = ["wind", "solar", "gas", "nuclear", "hydro"];
  for (const key of prodKeys) {
    const card = document.querySelector(`.col-right .obj-card[data-key="${key}"]`);
    if (!card) continue;
    const c = toLocal(card);
    const midx = (c.left + flowRight) * 0.5;
    const x0 = c.left;
    const y0 = c.cy;
    const x1 = midx;
    const y1 = c.cy;
    const x2 = midx;
    const y2 = flowMidY;
    const x3 = flowRight;
    const y3 = flowMidY;
    addPath(`M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`);
    addMidArrow(x0, y0, x1, y1, x2, y2, x3, y3);
  }

  for (const key of ["house", "industry"]) {
    const card = document.querySelector(`.col-left .obj-card[data-key="${key}"]`);
    if (!card) continue;
    const c = toLocal(card);
    const midx = (c.right + flowLeft) * 0.5;
    const x0 = flowLeft;
    const y0 = flowMidY;
    const x1 = midx;
    const y1 = flowMidY;
    const x2 = midx;
    const y2 = c.cy;
    const x3 = c.right;
    const y3 = c.cy;
    addPath(`M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`);
    addMidArrow(x0, y0, x1, y1, x2, y2, x3, y3);
  }

  const battCard = document.querySelector(".battery-in-center .obj-card");
  if (battCard) {
    const c = toLocal(battCard);
    const bx = flowLeft + flowWpx / 2;
    const by = flowTop + flowH;
    const midy = c.top + (by - c.top) * 0.42;
    const x0 = c.cx;
    const y0 = c.top;
    const x1 = c.cx;
    const y1 = midy;
    const x2 = bx;
    const y2 = midy;
    const x3 = bx;
    const y3 = by;
    addPath(`M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}`);
    if (batteryMode !== "off") {
      addMidArrow(x0, y0, x1, y1, x2, y2, x3, y3, batteryMode === "charge");
    }
  }
}
