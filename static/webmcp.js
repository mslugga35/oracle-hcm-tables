/**
 * WebMCP integration for hcm-tables.com
 * ---------------------------------------------------------------------------
 * Exposes the site's own lookup features to an AI agent running in the user's
 * browser, via the W3C WebMCP draft (document.modelContext).
 *
 * Status: Chrome origin trial 149-156. Enable locally with
 *   chrome://flags/#enable-webmcp-testing
 *
 * DESIGN RULE - read before adding a tool:
 * Every tool MUST respect the same paywall gate as the UI action it mirrors.
 * doSearch / searchTable / showTable are wrapped by paywallGate() in
 * index.html and count against the 5-free-search server allowance. A tool that
 * reads tablesData directly would be a paywall bypass. Route through the gate.
 *
 * Spec note: the registration getter moved navigator.modelContext ->
 * document.modelContext (Chrome 150 deprecated the old name). We probe both so
 * this keeps working across the trial window.
 */
(function () {
  'use strict';

  var mc = (typeof document !== 'undefined' && document.modelContext) ||
           (typeof navigator !== 'undefined' && navigator.modelContext) ||
           null;

  var hasApi = !!(mc && typeof mc.registerTool === 'function');

  // --- helpers ---------------------------------------------------------------

  function text(s) {
    return { content: [{ type: 'text', text: String(s) }] };
  }

  /** Uppercase + normalise "interview date" -> "INTERVIEW_DATE", same as doSearch. */
  function normalise(q) {
    return String(q || '').trim().toUpperCase().replace(/\s+/g, '_');
  }

  /**
   * Ask the server whether this call is allowed, using the SAME endpoint the UI
   * paywall uses. Returns {allowed, unlocked, remaining}. Fails open on network
   * error, matching paywallGate()'s degrade-gracefully behaviour.
   */
  async function checkGate() {
    try {
      var token = localStorage.getItem('hcm_unlock_token') || '';
      var url = token
        ? '/api/search-gate?token=' + encodeURIComponent(token)
        : '/api/search-gate';
      var res = await fetch(url);
      var data = await res.json();
      return {
        allowed: data.unlocked || data.allowed,
        unlocked: !!data.unlocked,
        remaining: typeof data.remaining === 'number' ? data.remaining : null
      };
    } catch (e) {
      return { allowed: true, unlocked: false, remaining: null };
    }
  }

  function lockedMessage() {
    return text(
      'Free lookup limit reached on hcm-tables.com. The visitor can unlock ' +
      'unlimited lookups from the paywall dialog on the page. Tell them that ' +
      'rather than retrying - repeated calls will keep returning this.'
    );
  }

  /** Wait until index.html's init() has populated tablesData. */
  function whenDataReady() {
    return new Promise(function (resolve) {
      var tries = 0;
      (function poll() {
        var ready = typeof tablesData !== 'undefined' &&
                    Array.isArray(tablesData) && tablesData.length > 0;
        if (ready || tries++ > 100) return resolve(ready);
        setTimeout(poll, 100);
      })();
    });
  }

  // --- tools -----------------------------------------------------------------

  /** PAYWALLED - mirrors doSearch(). */
  async function searchTables(args) {
    var gate = await checkGate();
    if (!gate.allowed) return lockedMessage();

    await whenDataReady();
    if (typeof loadColumns === 'function') await loadColumns();

    var q = normalise(args && args.query);
    if (q.length < 2) return text('Query must be at least 2 characters.');

    var limit = Math.min(Math.max(parseInt(args && args.limit, 10) || 20, 1), 50);

    var tables = tablesData
      .filter(function (t) { return t.name.indexOf(q) !== -1; })
      .slice(0, limit)
      .map(function (t) {
        return { name: t.name, type: t.type, module: t.module || 'HCM' };
      });

    var columns = [];
    if (typeof columnsData !== 'undefined' && Array.isArray(columnsData)) {
      columnsData
        .filter(function (c) { return c.n.indexOf(q) !== -1; })
        .slice(0, limit)
        .forEach(function (c) {
          columns.push({
            column: c.n,
            data_type: c.d,
            appears_in_tables: c.c,
            example_tables: c.t
          });
        });
    }

    if (!tables.length && !columns.length) {
      return text('No Oracle HCM tables or columns match "' + q + '".');
    }

    return text(JSON.stringify({
      query: q,
      matching_tables: tables,
      matching_columns: columns,
      free_lookups_remaining: gate.unlocked ? 'unlimited' : gate.remaining
    }, null, 2));
  }

  /** PAYWALLED - mirrors showTable(). */
  async function getTableSchema(args) {
    var gate = await checkGate();
    if (!gate.allowed) return lockedMessage();

    var name = normalise(args && args.table_name);
    if (!name) return text('table_name is required.');

    var res = await fetch('data/tables/' + encodeURIComponent(name) + '.json');
    if (!res.ok) {
      return text('No Oracle HCM table named "' + name + '". Use search_hcm_tables first.');
    }
    var table = await res.json();

    var suffix = null;
    if (typeof SUFFIX_INFO !== 'undefined') {
      Object.keys(SUFFIX_INFO).forEach(function (sfx) {
        if (!suffix && name.slice(-sfx.length) === sfx) {
          suffix = { suffix: sfx, label: SUFFIX_INFO[sfx].label, meaning: SUFFIX_INFO[sfx].desc };
        }
      });
    }

    return text(JSON.stringify({
      name: table.name,
      type: table.type,
      module: table.module || 'HCM',
      column_count: (table.columns || []).length,
      suffix_meaning: suffix,
      date_effective: /_F$|_M$/.test(name),
      columns: (table.columns || []).map(function (c) {
        return { name: c.name || c.n, data_type: c.data_type || c.d, nullable: c.nullable };
      })
    }, null, 2));
  }

  /** FREE - mirrors the module browser, which is not paywalled. */
  async function listModules() {
    await whenDataReady();
    if (typeof MODULE_PREFIXES === 'undefined') return text('Module data unavailable.');

    var counts = {};
    var keys = Object.keys(MODULE_PREFIXES).sort(function (a, b) { return b.length - a.length; });
    tablesData.forEach(function (t) {
      for (var i = 0; i < keys.length; i++) {
        if (t.name.indexOf(keys[i]) === 0) {
          counts[keys[i]] = (counts[keys[i]] || 0) + 1;
          return;
        }
      }
    });

    var modules = Object.keys(MODULE_PREFIXES)
      .filter(function (p) { return counts[p]; })
      .sort(function (a, b) { return counts[b] - counts[a]; })
      .map(function (p) {
        return { prefix: p, module: MODULE_PREFIXES[p], table_count: counts[p] };
      });

    return text(JSON.stringify({ modules: modules }, null, 2));
  }

  /** FREE - mirrors findJoinPath(), which is not paywalled. */
  async function findJoin(args) {
    var t1 = normalise(args && args.table_1);
    var t2 = normalise(args && args.table_2);
    if (!t1 || !t2) return text('Both table_1 and table_2 are required.');
    if (typeof FK_MAP === 'undefined') return text('FK map unavailable.');

    var common = Object.keys(FK_MAP).filter(function (col) {
      var tabs = FK_MAP[col];
      return tabs.indexOf(t1) !== -1 && tabs.indexOf(t2) !== -1;
    });

    if (!common.length) {
      return text(JSON.stringify({
        table_1: t1,
        table_2: t2,
        direct_join: false,
        advice: 'No direct FK relationship. Try an intermediate table such as PER_ALL_ASSIGNMENTS_M.'
      }, null, 2));
    }

    // Aliases must be unique - see the matching comment in index.html's
    // findJoinPath(). Oracle HCM tables usually share a 3-char prefix.
    var b1 = t1.substring(0, 3).toLowerCase();
    var b2 = t2.substring(0, 3).toLowerCase();
    var a1 = b1 === b2 ? b1 + '1' : b1;
    var a2 = b1 === b2 ? b2 + '2' : b2;
    var on = common.map(function (fk) { return a1 + '.' + fk + ' = ' + a2 + '.' + fk; }).join('\n  AND ');
    var sql = 'SELECT ' + a1 + '.*, ' + a2 + '.*\nFROM ' + t1 + ' ' + a1 + '\nJOIN ' + t2 + ' ' + a2 + '\n  ON ' + on;

    var filters = [];
    if (/_F$|_M$/.test(t1)) filters.push('TRUNC(SYSDATE) BETWEEN ' + a1 + '.EFFECTIVE_START_DATE AND ' + a1 + '.EFFECTIVE_END_DATE');
    if (/_F$|_M$/.test(t2)) filters.push('TRUNC(SYSDATE) BETWEEN ' + a2 + '.EFFECTIVE_START_DATE AND ' + a2 + '.EFFECTIVE_END_DATE');
    if (filters.length) sql += '\nWHERE ' + filters.join('\n  AND ');

    return text(JSON.stringify({
      table_1: t1,
      table_2: t2,
      direct_join: true,
      shared_fk_columns: common,
      date_effective_filter_applied: filters.length > 0,
      sql: sql
    }, null, 2));
  }

  // --- registration ----------------------------------------------------------

  var PUBLIC_TOOLS = [
    {
      name: 'search_hcm_tables',
      description:
        'Search 14,950 Oracle Fusion Cloud HCM tables, views and 1.2M columns by name. ' +
        'Use for questions like "which table holds employee national identifiers" or ' +
        '"find columns named ASSIGNMENT_ID". Counts against the free lookup allowance.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Table or column name fragment, e.g. "PER_ALL_PEOPLE" or "absence type".' },
          limit: { type: 'number', description: 'Max results per category, 1-50. Default 20.' }
        },
        required: ['query']
      },
      execute: searchTables
    },
    {
      name: 'get_hcm_table_schema',
      description:
        'Get the full column list, data types, module and date-effectivity of one Oracle HCM ' +
        'table or view by exact name. Counts against the free lookup allowance.',
      inputSchema: {
        type: 'object',
        properties: {
          table_name: { type: 'string', description: 'Exact table name, e.g. PER_ALL_PEOPLE_F.' }
        },
        required: ['table_name']
      },
      execute: getTableSchema
    },
    {
      name: 'list_hcm_modules',
      description:
        'List the 28 Oracle HCM module prefixes (PER_, PAY_, ANC_, IRC_ ...) with how many ' +
        'tables each contains. Use to orient before searching. Free, no lookup cost.',
      inputSchema: { type: 'object', properties: {} },
      execute: listModules
    },
    {
      name: 'find_hcm_join_path',
      description:
        'Generate a ready-to-run SQL JOIN between two Oracle HCM tables, including the ' +
        'EFFECTIVE_START_DATE/EFFECTIVE_END_DATE filters that date-tracked (_F, _M) tables ' +
        'require. Free, no lookup cost.',
      inputSchema: {
        type: 'object',
        properties: {
          table_1: { type: 'string', description: 'First table, e.g. PER_ALL_PEOPLE_F.' },
          table_2: { type: 'string', description: 'Second table, e.g. PER_PERSON_TYPES_TL.' }
        },
        required: ['table_1', 'table_2']
      },
      execute: findJoin
    }
  ];

  var registered = [];

  async function register(tool) {
    try {
      await mc.registerTool(tool);
      registered.push(tool.name);
    } catch (e) {
      console.warn('[webmcp] failed to register ' + tool.name + ':', e);
    }
  }

  /**
   * Always exposed, with or without the browser API. Two reasons:
   *  1. Tests can drive the tools via page.evaluate() without the origin trial,
   *     getting structured JSON back instead of screenshots to squint at.
   *  2. Makes the "is the flag on?" question answerable from the console.
   */
  window.__webmcp = {
    apiAvailable: hasApi,
    apiSurface: hasApi ? (document.modelContext ? 'document.modelContext' : 'navigator.modelContext') : null,
    registered: registered,
    tools: PUBLIC_TOOLS.map(function (t) { return t.name; }),
    /** Invoke a tool by name and return its plain text payload. */
    call: async function (name, args) {
      var tool = PUBLIC_TOOLS.filter(function (t) { return t.name === name; })[0];
      if (!tool) throw new Error('No such tool: ' + name);
      var out = await tool.execute(args || {});
      return out.content.map(function (c) { return c.text; }).join('\n');
    }
  };

  (async function boot() {
    if (!hasApi) {
      console.info('[webmcp] document.modelContext unavailable - site works normally. ' +
                   'Tools still callable for tests via window.__webmcp.call().');
      return;
    }
    for (var i = 0; i < PUBLIC_TOOLS.length; i++) await register(PUBLIC_TOOLS[i]);
    console.info('[webmcp] registered ' + registered.length + ' tools: ' + registered.join(', '));
  })();
})();
