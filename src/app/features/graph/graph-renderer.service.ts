import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import type { CommitNode, GraphEdge } from '../../../../shared/git.types';

export interface CommitClickEvent {
  commit: CommitNode;
  ctrlOrCmd: boolean;
}

const LANE_WIDTH = 20;
const ROW_HEIGHT = 28;
const COMMIT_RADIUS = 5;
const BUFFER_ROWS = 10;

@Injectable()
export class GraphRendererService implements OnDestroy {
  readonly commitClick$ = new Subject<CommitClickEvent>();
  readonly commitRightClick$ = new Subject<{ commit: CommitNode; x: number; y: number }>();

  private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
  private zoom!: d3.ZoomBehavior<SVGSVGElement, unknown>;

  private allCommits: CommitNode[] = [];
  private selectedHash: string | null = null;
  private currentTransform = d3.zoomIdentity;
  private viewportHeight = 0;
  private svgWidth = 0;

  constructor(private ngZone: NgZone) {}

  initialize(svgElement: SVGSVGElement): void {
    this.ngZone.runOutsideAngular(() => {
      this.svg = d3.select(svgElement);
      this.svgWidth = svgElement.clientWidth;
      this.viewportHeight = svgElement.clientHeight;

      this.svg.selectAll('*').remove();

      // Background rect for empty area clicks
      this.svg.append('rect')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('fill', 'transparent');

      this.g = this.svg.append('g').attr('class', 'graph-root');

      this.zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
          this.currentTransform = event.transform;
          this.g.attr('transform', event.transform.toString());
          this.updateVisibleWindow();
        });

      this.svg.call(this.zoom);
    });
  }

  render(commits: CommitNode[], selectedHash: string | null): void {
    this.ngZone.runOutsideAngular(() => {
      this.allCommits = commits;
      this.selectedHash = selectedHash;
      this.updateVisibleWindow();
    });
  }

  private updateVisibleWindow(): void {
    const { k, y } = this.currentTransform;
    const firstRow = Math.max(0, Math.floor(-y / (ROW_HEIGHT * k)) - BUFFER_ROWS);
    const lastRow = Math.min(
      this.allCommits.length,
      Math.ceil((-y + this.viewportHeight) / (ROW_HEIGHT * k)) + BUFFER_ROWS,
    );
    const visible = this.allCommits.slice(firstRow, lastRow);
    this.renderScene(visible);
  }

  private renderScene(commits: CommitNode[]): void {
    this.renderEdges(commits);
    this.renderNodes(commits);
    this.renderLabels(commits);
  }

  private renderEdges(commits: CommitNode[]): void {
    const posMap = new Map(commits.map((c) => [c.hash, c]));
    const edges = commits.flatMap((c) =>
      c.edgesToParents.filter((e) => posMap.has(e.toHash)),
    );

    const edgePath = (e: GraphEdge): string => {
      const from = posMap.get(e.fromHash)!;
      const to = posMap.get(e.toHash)!;
      const fx = from.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const fy = from.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
      const tx = to.lane * LANE_WIDTH + LANE_WIDTH / 2;
      const ty = to.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
      if (fx === tx) return `M${fx},${fy} L${tx},${ty}`;
      const midY = (fy + ty) / 2;
      return `M${fx},${fy} C${fx},${midY} ${tx},${midY} ${tx},${ty}`;
    };

    const sel = this.g.selectAll<SVGPathElement, GraphEdge>('path.edge')
      .data(edges, (d) => `${d.fromHash}-${d.toHash}`);

    sel.enter()
      .append('path')
      .attr('class', 'edge')
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', 1.5)
      .attr('d', edgePath)
      .style('opacity', 0)
      .transition().duration(250)
      .style('opacity', 1);

    sel.attr('d', edgePath).attr('stroke', (d) => d.color);

    sel.exit().transition().duration(150).style('opacity', 0).remove();
  }

  private renderNodes(commits: CommitNode[]): void {
    const cx = (c: CommitNode) => c.lane * LANE_WIDTH + LANE_WIDTH / 2;
    const cy = (c: CommitNode) => c.generation * ROW_HEIGHT + ROW_HEIGHT / 2;

    const sel = this.g.selectAll<SVGCircleElement, CommitNode>('circle.commit')
      .data(commits, (d) => d.hash);

    sel.enter()
      .append('circle')
      .attr('class', 'commit')
      .attr('r', COMMIT_RADIUS)
      .attr('cx', cx)
      .attr('cy', cy)
      .attr('fill', (d) => d.laneColor)
      .attr('stroke', (d) => d.hash === this.selectedHash ? '#fff' : d.laneColor)
      .attr('stroke-width', (d) => d.hash === this.selectedHash ? 2.5 : 1.5)
      .style('cursor', 'pointer')
      .on('click', (event: MouseEvent, d) => {
        this.ngZone.run(() =>
          this.commitClick$.next({ commit: d, ctrlOrCmd: event.ctrlKey || event.metaKey }),
        );
      })
      .on('contextmenu', (event: MouseEvent, d) => {
        event.preventDefault();
        this.ngZone.run(() =>
          this.commitRightClick$.next({ commit: d, x: event.clientX, y: event.clientY }),
        );
      })
      .style('opacity', 0)
      .transition().duration(250)
      .style('opacity', 1);

    sel
      .attr('cx', cx).attr('cy', cy)
      .attr('fill', (d) => d.laneColor)
      .attr('stroke', (d) => d.hash === this.selectedHash ? '#fff' : d.laneColor)
      .attr('stroke-width', (d) => d.hash === this.selectedHash ? 2.5 : 1.5);

    sel.exit().transition().duration(150).style('opacity', 0).remove();
  }

  private renderLabels(commits: CommitNode[]): void {
    // Calculate how many lane columns are in use
    const maxLane = commits.reduce((m, c) => Math.max(m, c.lane), 0);
    const labelsX = (maxLane + 1) * LANE_WIDTH + 12;

    const sel = this.g.selectAll<SVGTextElement, CommitNode>('text.commit-label')
      .data(commits, (d) => d.hash);

    const cy = (c: CommitNode) => c.generation * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;

    sel.enter()
      .append('text')
      .attr('class', 'commit-label')
      .attr('x', labelsX)
      .attr('y', cy)
      .attr('fill', '#8b949e')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .text((d) => `${d.shortHash} ${d.subject}`)
      .style('opacity', 0)
      .style('pointer-events', 'none')
      .transition().duration(250)
      .style('opacity', 1);

    sel.attr('x', labelsX).attr('y', cy).text((d) => `${d.shortHash} ${d.subject}`);

    sel.exit().transition().duration(150).style('opacity', 0).remove();

    // Branch/tag ref badges
    const refCommits = commits.filter((c) => c.refs.length > 0);
    const refData = refCommits.flatMap((c) =>
      c.refs.map((ref, i) => ({ commit: c, ref, i })),
    );

    const badges = this.g.selectAll<SVGGElement, typeof refData[0]>('g.ref-badge')
      .data(refData, (d) => `${d.commit.hash}-${d.ref}`);

    const badgeEnter = badges.enter().append('g').attr('class', 'ref-badge');
    badgeEnter.append('rect')
      .attr('rx', 3).attr('height', 14)
      .attr('fill', (d) => this.refColor(d.ref))
      .attr('opacity', 0.15);
    badgeEnter.append('text')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .attr('fill', (d) => this.refColor(d.ref))
      .attr('dominant-baseline', 'middle');

    // Position and size after text is rendered
    this.g.selectAll<SVGGElement, typeof refData[0]>('g.ref-badge').each(function(d) {
      const g = d3.select(this);
      const textEl = g.select<SVGTextElement>('text');
      const label = d.ref.replace('HEAD -> ', '').replace('tag: ', '');
      textEl.text(label);
      const cy2 = d.commit.generation * ROW_HEIGHT + ROW_HEIGHT / 2;
      const textWidth = (textEl.node()?.getBBox().width ?? 60) + 8;
      g.attr('transform', `translate(${labelsX + d.i * (textWidth + 4)},${cy2 - 7})`);
      g.select('rect').attr('width', textWidth);
      g.select('text').attr('x', 4).attr('y', 7);
    });

    badges.exit().remove();
  }

  private refColor(ref: string): string {
    if (ref.includes('HEAD')) return '#58a6ff';
    if (ref.startsWith('tag:')) return '#f78166';
    if (ref.startsWith('origin/') || ref.includes('remote')) return '#a5d6ff';
    return '#3fb950';
  }

  setViewportSize(width: number, height: number): void {
    this.ngZone.runOutsideAngular(() => {
      this.svgWidth = width;
      this.viewportHeight = height;
      this.updateVisibleWindow();
    });
  }

  selectCommit(hash: string | null): void {
    this.ngZone.runOutsideAngular(() => {
      this.selectedHash = hash;
      this.g.selectAll<SVGCircleElement, CommitNode>('circle.commit')
        .attr('stroke', (d) => d.hash === hash ? '#fff' : d.laneColor)
        .attr('stroke-width', (d) => d.hash === hash ? 2.5 : 1.5);
    });
  }

  scrollToCommit(hash: string): void {
    const commit = this.allCommits.find((c) => c.hash === hash);
    if (!commit) return;
    const targetY = -(commit.generation * ROW_HEIGHT * this.currentTransform.k);
    this.svg.transition().duration(400)
      .call(this.zoom.translateTo, LANE_WIDTH / 2, commit.generation * ROW_HEIGHT);
  }

  ngOnDestroy(): void {
    this.commitClick$.complete();
    this.commitRightClick$.complete();
  }
}
