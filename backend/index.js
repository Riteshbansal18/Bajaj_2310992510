const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const USER_ID = 'Riteshbansal_18032006';
const EMAIL_ID = 'ritesh2510.be23@chitkara.edu.in';
const COLLEGE_ROLL = '2310992510';

function isValidEdge(s) {
  if (!/^[A-Z]->[A-Z]$/.test(s)) return false;
  if (s[0] === s[3]) return false;
  return true;
}

function buildSubtree(node, children) {
  const result = {};
  for (const child of (children[node] || [])) {
    result[child] = buildSubtree(child, children)[child];
  }
  const out = {};
  out[node] = result;
  return out;
}

function getDepth(node, children) {
  const kids = children[node] || [];
  if (kids.length === 0) return 1;
  return 1 + Math.max(...kids.map(k => getDepth(k, children)));
}

function cycleExists(nodes, children) {
  const visited = new Set();
  const inStack = new Set();

  function dfs(n) {
    visited.add(n);
    inStack.add(n);
    for (const c of (children[n] || [])) {
      if (!visited.has(c)) {
        if (dfs(c)) return true;
      } else if (inStack.has(c)) {
        return true;
      }
    }
    inStack.delete(n);
    return false;
  }

  for (const n of nodes) {
    if (!visited.has(n) && dfs(n)) return true;
  }
  return false;
}

function getComponents(allNodes, parentOf) {
  const parent = {};

  const find = n => {
    if (parent[n] === undefined) parent[n] = n;
    if (parent[n] !== n) parent[n] = find(parent[n]);
    return parent[n];
  };

  const union = (a, b) => {
    parent[find(a)] = find(b);
  };

  for (const [child, par] of Object.entries(parentOf)) union(child, par);
  for (const n of allNodes) find(n);

  const groups = {};
  for (const n of allNodes) {
    const root = find(n);
    if (!groups[root]) groups[root] = [];
    groups[root].push(n);
  }

  return Object.values(groups);
}

app.post('/bfhl', (req, res) => {
  const { data } = req.body || {};

  if (!Array.isArray(data)) {
    return res.status(400).json({ error: 'data must be an array' });
  }

  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const children = {};
  const parentOf = {};
  const allNodes = new Set();

  for (const raw of data) {
    const entry = String(raw).trim();

    if (!isValidEdge(entry)) {
      invalidEntries.push(raw);
      continue;
    }

    const [p, c] = entry.split('->');

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) duplicateEdges.push(entry);
      continue;
    }

    seenEdges.add(entry);
    allNodes.add(p);
    allNodes.add(c);

    if (!parentOf.hasOwnProperty(c)) {
      parentOf[c] = p;
      if (!children[p]) children[p] = [];
      children[p].push(c);
    }
  }

  const components = getComponents([...allNodes], parentOf);
  const hierarchies = [];

  for (const comp of components) {
    const isCyclic = cycleExists(comp, children);
    const roots = comp.filter(n => !parentOf.hasOwnProperty(n)).sort();

    if (isCyclic) {
      const cycleRoot = (roots.length > 0 ? roots : [...comp].sort())[0];
      hierarchies.push({ root: cycleRoot, tree: {}, has_cycle: true });
    } else {
      for (const root of roots) {
        const subtree = buildSubtree(root, children);
        const depth = getDepth(root, children);
        hierarchies.push({ root, tree: subtree, depth });
      }
    }
  }

  hierarchies.sort((a, b) => {
    if (!a.has_cycle && b.has_cycle) return -1;
    if (a.has_cycle && !b.has_cycle) return 1;
    return a.root.localeCompare(b.root);
  });

  const trees = hierarchies.filter(h => !h.has_cycle);
  const cycles = hierarchies.filter(h => h.has_cycle);

  let largestTreeRoot = null;
  if (trees.length > 0) {
    const best = [...trees].sort((a, b) =>
      b.depth !== a.depth ? b.depth - a.depth : a.root.localeCompare(b.root)
    );
    largestTreeRoot = best[0].root;
  }

  return res.json({
    user_id: USER_ID,
    email_id: EMAIL_ID,
    college_roll_number: COLLEGE_ROLL,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: {
      total_trees: trees.length,
      total_cycles: cycles.length,
      largest_tree_root: largestTreeRoot
    }
  });
});

app.get('/', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
