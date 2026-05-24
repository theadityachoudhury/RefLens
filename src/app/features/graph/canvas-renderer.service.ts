import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import type { CommitNode, GraphEdge } from '../../../../shared/git.types';
import type { CommitGraph } from '../../../../shared/commit-graph';

export interface CommitClickEvent {
  commit: CommitNode;
  ctrlOrCmd: boolean;
}

const LANE_WIDTH = 20;
const ROW_HEIGHT = 28;
const COMMIT_RADIUS = 5;
const BUFFER_ROWS = 10;

@Injectable()
export class CanvasRendererService implements OnDestroy {
  readonly commitClick$ = new Subject<CommitClickEvent>();
  readonly commitRightClick$ = new Subject<{ commit: CommitNode; x: number; y: number }>();

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private zoom!: d3.ZoomBehavior<HTMLCanvasElement, unknown>;

  private graph!: CommitGraph;
  private selectedHash: string | null = null;
  private hoveredHash: string | null = null;

  private tx = 0;
  private ty = 0;
  private scale = 1;

  private viewportWidth = 0;
  private viewportHeight = 0;

  private rafId: number | null = null;
  private dirty = false;

  // Track pointer-down position for click vs pan disambiguation
  private pointerDownPos: { x: number; y: number } | null = null;

  constructor(private ngZone: NgZone) {}

