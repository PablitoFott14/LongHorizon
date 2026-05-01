/* ════════════════════════════════════════════════════════
   LongHorizon · Network Graph
   D3 force-directed: Users ↔ Services
════════════════════════════════════════════════════════ */

class NetworkGraph {
  constructor(svgId, tooltipId) {
    this.svgEl     = document.getElementById(svgId);
    this.tipEl     = document.getElementById(tooltipId);
    this.sim       = null;
    this.zoom      = null;
    this.g         = null;
    this.allNodes  = [];
    this.allLinks  = [];
    this.shownCats = ['health', 'shopping', 'lifestyle'];
    this._built    = false;
  }

  build(data, personas, services, catColors) {
    if (this._built) return;
    this._built = true;

    this.personas  = personas;
    this.services  = services;
    this.catColors = catColors;
    this.data      = data;

    this._buildGraph();
    this._render();
  }

  _buildGraph() {
    const { personas, services, data } = this;

    /* User nodes */
    const userNodes = personas.map(p => ({
      id:       p.id,
      label:    p.name.split(' ')[0],
      fullName: p.name,
      email:    p.email,
      type:     'user',
      color:    '#14b8a6',
      r:        20,
    }));

    /* Service nodes */
    const serviceNodes = Object.entries(services).map(([key, svc]) => ({
      id:       `svc:${key}`,
      label:    svc.icon,
      fullName: svc.label,
      icon:     svc.icon,
      type:     'service',
      category: svc.category,
      color:    svc.color,
      r:        14,
      svcKey:   key,
    }));

    this.allNodes = [...userNodes, ...serviceNodes];

    /* Edges: user → service — use the users/user_profiles/athletes index, not all records */
    const svcUserSets = {};
    Object.entries(services).forEach(([key]) => {
      const d = data[key] || {};
      const users = d.users || d.user_profiles || d.athletes || [];
      svcUserSets[key] = new Set(users.map(u => u.user_id || u.persona_id).filter(Boolean));
    });

    const links = [];
    personas.forEach(p => {
      Object.entries(services).forEach(([key]) => {
        const hasData = svcUserSets[key]?.has(p.id);
        if (hasData) {
          links.push({
            source: p.id,
            target: `svc:${key}`,
            category: services[key].category,
          });
        }
      });
    });

    this.allLinks = links;
  }

  _render() {
    const svg   = d3.select(this.svgEl);
    const W     = this.svgEl.clientWidth  || 900;
    const H     = this.svgEl.clientHeight || 520;

    svg.selectAll('*').remove();

    /* Arrow marker */
    svg.append('defs').selectAll('marker')
      .data(['default'])
      .join('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 22)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
      .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', '#253556');

    this.zoom = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => { this.g.attr('transform', event.transform); });

    svg.call(this.zoom);
    this.g = svg.append('g');

    this._renderFiltered();
  }

  _renderFiltered() {
    const { g, allNodes, allLinks, shownCats, catColors } = this;
    const W = this.svgEl.clientWidth  || 900;
    const H = this.svgEl.clientHeight || 520;

    g.selectAll('*').remove();

    const visibleServiceIds = new Set(
      allNodes.filter(n => n.type === 'service' && shownCats.includes(n.category)).map(n => n.id)
    );

    const nodes = allNodes.filter(n =>
      n.type === 'user' || visibleServiceIds.has(n.id)
    );
    const nodeIds = new Set(nodes.map(n => n.id));

    const links = allLinks.filter(l =>
      shownCats.includes(l.category) &&
      nodeIds.has(typeof l.source === 'object' ? l.source.id : l.source) &&
      nodeIds.has(typeof l.target === 'object' ? l.target.id : l.target)
    );

    /* Force simulation */
    if (this.sim) this.sim.stop();

    this.sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(90).strength(0.4))
      .force('charge', d3.forceManyBody().strength(-240))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide().radius(d => d.r + 10));

    /* Links */
    const link = g.append('g').selectAll('line')
      .data(links).join('line')
        .attr('stroke', d => (catColors[d.category] || '#253556') + '44')
        .attr('stroke-width', 1.2)
        .attr('marker-end', 'url(#arrow)');

    /* Node groups */
    const node = g.append('g').selectAll('g')
      .data(nodes).join('g')
        .attr('class', 'net-node')
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) this.sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active) this.sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
        );

    /* Node circles */
    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => d.color + (d.type === 'user' ? '22' : '18'))
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.type === 'user' ? 2 : 1.5);

    /* Node labels */
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => d.type === 'user' ? '10px' : '14px')
      .attr('font-family', d => d.type === 'user' ? 'Inter, sans-serif' : 'Apple Color Emoji, sans-serif')
      .attr('font-weight', d => d.type === 'user' ? '600' : 'normal')
      .attr('fill', d => d.type === 'user' ? '#f1f5f9' : 'currentColor')
      .text(d => d.label);

    /* Node name label below */
    node.filter(d => d.type === 'user')
      .append('text')
        .attr('text-anchor', 'middle')
        .attr('y', d => d.r + 12)
        .attr('font-size', '9px')
        .attr('fill', '#94a3b8')
        .text(d => d.fullName.split(' ')[0]);

    /* Tooltip */
    const tip = this.tipEl;
    node
      .on('mouseover', (event, d) => {
        const connCount = links.filter(l =>
          (l.source.id || l.source) === d.id || (l.target.id || l.target) === d.id
        ).length;
        tip.innerHTML = `
          <div class="tt-type">${d.type === 'user' ? 'Persona' : d.category + ' service'}</div>
          <div style="font-weight:600;color:#f1f5f9;margin-bottom:4px">${d.fullName}</div>
          ${d.type === 'user' ? `<div class="tt-row">📧 ${d.email}</div>` : `<div class="tt-row">${d.color ? '' : ''}${d.category}</div>`}
          <div class="tt-row">🔗 ${connCount} connection${connCount !== 1 ? 's' : ''}</div>`;
        tip.classList.remove('hidden');
        tip.style.left = (event.offsetX + 14) + 'px';
        tip.style.top  = (event.offsetY + 14) + 'px';

        /* Dim unconnected */
        const connectedIds = new Set([d.id]);
        links.forEach(l => {
          const s = l.source.id || l.source;
          const t = l.target.id || l.target;
          if (s === d.id) connectedIds.add(t);
          if (t === d.id) connectedIds.add(s);
        });
        node.style('opacity', n => connectedIds.has(n.id) ? 1 : 0.15);
        link.style('opacity', l => {
          const s = l.source.id || l.source;
          const t = l.target.id || l.target;
          return (s === d.id || t === d.id) ? 1 : 0.05;
        });
      })
      .on('mousemove', (event) => {
        tip.style.left = (event.offsetX + 14) + 'px';
        tip.style.top  = (event.offsetY + 14) + 'px';
      })
      .on('mouseout', () => {
        tip.classList.add('hidden');
        node.style('opacity', 1);
        link.style('opacity', 0.6);
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        if (d.type === 'user') openUserModal(d.id);
        else {
          const catTab = d.category === 'health' ? 'health' : d.category === 'shopping' ? 'shopping' : 'lifestyle';
          navigateTo(catTab);
        }
      });

    /* Tick */
    this.sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    /* Initial alpha */
    this.sim.alpha(0.8).restart();
  }

  setCategories(cats) {
    this.shownCats = cats;
    this._renderFiltered();
  }

  resetZoom() {
    const svg = d3.select(this.svgEl);
    svg.transition().duration(400).call(
      this.zoom.transform, d3.zoomIdentity
    );
  }
}
