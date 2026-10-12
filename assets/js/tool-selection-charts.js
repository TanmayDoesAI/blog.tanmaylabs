/*!
 * Tool Selection Lab: interactive charts (Apache ECharts, no build step).
 *
 * Markup comes from _includes/tool-selection-chart.html and
 * _includes/tool-selection-results.html. Every [data-tsl-chart] element is drawn
 * from the JSON at its data-src; nothing else is fetched.
 *
 * Data contract (assets/data/tool-selection-charts.json):
 *   models[]         {key, label, aggregate}
 *   strategies[]     {key, label, type}
 *   overall[]        three-model aggregate per strategy (model: "all-models")
 *   by_model[]       one row per model x strategy
 *   by_task_group[]  one row per model|all-models x strategy x group
 * "all-models" rows are precomputed aggregates; they are never summed with the
 * per-model rows here.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- config
  var AGG = 'all-models';
  // Fixed order and colour slot per model (slot 1..3 -> --tsl-model-1..3 in main.scss).
  // Keep in sync with tsl_order in _includes/tool-selection-results.html.
  var MODEL_ORDER = [
    'gpt-oss-20b',
    'nemotron-3.5-lightning-30b-a3b',
    'nemotron-3-super-120b-a12b'
  ];
  var SHAPES = ['circle', 'diamond', 'triangle'];
  var FEATURED = ['all', 'semantic-nim@10', 'keyword@10', 'agent-search', 'hybrid'];
  var LABELLED = ['all']; // strategies named directly on the scatterplot
  var COMPACT_PX = 560;

  var uid = 0;

  // --------------------------------------------------------------- helpers
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtInt(n) { return Math.round(n).toLocaleString('en-US'); }
  function pct(c, n) { return n ? (c * 100) / n : 0; }
  function fmtPct(p) { return p.toFixed(1) + '%'; }
  function fmtTokensAxis(n) { return n >= 1000 ? (n / 1000) + 'k' : String(n); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function parseHex(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // Blend `hex` toward white; amount 0 = unchanged, 1 = white.
  function tint(hex, amount) {
    var c = parseHex(hex).map(function (v) { return Math.round(v + (255 - v) * amount); });
    return 'rgb(' + c.join(',') + ')';
  }
  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function coarsePointer() {
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function readTheme(root) {
    var cs = getComputedStyle(root);
    function v(name, dflt) { return cs.getPropertyValue(name).trim() || dflt; }
    return {
      font: cs.fontFamily,
      ink: v('--tsl-ink', '#111111'),
      ink2: v('--tsl-ink-2', '#424242'),
      muted: v('--tsl-muted', '#6f6f6f'),
      grid: v('--tsl-grid', '#ebebe8'),
      axis: v('--tsl-axis', '#cfcfca'),
      track: v('--tsl-track', '#f3f3f0'),
      surface: v('--tsl-surface', '#ffffff'),
      aggregate: v('--tsl-aggregate', '#44505f'),
      models: [
        v('--tsl-model-1', '#2a78d6'),
        v('--tsl-model-2', '#eb6834'),
        v('--tsl-model-3', '#1baf7a')
      ]
    };
  }

  // ------------------------------------------------------------ data model
  function buildModel(raw) {
    ['models', 'strategies', 'overall', 'by_model', 'by_task_group'].forEach(function (k) {
      if (!Array.isArray(raw[k])) throw new Error('Chart data is missing "' + k + '"');
    });
    var aggregate = raw.models.filter(function (m) { return m.aggregate; })[0] ||
      { key: AGG, label: 'All models' };
    var individual = raw.models.filter(function (m) { return !m.aggregate; });
    individual.sort(function (a, b) {
      var ia = MODEL_ORDER.indexOf(a.key), ib = MODEL_ORDER.indexOf(b.key);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    var models = individual.map(function (m, i) { return { key: m.key, label: m.label, slot: i }; });

    var rows = {};
    raw.overall.forEach(function (r) { rows[r.model + '|' + r.strategy] = r; });
    raw.by_model.forEach(function (r) { rows[r.model + '|' + r.strategy] = r; });
    var groups = {};
    raw.by_task_group.forEach(function (r) { groups[r.model + '|' + r.strategy + '|' + r.group] = r; });

    if (raw.by_model.length !== models.length * raw.strategies.length) {
      console.warn('[tsl] expected ' + models.length * raw.strategies.length + ' model x strategy rows, found ' + raw.by_model.length);
    }

    var M = {
      raw: raw,
      aggregate: { key: aggregate.key, label: aggregate.label },
      models: models,
      strategies: raw.strategies,
      modelLabel: function (key) {
        return key === M.aggregate.key ? M.aggregate.label :
          (models.filter(function (m) { return m.key === key; })[0] || { label: key }).label;
      },
      row: function (model, strategy) {
        var r = rows[model + '|' + strategy];
        if (!r) throw new Error('No row for ' + model + ' / ' + strategy);
        return r;
      },
      group: function (model, strategy, group) {
        var r = groups[model + '|' + strategy + '|' + group];
        if (!r) throw new Error('No ' + group + ' row for ' + model + ' / ' + strategy);
        return r;
      },
      overallPct: function (strategy) {
        var r = rows[M.aggregate.key + '|' + strategy];
        return r ? pct(r.completed, r.jobs) : 0;
      }
    };
    return M;
  }

  function baseColor(modelKey, M, th) {
    if (modelKey === M.aggregate.key) return th.aggregate;
    var m = M.models.filter(function (x) { return x.key === modelKey; })[0];
    return th.models[m ? m.slot : 0];
  }

  // -------------------------------------------------------------- tooltips
  function tooltipBase(th, motion, formatter) {
    return {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(17,17,17,0.045)' } },
      confine: true,
      backgroundColor: th.surface,
      borderColor: th.axis,
      borderWidth: 1,
      padding: 0,
      textStyle: { color: th.ink, fontFamily: th.font, fontSize: 13 },
      extraCssText: 'border-radius:8px;box-shadow:0 8px 28px rgba(17,17,17,.14);',
      transitionDuration: motion ? 0.12 : 0,
      className: 'tsl-echarts-tip',
      formatter: formatter
    };
  }
  function tipRow(label, value, swatchHtml) {
    return '<div class="tsl-tip__row"><span class="tsl-tip__k">' + (swatchHtml || '') + esc(label) +
      '</span><span class="tsl-tip__v">' + value + '</span></div>';
  }
  function tipShell(title, sub, bodyHtml) {
    return '<div class="tsl-tip"><div class="tsl-tip__title">' + esc(title) + '</div>' +
      (sub ? '<div class="tsl-tip__sub">' + sub + '</div>' : '') + bodyHtml + '</div>';
  }
  function dotHtml(color, shape) {
    return '<i class="tsl-tip__dot tsl-tip__dot--' + (shape || 'circle') + '" style="--c:' + color + '"></i>';
  }

  function valueAxis(th, compact, opts) {
    return Object.assign({
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: th.grid } },
      axisLabel: { color: th.muted, fontSize: compact ? 11 : 12 }
    }, opts);
  }
  function categoryAxis(th, compact, labels) {
    return {
      type: 'category',
      inverse: true,
      data: labels,
      axisLine: { lineStyle: { color: th.axis } },
      axisTick: { show: false },
      axisLabel: {
        color: th.ink2,
        fontSize: compact ? 12 : 13,
        width: compact ? 104 : 168,
        overflow: 'break',
        lineHeight: 15,
        margin: 10
      }
    };
  }

  // ===================================================== chart 1: completion
  var completion = {
    init: function () { return { model: AGG }; },
    controls: function (M) {
      return [{
        id: 'model', type: 'radio', label: 'Model',
        options: [{ value: M.aggregate.key, label: M.aggregate.label, swatch: 'aggregate' }]
          .concat(M.models.map(function (m) { return { value: m.key, label: m.label, swatch: m.slot }; }))
      }];
    },
    rows: function (s, c) {
      var M = c.M;
      var data = M.strategies.map(function (st) {
        var r = M.row(s.model, st.key);
        return { st: st, r: r, pct: pct(r.completed, r.jobs) };
      });
      data.sort(function (a, b) { return b.pct - a.pct || M.overallPct(b.st.key) - M.overallPct(a.st.key); });
      return data;
    },
    height: function (s, c) { return 40 + c.M.strategies.length * (c.compact ? 44 : 38); },
    status: function (s, c) {
      var d = completion.rows(s, c);
      var top = d[0];
      var leaders = d.filter(function (x) { return x.pct === top.pct; });
      var text = 'Highest: ' + leaders.map(function (x) { return x.st.label; }).join(' and ') + ': ' +
        fmtInt(top.r.completed) + ' of ' + fmtInt(top.r.jobs) + ' tasks (' + fmtPct(top.pct) + ').';
      var next = d[leaders.length];
      if (next) text += ' Next: ' + next.st.label + ', ' + fmtPct(next.pct) + '.';
      return [text];
    },
    note: function (s, c) {
      var M = c.M, n = M.raw.methodology || {};
      var per = n.tasks_per_model_strategy || M.row(M.models[0].key, M.strategies[0].key).jobs;
      return M.aggregate.label + ' = ' + fmtInt(per * M.models.length) + ' jobs per strategy (' + per + ' tasks × ' +
        M.models.length + ' models); a single model = ' + per + '. Bars start at 0%. Sorted by the selected model’s completion rate.';
    },
    option: function (s, c) {
      var M = c.M, th = c.th;
      var base = baseColor(s.model, M, th);
      var data = completion.rows(s, c);
      var top = data[0].pct;
      return {
        animation: c.animate,
        animationDuration: 450,
        animationEasing: 'cubicOut',
        textStyle: { fontFamily: th.font },
        grid: { left: 2, right: c.compact ? 52 : 96, top: 6, bottom: 28, containLabel: true },
        tooltip: tooltipBase(th, c.animate, function (ps) {
          var d = (Array.isArray(ps) ? ps[0] : ps).data.meta;
          return tipShell(d.st.label, esc(M.modelLabel(s.model)),
            '<div class="tsl-tip__big">' + fmtPct(d.pct) + ' <span>completed</span></div>' +
            tipRow('Completed tasks', fmtInt(d.r.completed)) +
            tipRow('Total tasks', fmtInt(d.r.jobs)) +
            tipRow('Success rate', fmtPct(d.pct)));
        }),
        xAxis: valueAxis(th, c.compact, {
          min: 0, max: 100, interval: 25,
          axisLabel: { color: th.muted, fontSize: c.compact ? 11 : 12, formatter: '{value}%' }
        }),
        yAxis: categoryAxis(th, c.compact, data.map(function (d) { return d.st.label; })),
        series: [{
          type: 'bar',
          barWidth: c.compact ? 14 : 16,
          showBackground: true,
          backgroundStyle: { color: th.track, borderRadius: [0, 4, 4, 0] },
          emphasis: { disabled: true },
          data: data.map(function (d) {
            var lead = d.pct === top;
            return {
              value: d.pct,
              meta: d,
              itemStyle: { color: lead ? base : tint(base, 0.5), borderRadius: [0, 4, 4, 0] },
              label: { fontWeight: lead ? 700 : 400, color: lead ? th.ink : th.ink2 }
            };
          }),
          label: {
            show: true,
            position: 'right',
            fontSize: c.compact ? 12 : 13,
            distance: 8,
            formatter: function (p) {
              var lead = p.data.meta.pct === top;
              return fmtPct(p.value) + (lead && !c.compact ? '  {t|highest}' : '');
            },
            rich: { t: { color: th.muted, fontSize: 11, fontWeight: 400 } }
          }
        }]
      };
    }
  };

  // ================================================== chart 2: token tradeoff
  function tradeoffRows(M, visible) {
    var out = [];
    M.models.forEach(function (m) {
      if (!visible[m.key]) return;
      M.strategies.forEach(function (st) {
        var r = M.row(m.key, st.key);
        out.push({ m: m, st: st, r: r, pct: pct(r.completed, r.jobs), tok: r.tokens_per_completed_task });
      });
    });
    return out;
  }
  function tradeoffAll(M) {
    var v = {};
    M.models.forEach(function (m) { v[m.key] = true; });
    return tradeoffRows(M, v);
  }
  var tradeoff = {
    init: function (M) {
      var v = {};
      M.models.forEach(function (m) { v[m.key] = true; });
      return { visible: v };
    },
    controls: function (M) {
      return [{
        id: 'visible', type: 'toggle', label: 'Models',
        options: M.models.map(function (m) { return { value: m.key, label: m.label, swatch: m.slot }; })
      }];
    },
    height: function (s, c) { return c.compact ? 380 : 440; },
    status: function (s, c) {
      var d = tradeoffRows(c.M, s.visible);
      if (!d.length) return ['No models selected.'];
      var best = d.slice().sort(function (a, b) { return b.pct - a.pct || a.tok - b.tok; })[0];
      var lean = d.slice().sort(function (a, b) { return a.tok - b.tok || b.pct - a.pct; })[0];
      function line(prefix, x) {
        return prefix + ': ' + x.st.label + ' on ' + x.m.label + ', ' + fmtPct(x.pct) + ' (' + x.r.completed + '/' + x.r.jobs +
          ') at ' + fmtInt(x.tok) + ' tokens per completed task.';
      }
      return [line('Most reliable shown', best), line('Fewest tokens shown', lean)];
    },
    note: function () {
      return 'Tokens are model input plus output tokens, not dollar cost. Tokens per completed task includes tokens spent on failed ' +
        'jobs, so a strategy that fails more is charged for it. Horizontal axis is logarithmic: each gridline doubles the value. ' +
        'Token counts are observed lower bounds.';
    },
    option: function (s, c) {
      var M = c.M, th = c.th;
      var all = tradeoffAll(M);
      var xs = all.map(function (d) { return d.tok; }), ys = all.map(function (d) { return d.pct; });
      // Axis is log2(tokens / 1000) so gridlines sit at 1k, 2k, 4k, 8k ... and stay put when models are toggled.
      var xMin = Math.floor(Math.log2(Math.min.apply(null, xs) / 1000));
      var xMax = Math.ceil(Math.log2(Math.max.apply(null, xs) * 1.08 / 1000));
      var yMin = Math.max(0, Math.floor((Math.min.apply(null, ys) - 5) / 10) * 10);
      var yMax = Math.min(100, Math.ceil((Math.max.apply(null, ys) + 4) / 10) * 10);
      var size = coarsePointer() ? 17 : (c.compact ? 13 : 14);
      var grid = { left: c.compact ? 44 : 54, right: c.compact ? 14 : 22, top: 36, bottom: 58 };

      var series = M.models.map(function (m) {
        var color = th.models[m.slot];
        var pts = s.visible[m.key] ? all.filter(function (d) { return d.m.key === m.key; }) : [];
        return {
          type: 'scatter',
          name: m.label,
          symbol: SHAPES[m.slot],
          symbolSize: size,
          z: 3 + m.slot,
          itemStyle: { color: color, borderColor: th.surface, borderWidth: 2 },
          emphasis: { scale: 1.3, itemStyle: { borderColor: th.ink, borderWidth: 1.5 } },
          data: pts.map(function (d) {
            var named = LABELLED.indexOf(d.st.key) >= 0;
            return {
              value: [Math.log2(d.tok / 1000), d.pct],
              meta: d,
              label: { show: named && !c.compact, formatter: d.st.label, position: 'top', distance: 7, color: th.ink2, fontSize: 11.5 }
            };
          }),
          label: { show: false }
        };
      });

      return {
        animation: c.animate,
        animationDuration: 450,
        animationEasing: 'cubicOut',
        textStyle: { fontFamily: th.font },
        grid: grid,
        tooltip: Object.assign(tooltipBase(th, c.animate, function (p) {
          var d = p.data.meta;
          return tipShell(d.st.label,
            dotHtml(th.models[d.m.slot], SHAPES[d.m.slot]) + esc(d.m.label),
            tipRow('Completed tasks', fmtInt(d.r.completed) + ' of ' + fmtInt(d.r.jobs)) +
            tipRow('Success rate', fmtPct(d.pct)) +
            tipRow('Input tokens', fmtInt(d.r.input_tokens_total)) +
            tipRow('Output tokens', fmtInt(d.r.output_tokens_total)) +
            tipRow('Tokens per completed task', '<b>' + fmtInt(d.tok) + '</b>'));
        }), { trigger: 'item', axisPointer: { type: 'none' } }),
        xAxis: valueAxis(th, c.compact, {
          min: xMin, max: xMax, interval: 1,
          name: c.compact ? 'Model tokens per completed task (log scale)' : 'Model tokens per completed task (log scale; input + output; not dollars)',
          nameLocation: 'middle',
          nameGap: 36,
          nameTextStyle: { color: th.ink2, fontSize: c.compact ? 11 : 12 },
          axisLine: { lineStyle: { color: th.axis } },
          axisLabel: {
            color: th.muted, fontSize: c.compact ? 11 : 12,
            formatter: function (v) { return fmtTokensAxis(Math.round(1000 * Math.pow(2, v))); }
          }
        }),
        yAxis: valueAxis(th, c.compact, {
          min: yMin, max: yMax, interval: 10,
          name: 'Tasks completed (%)',
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { color: th.ink2, fontSize: c.compact ? 11 : 12, align: 'left', padding: [0, 0, 0, -grid.left + 6] },
          axisLabel: { color: th.muted, fontSize: c.compact ? 11 : 12, formatter: '{value}%' }
        }),
        graphic: [{
          type: 'text',
          left: grid.left + 8,
          top: grid.top + 6,
          silent: true,
          style: { text: '↖ more reliable, fewer tokens', fill: th.muted, font: (c.compact ? '11px ' : '12px ') + th.font }
        }],
        series: series
      };
    }
  };

  // ================================================= chart 3: complexity
  var complexity = {
    init: function (M, root) {
      var attr = root.getAttribute('data-featured');
      var keys = (attr ? attr.split(',').map(function (x) { return x.trim(); }) : FEATURED)
        .filter(function (k) { return M.strategies.some(function (st) { return st.key === k; }); });
      return { model: AGG, showAll: !keys.length, featured: keys };
    },
    controls: function (M) {
      return [
        {
          id: 'model', type: 'radio', label: 'Model',
          options: [{ value: M.aggregate.key, label: M.aggregate.label, swatch: 'aggregate' }]
            .concat(M.models.map(function (m) { return { value: m.key, label: m.label, swatch: m.slot }; }))
        },
        {
          id: 'showAll', type: 'radio', label: 'Strategies',
          options: [{ value: 'featured', label: 'Featured' }, { value: 'all', label: 'All ' + M.strategies.length }]
        }
      ];
    },
    rows: function (s, c) {
      var M = c.M;
      var list = M.strategies.filter(function (st) { return s.showAll || s.featured.indexOf(st.key) >= 0; });
      var data = list.map(function (st) {
        var one = M.group(s.model, st.key, 'single_tool');
        var multi = M.group(s.model, st.key, 'multi_step');
        return {
          st: st, one: one, multi: multi,
          p1: pct(one.completed, one.count), p2: pct(multi.completed, multi.count),
          overall: pct(M.row(s.model, st.key).completed, M.row(s.model, st.key).jobs)
        };
      });
      data.sort(function (a, b) { return b.overall - a.overall; });
      return data;
    },
    counts: function (s, c) {
      var st = c.M.strategies[0].key;
      return { one: c.M.group(s.model, st, 'single_tool').count, multi: c.M.group(s.model, st, 'multi_step').count };
    },
    height: function (s, c) {
      var n = complexity.rows(s, c).length;
      return 38 + n * (c.compact ? 70 : 58);
    },
    status: function (s, c) {
      var n = complexity.rows(s, c).length, k = complexity.counts(s, c);
      return ['Showing ' + n + ' of ' + c.M.strategies.length + ' strategies, ordered by overall completion for the selected model. ' +
        'Single-tool: ' + fmtInt(k.one) + ' tasks; multi-step: ' + fmtInt(k.multi) + ' tasks' +
        (s.model === c.M.aggregate.key ? ' (summed over ' + c.M.models.length + ' models).' : '.')];
    },
    note: function () {
      return 'Percentages are completed ÷ tasks in each group. Other task types (clarification, unsupported, confusable pairs) ' +
        'are not part of either group, so these bars do not add up to the overall completion rate. Solid = single-tool, hatched = multi-step.';
    },
    key: function (s, c) {
      var k = complexity.counts(s, c);
      return [
        { label: 'Single-tool', sub: fmtInt(k.one) + ' tasks', kind: 'solid' },
        { label: 'Multi-step', sub: fmtInt(k.multi) + ' tasks', kind: 'hatch' }
      ];
    },
    option: function (s, c) {
      var M = c.M, th = c.th;
      var base = baseColor(s.model, M, th);
      var data = complexity.rows(s, c);
      var radius = [0, 3, 3, 0];
      function lab(color) {
        return {
          show: true, position: 'right', distance: 6, color: color,
          fontSize: c.compact ? 11.5 : 12.5,
          formatter: function (p) { return fmtPct(p.value); }
        };
      }
      var multiStyle = {
        color: tint(base, 0.72),
        borderColor: base, borderWidth: 1, borderRadius: radius,
        decal: { symbol: 'rect', symbolSize: 1, rotation: Math.PI / 4, dashArrayX: [1, 0], dashArrayY: [2, 3.5], color: base }
      };
      return {
        animation: c.animate,
        animationDuration: 450,
        animationEasing: 'cubicOut',
        textStyle: { fontFamily: th.font },
        grid: { left: 2, right: c.compact ? 44 : 50, top: 6, bottom: 28, containLabel: true },
        tooltip: tooltipBase(th, c.animate, function (ps) {
          var d = (Array.isArray(ps) ? ps[0] : ps).data.meta;
          function sw(kind) {
            return '<i class="tsl-tip__sw tsl-tip__sw--' + kind + '" style="--c:' + base + '"></i>';
          }
          return tipShell(d.st.label, esc(M.modelLabel(s.model)),
            tipRow('Single-tool', '<b>' + fmtPct(d.p1) + '</b> · ' + fmtInt(d.one.completed) + ' / ' + fmtInt(d.one.count), sw('solid')) +
            tipRow('Multi-step', '<b>' + fmtPct(d.p2) + '</b> · ' + fmtInt(d.multi.completed) + ' / ' + fmtInt(d.multi.count), sw('hatch')));
        }),
        xAxis: valueAxis(th, c.compact, {
          min: 0, max: 100, interval: 25,
          axisLabel: { color: th.muted, fontSize: c.compact ? 11 : 12, formatter: '{value}%' }
        }),
        yAxis: categoryAxis(th, c.compact, data.map(function (d) { return d.st.label; })),
        series: [
          {
            name: 'Single-tool', type: 'bar', barWidth: 12, barGap: '18%', emphasis: { disabled: true },
            showBackground: true, backgroundStyle: { color: th.track, borderRadius: radius },
            itemStyle: { color: base, borderRadius: radius },
            label: lab(th.ink),
            data: data.map(function (d) { return { value: d.p1, meta: d }; })
          },
          {
            name: 'Multi-step', type: 'bar', barWidth: 12, emphasis: { disabled: true },
            showBackground: true, backgroundStyle: { color: th.track, borderRadius: radius },
            itemStyle: multiStyle,
            label: lab(th.ink2),
            data: data.map(function (d) { return { value: d.p2, meta: d }; })
          }
        ]
      };
    }
  };

  var KINDS = { completion: completion, tradeoff: tradeoff, complexity: complexity };

  // -------------------------------------------------------------- controls
  function swatchEl(sw, kindShape) {
    var s = el('i', 'tsl-sw');
    if (sw === 'aggregate') s.classList.add('tsl-sw--aggregate');
    else if (typeof sw === 'number') {
      s.classList.add('tsl-sw--m' + (sw + 1));
      if (kindShape) s.classList.add('tsl-sw--' + SHAPES[sw]);
    }
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function buildControls(host, specs, state, onChange, shapes) {
    var syncers = [];
    specs.forEach(function (spec) {
      var group = el('div', 'tsl-control');
      var labelId = 'tsl-l-' + (++uid);
      group.appendChild(el('span', 'tsl-control__label', spec.label)).id = labelId;
      var box = el('div', spec.type === 'radio' ? 'tsl-seg' : 'tsl-chips');
      box.setAttribute('role', spec.type === 'radio' ? 'radiogroup' : 'group');
      box.setAttribute('aria-labelledby', labelId);
      var buttons = spec.options.map(function (opt) {
        var b = el('button', spec.type === 'radio' ? 'tsl-seg__btn' : 'tsl-chip');
        b.type = 'button';
        b.setAttribute('data-value', opt.value);
        if (spec.type === 'radio') b.setAttribute('role', 'radio');
        if (opt.swatch !== undefined) b.appendChild(swatchEl(opt.swatch, shapes));
        b.appendChild(document.createTextNode(opt.label));
        box.appendChild(b);
        return b;
      });
      function isOn(opt) {
        if (spec.id === 'showAll') return (opt.value === 'all') === !!state.showAll;
        if (spec.type === 'toggle') return !!state[spec.id][opt.value];
        return state[spec.id] === opt.value;
      }
      function sync() {
        buttons.forEach(function (b, i) {
          var on = isOn(spec.options[i]);
          b.setAttribute(spec.type === 'radio' ? 'aria-checked' : 'aria-pressed', on ? 'true' : 'false');
          b.classList.toggle('is-on', on);
          if (spec.type === 'radio') b.tabIndex = on ? 0 : -1;
        });
      }
      buttons.forEach(function (b, i) {
        b.addEventListener('click', function () { onChange(spec, spec.options[i].value); });
        if (spec.type === 'radio') {
          b.addEventListener('keydown', function (e) {
            var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
            if (!d) return;
            e.preventDefault();
            var j = (i + d + buttons.length) % buttons.length;
            buttons[j].focus();
            onChange(spec, spec.options[j].value);
          });
        }
      });
      group.appendChild(box);
      host.appendChild(group);
      syncers.push(sync);
      sync();
    });
    host.hidden = false;
    return function () { syncers.forEach(function (f) { f(); }); };
  }

  function buildKey(host) {
    var wrap = el('div', 'tsl-key');
    wrap.setAttribute('aria-hidden', 'true');
    host.appendChild(wrap);
    return function (items, color) {
      wrap.style.setProperty('--tsl-key', color);
      wrap.textContent = '';
      items.forEach(function (it) {
        var i = el('span', 'tsl-key__item');
        i.appendChild(el('i', 'tsl-key__sw tsl-key__sw--' + it.kind));
        i.appendChild(document.createTextNode(it.label + ' '));
        i.appendChild(el('span', 'tsl-key__sub', '(' + it.sub + ')'));
        wrap.appendChild(i);
      });
    };
  }

  // ------------------------------------------------------------- lifecycle
  function mount(root, M) {
    var kind = KINDS[root.getAttribute('data-tsl-chart')];
    if (!kind) throw new Error('Unknown chart "' + root.getAttribute('data-tsl-chart') + '"');

    var canvas = root.querySelector('[data-tsl-canvas]');
    var controlsHost = root.querySelector('[data-tsl-controls]');
    var statusEl = root.querySelector('[data-tsl-status]');
    var noteEl = root.querySelector('[data-tsl-note]');
    var titleEl = root.querySelector('[data-tsl-title]');
    var id = ++uid;
    statusEl.id = 'tsl-s-' + id;
    titleEl.id = 'tsl-t-' + id;
    canvas.setAttribute('aria-labelledby', titleEl.id);
    canvas.setAttribute('aria-describedby', statusEl.id);

    var state = kind.init(M, root);
    var chart = window.echarts.init(canvas, null, { renderer: 'svg' });
    var compact = null, lastWidth = 0, syncControls = null, setKey = null;

    function ctx(animate) {
      var w = canvas.clientWidth;
      return { M: M, th: readTheme(root), compact: w < COMPACT_PX, width: w, animate: animate && !reducedMotion() };
    }

    function render(animate) {
      var c = ctx(animate);
      compact = c.compact;
      canvas.style.height = kind.height(state, c) + 'px';
      chart.resize();
      chart.setOption(kind.option(state, c), true);
      var lines = kind.status(state, c);
      statusEl.textContent = '';
      lines.forEach(function (l) { statusEl.appendChild(el('span', 'tsl-chart__status-line', l)); });
      noteEl.textContent = kind.note(state, c);
      if (setKey) setKey(kind.key(state, c), baseColor(state.model, M, c.th));
      if (syncControls) syncControls();
    }

    function onChange(spec, value) {
      if (spec.type === 'toggle') {
        var on = Object.keys(state.visible).filter(function (k) { return state.visible[k]; });
        if (state.visible[value] && on.length === 1) return; // keep at least one model visible
        state.visible[value] = !state.visible[value];
      } else if (spec.id === 'showAll') {
        state.showAll = value === 'all';
      } else {
        state[spec.id] = value;
      }
      render(true);
    }

    var specs = kind.controls(M);
    syncControls = buildControls(controlsHost, specs, state, onChange, root.getAttribute('data-tsl-chart') === 'tradeoff');
    if (kind.key) setKey = buildKey(controlsHost);
    render(true);

    // Responsive: resize on every width change, re-layout when crossing the compact breakpoint.
    var raf = 0;
    function onResize() {
      raf = 0;
      var w = canvas.clientWidth;
      if (!w || w === lastWidth) return;
      lastWidth = w;
      if ((w < COMPACT_PX) !== compact) render(false);
      else chart.resize();
    }
    lastWidth = canvas.clientWidth;
    if (window.ResizeObserver) {
      new ResizeObserver(function () { if (!raf) raf = requestAnimationFrame(onResize); }).observe(canvas);
    } else {
      window.addEventListener('resize', function () { if (!raf) raf = requestAnimationFrame(onResize); });
    }
    root.classList.add('is-ready');
  }

  // ----------------------------------------------------------------- table
  function renderTable(host, M) {
    var body = host.querySelector('[data-tsl-results-body]');
    var summary = host.querySelector('[data-tsl-results-summary]');
    if (!body) return;
    var ranked = M.strategies.slice().sort(function (a, b) { return M.overallPct(b.key) - M.overallPct(a.key); });
    var frag = document.createDocumentFragment();
    var count = 0;
    ranked.forEach(function (st) {
      M.models.forEach(function (m) {
        var r = M.row(m.key, st.key);
        var tr = document.createElement('tr');
        var th = el('th', null, st.label);
        th.scope = 'row';
        tr.appendChild(th);
        tr.appendChild(el('td', null, m.label));
        [
          fmtInt(r.completed) + ' / ' + fmtInt(r.jobs),
          fmtPct(pct(r.completed, r.jobs)),
          fmtInt(r.input_tokens_total),
          fmtInt(r.output_tokens_total),
          fmtInt(r.tokens_per_completed_task)
        ].forEach(function (t) { tr.appendChild(el('td', 'is-num', t)); });
        frag.appendChild(tr);
        count++;
      });
    });
    body.textContent = '';
    body.appendChild(frag);
    if (summary) summary.textContent = 'All ' + count + ' model and strategy results';
  }

  // ------------------------------------------------------------------ boot
  function fail(root, err) {
    console.error('[tsl] ' + (err && err.message ? err.message : err), err);
    root.classList.add('is-failed');
    var t = root.querySelector('[data-tsl-fallback]');
    if (t) t.hidden = false;
  }

  function boot() {
    var charts = Array.prototype.slice.call(document.querySelectorAll('[data-tsl-chart]'));
    var tables = Array.prototype.slice.call(document.querySelectorAll('[data-tsl-results]'));
    if (!charts.length && !tables.length) return;

    var cache = {};
    function load(src) {
      if (!cache[src]) {
        cache[src] = fetch(src, { credentials: 'same-origin' }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status + ' loading ' + src);
          return r.json();
        }).then(buildModel);
      }
      return cache[src];
    }

    tables.forEach(function (host) {
      load(host.getAttribute('data-src')).then(function (M) { renderTable(host, M); })
        .catch(function (e) { console.error('[tsl] table: ' + e.message); }); // static rows stay in place
    });

    if (!charts.length) return;
    if (!window.echarts) {
      charts.forEach(function (root) { fail(root, new Error('ECharts did not load')); });
      return;
    }

    function start(root) {
      load(root.getAttribute('data-src')).then(function (M) { mount(root, M); })
        .catch(function (e) { fail(root, e); });
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          start(en.target);
        });
      }, { rootMargin: '300px 0px' });
      charts.forEach(function (root) { io.observe(root); });
    } else {
      charts.forEach(start);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

})();