  initialize(canvasElement: HTMLCanvasElement): void {
    this.ngZone.runOutsideAngular(() => {
      this.canvas = canvasElement;
      this.ctx = canvasElement.getContext('2d')!;
      this.viewportWidth = canvasElement.clientWidth;
      this.viewportHeight = canvasElement.clientHeight;

      this.syncCanvasSize();

      this.zoom = d3.zoom<HTMLCanvasElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (event: d3.D3ZoomEvent<HTMLCanvasElement, unknown>) => {
          const t = event.transform;
          this.tx = t.x;
          this.ty = t.y;
          this.scale = t.k;
          this.scheduleFrame();
        });

      d3.select(canvasElement).call(this.zoom);

      canvasElement.addEventListener('pointermove', this.onPointerMove);
      canvasElement.addEventListener('pointerdown', this.onPointerDown);
      canvasElement.addEventListener('pointerup', this.onPointerUp);
      canvasElement.addEventListener('contextmenu', this.onContextMenu);
    });
  }

  render(graph: CommitGraph, selectedHash: string | null): void {
    this.ngZone.runOutsideAngular(() => {
      this.graph = graph;
      this.selectedHash = selectedHash;
      this.scheduleFrame();
    });
  }

  selectCommit(hash: string | null): void {
    this.ngZone.runOutsideAngular(() => {
      this.selectedHash = hash;
      this.scheduleFrame();
    });
  }

  scrollToCommit(hash: string): void {
    if (!this.graph) return;
    const commit = this.graph.getNode(hash);
    if (!commit) return;
    const targetX = this.viewportWidth / 2;
    const targetY = this.viewportHeight / 2;
    const commitY = commit.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
    d3.select(this.canvas)
      .transition()
      .duration(400)
      .call(this.zoom.translateTo, LANE_WIDTH / 2, commitY);
  }

  setViewportSize(width: number, height: number): void {
    this.ngZone.runOutsideAngular(() => {
      this.viewportWidth = width;
      this.viewportHeight = height;
      this.syncCanvasSize();
      this.scheduleFrame();
    });
  }

  private syncCanvasSize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.viewportWidth * dpr;
    this.canvas.height = this.viewportHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  private scheduleFrame(): void {
    if (this.dirty) return;
    this.dirty = true;
    this.rafId = requestAnimationFrame(() => {
      this.dirty = false;
      this.rafId = null;
      this.draw();
    });
  }

  private draw(): void {
    if (!this.ctx || !this.graph) return;
    const { ctx, viewportWidth: w, viewportHeight: h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(this.tx, this.ty);
    ctx.scale(this.scale, this.scale);

    const commits = this.graph.nodes as CommitNode[];
    const { first, last } = this.visibleRange(commits.length);
    const visible = commits.slice(first, last);

    this.drawEdges(visible);
    this.drawNodes(visible);
    this.drawLabels(visible);

    ctx.restore();
  }

  private visibleRange(total: number): { first: number; last: number } {
    const first = Math.max(0, Math.floor(-this.ty / (ROW_HEIGHT * this.scale)) - BUFFER_ROWS);
    const last = Math.min(
      total,
      Math.ceil((-this.ty + this.viewportHeight) / (ROW_HEIGHT * this.scale)) + BUFFER_ROWS,
    );
    return { first, last };
  }

  private drawEdges(commits: CommitNode[]): void {
    const posMap = new Map(commits.map((c) => [c.hash, c]));
    // Group edges by color to batch draw calls
    const byColor = new Map<string, { edge: GraphEdge; from: CommitNode; to: CommitNode }[]>();

    for (const commit of commits) {
      for (const edge of commit.edgesToParents) {
        const to = posMap.get(edge.toHash);
        if (!to) continue;
        const bucket = byColor.get(edge.color);
        const entry = { edge, from: commit, to };
        if (bucket) bucket.push(entry);
        else byColor.set(edge.color, [entry]);
      }
    }

    const { ctx } = this;
    ctx.lineWidth = 1.5;
    for (const [color, entries] of byColor) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (const { from, to } of entries) {
        const fx = from.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const fy = from.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
        const tx2 = to.lane * LANE_WIDTH + LANE_WIDTH / 2;
        const ty2 = to.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
        ctx.moveTo(fx, fy);
        if (fx === tx2) {
          ctx.lineTo(tx2, ty2);
        } else {
          const midY = (fy + ty2) / 2;
          ctx.bezierCurveTo(fx, midY, tx2, midY, tx2, ty2);
        }
      }
      ctx.stroke();
    }
  }

  private drawNodes(commits: CommitNode[]): void {
    const { ctx } = this;
    for (const commit of commits) {
      const cx = commit.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const cy = commit.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
      const isSelected = commit.hash === this.selectedHash;
      const isHovered = commit.hash === this.hoveredHash;
      const r = isHovered ? COMMIT_RADIUS + 2 : COMMIT_RADIUS;

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = commit.laneColor;
      ctx.fill();

      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected ? '#ffffff' : commit.laneColor;
      ctx.stroke();
    }
  }

  private drawLabels(commits: CommitNode[]): void {
    if (commits.length === 0) return;
    const maxLane = commits.reduce((m, c) => Math.max(m, c.lane), 0);
    const labelsX = (maxLane + 1) * LANE_WIDTH + 12;
    const { ctx } = this;

    ctx.font = '11px monospace';
    ctx.fillStyle = '#8b949e';
    ctx.textBaseline = 'middle';

    for (const commit of commits) {
      const y = commit.generation * ROW_HEIGHT + ROW_HEIGHT / 2;

      if (commit.refs.length === 0) {
        ctx.fillStyle = '#8b949e';
        ctx.fillText(`${commit.shortHash} ${commit.subject}`, labelsX, y);
      } else {
        // Draw ref badges first, then subject
        let badgeX = labelsX;
        for (const ref of commit.refs) {
          const label = ref.replace('HEAD -> ', '').replace('tag: ', '');
          const color = this.refColor(ref);
          ctx.font = '10px monospace';
          const textWidth = ctx.measureText(label).width;
          const badgeW = textWidth + 8;
          const badgeH = 14;
          const badgeY = y - badgeH / 2;

          // Badge background
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.15;
          this.roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 3);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Badge text
          ctx.fillStyle = color;
          ctx.fillText(label, badgeX + 4, y);

          badgeX += badgeW + 4;
        }

        // Commit subject after badges
        ctx.font = '11px monospace';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(`${commit.shortHash} ${commit.subject}`, badgeX + 4, y);
      }
    }

    ctx.textBaseline = 'alphabetic';
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  private refColor(ref: string): string {
    if (ref.includes('HEAD')) return '#58a6ff';
    if (ref.startsWith('tag:')) return '#f78166';
    if (ref.startsWith('origin/') || ref.includes('remote')) return '#a5d6ff';
    return '#3fb950';
  }

  private hitTest(screenX: number, screenY: number): CommitNode | null {
    if (!this.graph) return null;
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    const logicalX = (canvasX - this.tx) / this.scale;
    const logicalY = (canvasY - this.ty) / this.scale;

    const commits = this.graph.nodes as CommitNode[];
    const { first, last } = this.visibleRange(commits.length);
    const hitRadiusSq = (COMMIT_RADIUS + 4) ** 2;

    for (let i = first; i < last; i++) {
      const c = commits[i];
      const cx = c.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const cy = c.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
      const dx = logicalX - cx;
      const dy = logicalY - cy;
      if (dx * dx + dy * dy <= hitRadiusSq) return c;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerMove = (e: PointerEvent): void => {
    const hit = this.hitTest(e.clientX, e.clientY);
    const newHash = hit?.hash ?? null;
    if (newHash !== this.hoveredHash) {
      this.hoveredHash = newHash;
      this.canvas.style.cursor = hit ? 'pointer' : 'grab';
      this.scheduleFrame();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerDownPos) return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    this.pointerDownPos = null;

    if (dx * dx + dy * dy > 25) return; // was a pan, not a click

    const hit = this.hitTest(e.clientX, e.clientY);
    if (hit) {
      this.ngZone.run(() =>
        this.commitClick$.next({ commit: hit, ctrlOrCmd: e.ctrlKey || e.metaKey }),
      );
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    const hit = this.hitTest(e.clientX, e.clientY);
    if (hit) {
      this.ngZone.run(() =>
        this.commitRightClick$.next({ commit: hit, x: e.clientX, y: e.clientY }),
      );
    }
  };

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.canvas) {
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointerup', this.onPointerUp);
      this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    }
    this.commitClick$.complete();
    this.commitRightClick$.complete();
  }
}
