const ELEMENTARY_CHARGE = 1.602176634e-19;
const BOLTZMANN = 1.380649e-23;
const AVOGADRO = 6.02214076e23;
const EPS0 = 8.8541878128e-12;

const controls = {
  cylinderCount: document.getElementById("cylinderCount"),
  diameterNm: document.getElementById("diameterNm"),
  gapNm: document.getElementById("gapNm"),
  biasMv: document.getElementById("biasMv"),
  biasSlider: document.getElementById("biasSlider"),
  stabilityLimitV: document.getElementById("stabilityLimitV"),
  sternCapFpm2: document.getElementById("sternCapFpm2"),
  temperatureK: document.getElementById("temperatureK"),
  concentrationMm: document.getElementById("concentrationMm"),
  epsilonR: document.getElementById("epsilonR"),
  electrolytePreset: document.getElementById("electrolytePreset"),
  ionDiameterNm: document.getElementById("ionDiameterNm"),
  customSpecies: document.getElementById("customSpecies"),
  gapControl: document.getElementById("gapControl"),
  presetGapNote: document.getElementById("presetGapNote"),
  ionDiameterControl: document.getElementById("ionDiameterControl"),
  customSpeciesControl: document.getElementById("customSpeciesControl"),
  customSpeciesHelp: document.getElementById("customSpeciesHelp"),
  meshResolution: document.getElementById("meshResolution"),
  sweepPoints: document.getElementById("sweepPoints"),
  runButton: document.getElementById("runButton"),
  exportCsvButton: document.getElementById("exportCsvButton"),
};

const metrics = {
  psi: document.getElementById("metricPsi"),
  lambda: document.getElementById("metricLambda"),
  gap: document.getElementById("metricGap"),
  overlap: document.getElementById("metricOverlap"),
  enrichment: document.getElementById("metricEnrichment"),
  charge: document.getElementById("metricCharge"),
  cap: document.getElementById("metricCap"),
  error: document.getElementById("metricError"),
  access: document.getElementById("metricAccess"),
  window: document.getElementById("metricWindow"),
  stern: document.getElementById("metricStern"),
  enrichmentCard: document.getElementById("metricEnrichmentCard"),
  windowCard: document.getElementById("metricWindowCard"),
};

const outputs = {
  potential: document.getElementById("potentialCanvas"),
  qc: document.getElementById("qcPlot"),
  trajectory: document.getElementById("trajectoryPlot"),
  error: document.getElementById("errorPlot"),
  enrichment: document.getElementById("enrichmentPlot"),
  enrichmentCaption: document.getElementById("enrichmentCaption"),
  enrichmentFigure: document.getElementById("enrichmentFigure"),
  window: document.getElementById("windowPlot"),
  windowFigure: document.getElementById("windowFigure"),
  benchmark: document.getElementById("benchmarkPlot"),
  benchmarkCaption: document.getElementById("benchmarkCaption"),
};

const statusEl = document.getElementById("status");
const accessibilityNoteEl = document.getElementById("accessibilityNote");
let latestResult = null;

const ELECTROLYTE_PRESETS = {
  tfsi: {
    label: "TFSI⁻",
    species: [{ z: 1, c: 1 }, { z: -1, c: 1 }],
    targetIonZ: -1,
    targetIonName: "TFSI⁻",
    ionDiameterNm: 0.8,
    gapNm: 0.7070837,
    gapSource: "Density Functional Theory stable relaxed gap",
  },
  alcl4: {
    label: "AlCl₄⁻",
    species: [{ z: 1, c: 1 }, { z: -1, c: 1 }],
    targetIonZ: -1,
    targetIonName: "AlCl₄⁻",
    ionDiameterNm: 0.55,
    gapNm: 0.5011987,
    gapSource: "Density Functional Theory stable relaxed gap",
  },
  pf6: {
    label: "PF₆⁻",
    species: [{ z: 1, c: 1 }, { z: -1, c: 1 }],
    targetIonZ: -1,
    targetIonName: "PF₆⁻",
    ionDiameterNm: 0.6,
    gapNm: 0.5555362,
    gapSource: "Density Functional Theory stable relaxed gap",
  },
  bf4: {
    label: "BF₄⁻",
    species: [{ z: 1, c: 1 }, { z: -1, c: 1 }],
    targetIonZ: -1,
    targetIonName: "BF₄⁻",
    ionDiameterNm: 0.45,
    gapNm: 0.4274176,
    gapSource: "Density Functional Theory stable relaxed gap",
  },
  hso4: {
    label: "HSO₄⁻",
    species: [{ z: 1, c: 1 }, { z: -1, c: 1 }],
    targetIonZ: -1,
    targetIonName: "HSO₄⁻",
    ionDiameterNm: 0.45,
    gapNm: null,
    gapSource: "No HSO₄⁻ CNT-bundle Density Functional Theory gap loaded; enter h_eff manually",
  },
  so4: {
    label: "SO₄²⁻ aqueous test",
    species: [{ z: 1, c: 2 }, { z: -2, c: 1 }],
    targetIonZ: -2,
    targetIonName: "SO₄²⁻",
    ionDiameterNm: 0.48,
    gapNm: null,
    gapSource: "No CNT-bundle DFT gap loaded for this higher-valence test preset",
  },
  ferricyanide: {
    label: "Fe(CN)₆³⁻ aqueous test",
    species: [{ z: 1, c: 3 }, { z: -3, c: 1 }],
    targetIonZ: -3,
    targetIonName: "Fe(CN)₆³⁻",
    ionDiameterNm: 0.9,
    gapNm: null,
    gapSource: "No CNT-bundle DFT gap loaded for this higher-valence test preset",
  },
  ferrocyanide: {
    label: "Fe(CN)₆⁴⁻ aqueous test",
    species: [{ z: 1, c: 4 }, { z: -4, c: 1 }],
    targetIonZ: -4,
    targetIonName: "Fe(CN)₆⁴⁻",
    ionDiameterNm: 1.0,
    gapNm: null,
    gapSource: "No CNT-bundle DFT gap loaded for this higher-valence test preset",
  },
};

function setStatus(text) {
  statusEl.textContent = text;
}

function readInputs() {
  const preset = controls.electrolytePreset.value;
  let species;
  let presetInfo = ELECTROLYTE_PRESETS[preset];
  if (preset === "custom") {
    species = JSON.parse(controls.customSpecies.value);
    presetInfo = {
      label: "custom electrolyte",
      species,
      targetIonZ: Number(species.find((item) => item.z < 0)?.z ?? species[0].z),
      targetIonName: null,
      ionDiameterNm: Number(controls.ionDiameterNm.value),
      gapNm: null,
      gapSource: "Manual custom gap",
    };
  } else {
    if (!presetInfo) throw new Error(`Unknown electrolyte preset: ${preset}`);
    species = presetInfo.species.map((item) => ({ ...item }));
  }

  validateSpecies(species);
  const diameterNm = Number(controls.diameterNm.value);
  const fixedPresetGap = preset !== "custom" && Number.isFinite(presetInfo.gapNm);
  const gapNm = fixedPresetGap ? Number(presetInfo.gapNm) : Number(controls.gapNm.value);
  const temperatureK = Number(controls.temperatureK.value);
  const concentrationMm = Number(controls.concentrationMm.value);
  const epsilonR = Number(controls.epsilonR.value);
  const stabilityLimitV = Number(controls.stabilityLimitV.value);
  const sternCapFpm2 = Number(controls.sternCapFpm2.value);
  const ionDiameterNm = preset === "custom"
    ? Number(controls.ionDiameterNm.value)
    : Number(presetInfo.ionDiameterNm);
  if (!Number.isFinite(diameterNm) || diameterNm <= 0) {
    throw new Error("CNT diameter must be positive.");
  }
  if (!Number.isFinite(gapNm) || gapNm <= 0) {
    throw new Error("Accessible gap must be positive.");
  }
  if (!Number.isFinite(temperatureK) || temperatureK <= 0) {
    throw new Error("Temperature must be positive.");
  }
  if (!Number.isFinite(concentrationMm) || concentrationMm <= 0) {
    throw new Error("Bulk concentration must be positive.");
  }
  if (!Number.isFinite(epsilonR) || epsilonR <= 0) {
    throw new Error("Relative permittivity must be positive.");
  }
  if (!Number.isFinite(stabilityLimitV) || stabilityLimitV <= 0) {
    throw new Error("Stability limit must be positive.");
  }
  if (!Number.isFinite(sternCapFpm2) || sternCapFpm2 <= 0) {
    throw new Error("Stern capacitance must be positive.");
  }
  if (!Number.isFinite(ionDiameterNm) || ionDiameterNm <= 0) {
    throw new Error("Effective ion diameter must be positive.");
  }
  const debyeNm = computeDebyeLengthNm(species, concentrationMm, temperatureK, epsilonR);
  const thermalMv = thermalVoltageMv(temperatureK);
  const targetIonName = presetInfo.targetIonName || ionNameFromValence(presetInfo.targetIonZ);
  const biasV = enforceAttractiveBiasV(Number(controls.biasMv.value), presetInfo.targetIonZ);
  const biasMv = 1000 * biasV;
  controls.biasMv.value = formatInputNumber(biasV, 3);
  controls.biasSlider.value = biasV;
  const metalPsi = biasMv / thermalMv;
  const sternDelta = computeSternDelta(epsilonR, debyeNm, sternCapFpm2);
  const psiS = diffusePsiFromMetalPsi(metalPsi, sternDelta, species, "nlpb");
  const diffuseBiasV = (psiS * thermalMv) / 1000;
  const sternDropV = biasV - diffuseBiasV;
  const cylinderCount = Math.max(1, Math.min(8, Math.round(Number(controls.cylinderCount.value))));
  controls.cylinderCount.value = cylinderCount;

  return {
    cylinderCount,
    diameterNm,
    radiusStar: (0.5 * diameterNm) / debyeNm,
    gapStar: gapNm / debyeNm,
    gapNm,
    debyeNm,
    temperatureK,
    concentrationMm,
    epsilonR,
    stabilityLimitV,
    sternCapFpm2,
    sternDelta,
    thermalMv,
    presetKey: preset,
    presetLabel: presetInfo.label,
    presetGapSource: presetInfo.gapSource || "",
    fixedPresetGap,
    targetIonZ: presetInfo.targetIonZ,
    targetIonName,
    ionDiameterNm,
    biasV,
    biasMv,
    metalPsi,
    psiS,
    diffuseBiasV,
    sternDropV,
    boundaryMode: "robin",
    species,
    resolution: controls.meshResolution.value,
    sweepPoints: Math.max(7, Math.min(31, Math.round(Number(controls.sweepPoints.value)))),
  };
}

function attractiveBiasSign(targetIonZ) {
  return targetIonZ > 0 ? -1 : 1;
}

function enforceAttractiveBiasV(biasV, targetIonZ) {
  if (!Number.isFinite(biasV)) return 0;
  const magnitude = Math.abs(biasV);
  if (magnitude < 1e-12) return 0;
  return attractiveBiasSign(targetIonZ) * magnitude;
}

function ionNameFromValence(z) {
  if (!Number.isFinite(z)) return "target ion";
  if (z > 0) return `cation z = +${formatNumber(z, 0)}`;
  return `anion z = ${formatNumber(z, 0)}`;
}

function thermalVoltageMv(temperatureK) {
  return (BOLTZMANN * temperatureK / ELEMENTARY_CHARGE) * 1000;
}

function computeDebyeLengthNm(species, concentrationMm, temperatureK, epsilonR) {
  const sumZ2C = species.reduce((sum, item) => sum + item.z * item.z * item.c, 0);
  const epsilon = epsilonR * EPS0;
  // concentrationMm is numerically mol/m^3 because 1 mM = 1 mol/m^3.
  const weightedNumberDensity = AVOGADRO * concentrationMm * sumZ2C;
  const kappa2 = (ELEMENTARY_CHARGE ** 2 * weightedNumberDensity) / (epsilon * BOLTZMANN * temperatureK);
  return 1e9 / Math.sqrt(kappa2);
}

function computeSternDelta(epsilonR, debyeNm, sternCapFpm2) {
  return (epsilonR * EPS0) / (sternCapFpm2 * debyeNm * 1e-9);
}

function planarPbChargeStar(psi, species) {
  const denom = species.reduce((sum, item) => sum + item.z * item.z * item.c, 0);
  let excessOsmotic = 0;
  for (const item of species) {
    const exponent = Math.max(-70, Math.min(70, -item.z * psi));
    excessOsmotic += item.c * (Math.exp(exponent) - 1);
  }
  const magnitude = Math.sqrt(Math.max(0, (2 * excessOsmotic) / denom));
  return Math.sign(psi) * magnitude;
}

function diffusePsiFromMetalPsi(metalPsi, sternDelta, species, mode = "nlpb") {
  if (!Number.isFinite(metalPsi) || Math.abs(metalPsi) < 1e-12) return 0;
  if (!Number.isFinite(sternDelta) || sternDelta <= 1e-12) return metalPsi;
  if (mode === "dh") return metalPsi / (1 + sternDelta);

  const sign = Math.sign(metalPsi);
  const target = Math.abs(metalPsi);
  let lo = 0;
  let hi = target;
  for (let iter = 0; iter < 70; iter += 1) {
    const mid = 0.5 * (lo + hi);
    const q = Math.abs(planarPbChargeStar(sign * mid, species));
    const impliedMetal = mid + sternDelta * q;
    if (impliedMetal > target) hi = mid;
    else lo = mid;
  }
  return sign * 0.5 * (lo + hi);
}

function validateSpecies(species) {
  if (!Array.isArray(species) || species.length < 2) {
    throw new Error("Species must be an array with at least two ions.");
  }
  for (const item of species) {
    if (!Number.isFinite(item.z) || !Number.isFinite(item.c) || item.c <= 0 || item.z === 0) {
      throw new Error("Each species must have nonzero z and positive c.");
    }
  }
  const neutrality = species.reduce((sum, item) => sum + item.z * item.c, 0);
  if (Math.abs(neutrality) > 1e-8) {
    throw new Error(`Bulk electroneutrality failed: sum z_i c_i = ${neutrality.toPrecision(4)}`);
  }
}

function sourceG(psi, species) {
  const denom = species.reduce((sum, item) => sum + item.z * item.z * item.c, 0);
  let numerator = 0;
  for (const item of species) {
    const exponent = Math.max(-70, Math.min(70, -item.z * psi));
    numerator += item.z * item.c * Math.exp(exponent);
  }
  return numerator / denom;
}

function dhG(psi) {
  return -psi;
}

function meshSpecFor(resolution, cylinderCount) {
  const base = {
    coarse: { nx: 58, ny: 46 },
    medium: { nx: 74, ny: 58 },
    fine: { nx: 94, ny: 72 },
  }[resolution] || { nx: 74, ny: 58 };
  const extra = Math.max(0, cylinderCount - 2);
  return {
    nx: base.nx + extra * 5,
    ny: base.ny + extra * 4,
  };
}

function createMesh(params) {
  const { radiusStar: a, gapStar: h, cylinderCount } = params;
  const useRobinBoundary = params.boundaryMode === "robin";
  const spacing = 2 * a + h;
  const centers = packedCylinderCenters(cylinderCount, spacing);

  const meshSpec = meshSpecFor(params.resolution, cylinderCount);
  const pad = Math.max(5, 4 * Math.max(1, a), 2.4 * h);
  const xs = centers.map((center) => center.x);
  const ys = centers.map((center) => center.y);
  const minX = Math.min(...xs) - a - pad;
  const maxX = Math.max(...xs) + a + pad;
  const minY = Math.min(...ys) - a - pad;
  const maxY = Math.max(...ys) + a + pad;
  const dx = (maxX - minX) / (meshSpec.nx - 1);
  const dy = (maxY - minY) / (meshSpec.ny - 1);

  const nodes = [];
  for (let j = 0; j < meshSpec.ny; j += 1) {
    for (let i = 0; i < meshSpec.nx; i += 1) {
      const x = minX + i * dx;
      const y = minY + j * dy;
      const cylinderIndex = insideCylinderIndex(x, y, centers, a);
      const outer = i === 0 || j === 0 || i === meshSpec.nx - 1 || j === meshSpec.ny - 1;
      const cylinderDirichlet = cylinderIndex >= 0 && !useRobinBoundary;
      nodes.push({
        x,
        y,
        i,
        j,
        cylinderIndex,
        dirichlet: outer || cylinderDirichlet,
        value: cylinderIndex >= 0 ? params.psiS : 0,
        unknown: -1,
        used: false,
      });
    }
  }

  const triangles = [];
  const index = (i, j) => j * meshSpec.nx + i;
  for (let j = 0; j < meshSpec.ny - 1; j += 1) {
    for (let i = 0; i < meshSpec.nx - 1; i += 1) {
      const n00 = index(i, j);
      const n10 = index(i + 1, j);
      const n01 = index(i, j + 1);
      const n11 = index(i + 1, j + 1);
      addTriangleIfFluid(triangles, nodes, [n00, n10, n11], centers, a, useRobinBoundary);
      addTriangleIfFluid(triangles, nodes, [n00, n11, n01], centers, a, useRobinBoundary);
    }
  }

  for (const tri of triangles) {
    for (const id of tri) nodes[id].used = true;
  }

  let unknownCount = 0;
  for (const node of nodes) {
    if (node.used && !node.dirichlet) {
      node.unknown = unknownCount;
      unknownCount += 1;
    }
  }

  const mesh = {
    nodes,
    triangles,
    centers,
    a,
    h,
    spacing,
    minX,
    maxX,
    minY,
    maxY,
    dx,
    dy,
    nx: meshSpec.nx,
    ny: meshSpec.ny,
    unknownCount,
    robinBoundary: [],
  };
  if (useRobinBoundary) {
    mesh.robinBoundary = buildRobinBoundary(mesh);
  }
  return mesh;
}

function packedCylinderCenters(count, spacing) {
  const root3 = Math.sqrt(3);
  const layouts = {
    1: [[0, 0]],
    2: [[-0.5, 0], [0.5, 0]],
    3: [[-0.5, -root3 / 6], [0.5, -root3 / 6], [0, root3 / 3]],
    4: [[-0.5, 0], [0.5, 0], [0, root3 / 2], [0, -root3 / 2]],
    5: [[-1, 0], [0, 0], [1, 0], [-0.5, root3 / 2], [0.5, root3 / 2]],
    6: [[-1, 0], [0, 0], [1, 0], [-0.5, root3 / 2], [0.5, root3 / 2], [0, -root3 / 2]],
    7: [[0, 0], [1, 0], [0.5, root3 / 2], [-0.5, root3 / 2], [-1, 0], [-0.5, -root3 / 2], [0.5, -root3 / 2]],
    8: [[0, 0], [1, 0], [0.5, root3 / 2], [-0.5, root3 / 2], [-1, 0], [-0.5, -root3 / 2], [0.5, -root3 / 2], [1.5, root3 / 2]],
  };
  const layout = layouts[Math.max(1, Math.min(8, count))];
  const centroid = layout.reduce((sum, point) => ({
    x: sum.x + point[0],
    y: sum.y + point[1],
  }), { x: 0, y: 0 });
  centroid.x /= layout.length;
  centroid.y /= layout.length;
  return layout.map(([x, y]) => ({
    x: (x - centroid.x) * spacing,
    y: (y - centroid.y) * spacing,
  }));
}

function insideCylinderIndex(x, y, centers, radius) {
  for (let k = 0; k < centers.length; k += 1) {
    const c = centers[k];
    const r2 = (x - c.x) ** 2 + (y - c.y) ** 2;
    if (r2 <= radius * radius) return k;
  }
  return -1;
}

function addTriangleIfFluid(triangles, nodes, ids, centers, radius, excludeCylinderNodes = false) {
  if (excludeCylinderNodes && ids.some((id) => nodes[id].cylinderIndex >= 0)) return;
  const cx = (nodes[ids[0]].x + nodes[ids[1]].x + nodes[ids[2]].x) / 3;
  const cy = (nodes[ids[0]].y + nodes[ids[1]].y + nodes[ids[2]].y) / 3;
  if (insideCylinderIndex(cx, cy, centers, radius * 0.96) >= 0) return;
  triangles.push(ids);
}

function buildRobinBoundary(mesh) {
  const weights = new Map();
  const step = Math.max(0.08, Math.min(mesh.dx, mesh.dy));
  for (const center of mesh.centers) {
    const samples = Math.max(72, Math.ceil((2 * Math.PI * mesh.a) / step));
    const ds = (2 * Math.PI * mesh.a) / samples;
    for (let k = 0; k < samples; k += 1) {
      const theta = (k + 0.5) * (2 * Math.PI / samples);
      const sx = center.x + mesh.a * Math.cos(theta);
      const sy = center.y + mesh.a * Math.sin(theta);
      const node = nearestUnknownNode(mesh, sx, sy);
      if (node) {
        weights.set(node.unknown, (weights.get(node.unknown) || 0) + ds);
      }
    }
  }
  return Array.from(weights.entries()).map(([unknown, weight]) => ({ unknown, weight }));
}

function nearestUnknownNode(mesh, x, y) {
  let best = null;
  let bestDistance = Infinity;
  for (const node of mesh.nodes) {
    if (node.unknown < 0) continue;
    const distance = (node.x - x) ** 2 + (node.y - y) ** 2;
    if (distance < bestDistance) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

function triangleElement(nodes, ids) {
  const p = ids.map((id) => nodes[id]);
  const x1 = p[0].x, y1 = p[0].y;
  const x2 = p[1].x, y2 = p[1].y;
  const x3 = p[2].x, y3 = p[2].y;
  const area = 0.5 * Math.abs((x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1));
  const b = [y2 - y3, y3 - y1, y1 - y2];
  const c = [x3 - x2, x1 - x3, x2 - x1];
  const k = Array.from({ length: 3 }, () => [0, 0, 0]);
  for (let i = 0; i < 3; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      k[i][j] = (b[i] * b[j] + c[i] * c[j]) / (4 * area);
    }
  }
  return { area, k };
}

function assembleSystem(mesh, params) {
  const rows = Array.from({ length: mesh.unknownCount }, () => new Map());
  const boundary = new Float64Array(mesh.unknownCount);
  const elements = [];

  for (const ids of mesh.triangles) {
    const elem = triangleElement(mesh.nodes, ids);
    if (!Number.isFinite(elem.area) || elem.area <= 0) continue;
    elements.push({ ids, area: elem.area });
    for (let a = 0; a < 3; a += 1) {
      const rowNode = mesh.nodes[ids[a]];
      if (rowNode.unknown < 0) continue;
      const row = rowNode.unknown;
      for (let b = 0; b < 3; b += 1) {
        const colNode = mesh.nodes[ids[b]];
        const val = elem.k[a][b];
        if (colNode.unknown >= 0) {
          const map = rows[row];
          map.set(colNode.unknown, (map.get(colNode.unknown) || 0) + val);
        } else if (colNode.dirichlet) {
          boundary[row] += val * colNode.value;
        }
      }
    }
  }

  if (params.boundaryMode === "robin" && params.sternDelta > 1e-12) {
    const robinCoeff = 1 / params.sternDelta;
    for (const item of mesh.robinBoundary) {
      const row = item.unknown;
      const map = rows[row];
      map.set(row, (map.get(row) || 0) + item.weight * robinCoeff);
      boundary[row] -= item.weight * robinCoeff * params.metalPsi;
    }
  }

  return { rows, boundary, elements };
}

function computeRhs(mesh, system, uFull, sourceFn) {
  const rhs = new Float64Array(mesh.unknownCount);
  for (const elem of system.elements) {
    const psiCentroid = (uFull[elem.ids[0]] + uFull[elem.ids[1]] + uFull[elem.ids[2]]) / 3;
    const g = sourceFn(psiCentroid);
    const contribution = (elem.area / 3) * g;
    for (const id of elem.ids) {
      const unk = mesh.nodes[id].unknown;
      if (unk >= 0) rhs[unk] += contribution;
    }
  }
  for (let i = 0; i < rhs.length; i += 1) {
    rhs[i] -= system.boundary[i];
  }
  return rhs;
}

function rowsToCsr(rows) {
  const n = rows.length;
  const rowPtr = new Int32Array(n + 1);
  let nnz = 0;
  for (let i = 0; i < n; i += 1) {
    nnz += rows[i].size;
    rowPtr[i + 1] = nnz;
  }
  const colIdx = new Int32Array(nnz);
  const values = new Float64Array(nnz);
  const diag = new Float64Array(n);
  let cursor = 0;
  for (let i = 0; i < n; i += 1) {
    const entries = Array.from(rows[i].entries()).sort((a, b) => a[0] - b[0]);
    for (const [col, val] of entries) {
      colIdx[cursor] = col;
      values[cursor] = val;
      if (col === i) diag[i] = val;
      cursor += 1;
    }
  }
  return { n, rowPtr, colIdx, values, diag };
}

function matVec(csr, x, out) {
  out.fill(0);
  for (let i = 0; i < csr.n; i += 1) {
    let sum = 0;
    for (let k = csr.rowPtr[i]; k < csr.rowPtr[i + 1]; k += 1) {
      sum += csr.values[k] * x[csr.colIdx[k]];
    }
    out[i] = sum;
  }
}

function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += a[i] * b[i];
  return sum;
}

function cgSolve(csr, b, x0, tolerance = 1e-7, maxIterations = 700) {
  const n = csr.n;
  const x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  const r = new Float64Array(n);
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const ap = new Float64Array(n);
  matVec(csr, x, ap);
  let normB = Math.sqrt(dot(b, b));
  if (normB < 1e-16) normB = 1;
  for (let i = 0; i < n; i += 1) {
    r[i] = b[i] - ap[i];
    z[i] = r[i] / Math.max(csr.diag[i], 1e-12);
    p[i] = z[i];
  }
  let rzOld = dot(r, z);
  let rel = Math.sqrt(dot(r, r)) / normB;
  let iteration = 0;
  for (; iteration < maxIterations && rel > tolerance; iteration += 1) {
    matVec(csr, p, ap);
    const denom = Math.max(dot(p, ap), 1e-30);
    const alpha = rzOld / denom;
    for (let i = 0; i < n; i += 1) {
      x[i] += alpha * p[i];
      r[i] -= alpha * ap[i];
    }
    rel = Math.sqrt(dot(r, r)) / normB;
    if (rel <= tolerance) break;
    for (let i = 0; i < n; i += 1) {
      z[i] = r[i] / Math.max(csr.diag[i], 1e-12);
    }
    const rzNew = dot(r, z);
    const beta = rzNew / Math.max(rzOld, 1e-30);
    for (let i = 0; i < n; i += 1) {
      p[i] = z[i] + beta * p[i];
    }
    rzOld = rzNew;
  }
  return { x, rel, iteration };
}

function makeFullPotential(mesh, unknownVector, psiS) {
  const full = new Float64Array(mesh.nodes.length);
  for (let i = 0; i < mesh.nodes.length; i += 1) {
    const node = mesh.nodes[i];
    if (node.unknown >= 0) full[i] = unknownVector[node.unknown];
    else if (node.cylinderIndex >= 0) full[i] = psiS;
    else full[i] = 0;
  }
  return full;
}

function potentialForUnknown(mesh, potential, unknown) {
  const node = mesh.nodes.find((candidate) => candidate.unknown === unknown);
  return node ? potential[node.j * mesh.nx + node.i] : NaN;
}

function solvePotential(params, mode = "nlpb", initialGuess = null) {
  const mesh = createMesh(params);
  const system = assembleSystem(mesh, params);
  const csr = rowsToCsr(system.rows);
  const sourceFn = mode === "dh"
    ? dhG
    : (psi) => sourceG(psi, params.species);

  let unknown = new Float64Array(mesh.unknownCount);
  if (initialGuess && initialGuess.length === unknown.length) {
    unknown.set(initialGuess);
  } else {
    for (let i = 0; i < mesh.nodes.length; i += 1) {
      const node = mesh.nodes[i];
      if (node.unknown >= 0) {
        const nearest = nearestCylinderDistance(node.x, node.y, mesh.centers, mesh.a);
        const decay = Math.exp(-Math.max(0, nearest));
        unknown[node.unknown] = params.psiS * decay;
      }
    }
  }

  const maxPicard = mode === "dh" ? 18 : 70;
  const damping = mode === "dh" ? 0.82 : 0.54;
  let full = makeFullPotential(mesh, unknown, params.psiS);
  let relChange = Infinity;
  let cgInfo = { rel: Infinity, iteration: 0 };

  for (let iter = 0; iter < maxPicard; iter += 1) {
    const rhs = computeRhs(mesh, system, full, sourceFn);
    const solved = cgSolve(csr, rhs, unknown, 2e-7, 900);
    cgInfo = solved;
    relChange = 0;
    let norm = 0;
    const clampMagnitude = params.boundaryMode === "robin"
      ? Math.min(Math.abs(params.metalPsi), Math.max(Math.abs(params.psiS) * 2, Math.abs(params.psiS) + 1))
      : Math.abs(params.psiS);
    const clampPsi = Math.sign(params.psiS || params.metalPsi || 1) * clampMagnitude;
    const lowerBound = Math.min(0, clampPsi);
    const upperBound = Math.max(0, clampPsi);
    for (let i = 0; i < unknown.length; i += 1) {
      let next = damping * solved.x[i] + (1 - damping) * unknown[i];
      next = Math.max(lowerBound, Math.min(upperBound, next));
      relChange += (next - unknown[i]) ** 2;
      norm += next ** 2;
      unknown[i] = next;
    }
    relChange = Math.sqrt(relChange) / Math.max(1e-10, Math.sqrt(norm));
    full = makeFullPotential(mesh, unknown, params.psiS);
    if (relChange < (mode === "dh" ? 2e-5 : 4e-5)) break;
  }

  const chargeInfo = computeChargeStar(mesh, full, params);
  const midPsi = sampleMidGap(mesh, full);
  const avgSurfacePsi = Number.isFinite(chargeInfo.avgSurfacePsi)
    ? chargeInfo.avgSurfacePsi
    : params.psiS;
  return {
    mode,
    mesh,
    potential: full,
    unknown,
    chargeStar: chargeInfo.chargeStar,
    avgSurfacePsi,
    midPsi,
    overlap: Math.abs(avgSurfacePsi) > 1e-9 ? Math.abs(midPsi / avgSurfacePsi) : 0,
    relChange,
    cgInfo,
  };
}

function nearestCylinderDistance(x, y, centers, radius) {
  let min = Infinity;
  for (const c of centers) {
    const distance = Math.sqrt((x - c.x) ** 2 + (y - c.y) ** 2) - radius;
    if (distance < min) min = distance;
  }
  return min;
}

function interpolatePotential(mesh, potential, x, y) {
  const fx = (x - mesh.minX) / mesh.dx;
  const fy = (y - mesh.minY) / mesh.dy;
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  if (i < 0 || j < 0 || i >= mesh.nx - 1 || j >= mesh.ny - 1) return 0;
  const tx = fx - i;
  const ty = fy - j;
  const idx = (ii, jj) => jj * mesh.nx + ii;
  const v00 = potential[idx(i, j)];
  const v10 = potential[idx(i + 1, j)];
  const v01 = potential[idx(i, j + 1)];
  const v11 = potential[idx(i + 1, j + 1)];
  return (
    v00 * (1 - tx) * (1 - ty) +
    v10 * tx * (1 - ty) +
    v01 * (1 - tx) * ty +
    v11 * tx * ty
  );
}

function computeChargeStar(mesh, potential, params) {
  if (params.boundaryMode === "robin" && params.sternDelta > 1e-12 && mesh.robinBoundary.length) {
    let q = 0;
    let weightedPsi = 0;
    let totalWeight = 0;
    for (const item of mesh.robinBoundary) {
      const psiSurface = potentialForUnknown(mesh, potential, item.unknown);
      if (!Number.isFinite(psiSurface)) continue;
      q += ((params.metalPsi - psiSurface) / params.sternDelta) * item.weight;
      weightedPsi += psiSurface * item.weight;
      totalWeight += item.weight;
    }
    return {
      chargeStar: q,
      avgSurfacePsi: totalWeight > 0 ? weightedPsi / totalWeight : params.psiS,
    };
  }

  const psiS = params.psiS;
  const samples = 144;
  let q = 0;
  const dsTheta = (2 * Math.PI) / samples;
  const baseStep = Math.max(0.015, Math.min(mesh.dx, mesh.dy) * 0.8);
  const gapStep = Math.max(0.012, mesh.h * 0.22);
  const dr = Math.min(baseStep, gapStep);

  for (const center of mesh.centers) {
    for (let k = 0; k < samples; k += 1) {
      const theta = (k + 0.5) * dsTheta;
      const nx = Math.cos(theta);
      const ny = Math.sin(theta);
      const x = center.x + (mesh.a + dr) * nx;
      const y = center.y + (mesh.a + dr) * ny;
      if (insideCylinderIndex(x, y, mesh.centers, mesh.a * 0.999) >= 0) continue;
      const psiOut = interpolatePotential(mesh, potential, x, y);
      const derivative = (psiOut - psiS) / dr;
      q += -derivative * mesh.a * dsTheta;
    }
  }
  return { chargeStar: q, avgSurfacePsi: psiS };
}

function sampleMidGap(mesh, potential) {
  if (mesh.centers.length < 2) return 0;
  const c0 = mesh.centers[0];
  const c1 = mesh.centers[1];
  const x = 0.5 * (c0.x + c1.x);
  return interpolatePotential(mesh, potential, x, 0);
}

function enrichmentForPsi(psi, z) {
  return Math.exp(Math.max(-70, Math.min(70, -z * psi)));
}

function cloneParamsWithMetalBias(params, metalBiasV, mode = "nlpb") {
  const biasV = enforceAttractiveBiasV(metalBiasV, params.targetIonZ);
  const metalPsi = (1000 * biasV) / params.thermalMv;
  const psiS = diffusePsiFromMetalPsi(metalPsi, params.sternDelta, params.species, mode);
  const diffuseBiasV = (psiS * params.thermalMv) / 1000;
  return {
    ...params,
    biasV,
    biasMv: 1000 * biasV,
    metalPsi,
    psiS,
    diffuseBiasV,
    sternDropV: biasV - diffuseBiasV,
  };
}

function paramsWithSolvedSurface(params, solution) {
  const psiS = Number.isFinite(solution.avgSurfacePsi) ? solution.avgSurfacePsi : params.psiS;
  const diffuseBiasV = (psiS * params.thermalMv) / 1000;
  return {
    ...params,
    psiS,
    diffuseBiasV,
    sternDropV: params.biasV - diffuseBiasV,
  };
}

function linspace(start, end, count) {
  if (count <= 1) return [start];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(start + (end - start) * (i / (count - 1)));
  }
  return out;
}

async function runModel() {
  controls.runButton.disabled = true;
  controls.exportCsvButton.disabled = true;
  setStatus("Reading inputs");
  await frame();

  try {
    const params = readInputs();
    const sweepSpanV = Math.max(0.05, params.stabilityLimitV);
    if (attractiveBiasSign(params.targetIonZ) > 0) {
      controls.biasSlider.min = 0;
      controls.biasSlider.max = sweepSpanV;
    } else {
      controls.biasSlider.min = -sweepSpanV;
      controls.biasSlider.max = 0;
    }
    controls.biasSlider.value = params.biasV;
    setStatus("Solving current bias");
    await frame();

    const solveParams = cloneParamsWithMetalBias(params, params.biasV, "nlpb");
    const dhParams = cloneParamsWithMetalBias(params, params.biasV, "dh");
    const nlpb = solvePotential(solveParams, "nlpb");
    const dh = solvePotential(dhParams, "dh");
    const zTarget = params.targetIonZ;
    const solvedParams = paramsWithSolvedSurface(solveParams, nlpb);
    const currentMetrics = deriveMetrics(solvedParams, nlpb, dh, zTarget);

    setStatus("Running bias sweep");
    await frame();
    const sweep = await runSweep(params, zTarget);
    const windowSweep = runWindowSweep(params);

    latestResult = { params: solvedParams, requestedParams: params, dhParams, nlpb, dh, metrics: currentMetrics, sweep, windowSweep, zTarget };
    updateAccessibilityNote(solvedParams);
    updateMetricCards(latestResult);
    drawAll(latestResult);
    setStatus(`Done: ${nlpb.mesh.unknownCount} FEM nodes; Stern Robin boundary active`);
  } catch (error) {
    console.error(error);
    setStatus(error.message || String(error));
  } finally {
    controls.runButton.disabled = false;
    controls.exportCsvButton.disabled = false;
  }
}

function deriveMetrics(params, nlpb, dh, zTarget, capacitanceStar = NaN) {
  const enrichment = enrichmentForPsi(nlpb.midPsi, zTarget);
  const error = Math.abs(nlpb.chargeStar - dh.chargeStar) / Math.max(1e-9, Math.abs(nlpb.chargeStar));
  const access = accessibilityRatio(params);
  const windowScore = dopingWindowScore(enrichment, params.biasV, params);
  return {
    psiS: params.psiS,
    sternDropV: params.sternDropV,
    hStar: params.gapStar,
    overlap: nlpb.overlap,
    enrichment,
    chargeStar: nlpb.chargeStar,
    capacitanceStar,
    error,
    access,
    windowScore,
  };
}

function accessibilityRatio(params) {
  return params.gapNm / Math.max(params.ionDiameterNm, 1e-12);
}

function accessibilityLabel(params) {
  const ratio = accessibilityRatio(params);
  if (ratio < 1) return "excluded";
  if (ratio < 1.5) return "tight";
  if (ratio < 3) return "accessible";
  return "open";
}

function updateAccessibilityNote(params) {
  if (params.cylinderCount === 1) {
    accessibilityNoteEl.textContent =
      "Single-cylinder benchmark mode: h_eff is not used because there is no CNT-CNT interstitial gap. " +
      "Use this mode to compare FEM-DH against the analytic cylindrical Debye-Huckel reference.";
    return;
  }
  const ratio = accessibilityRatio(params);
  accessibilityNoteEl.textContent =
    `${params.presetLabel}: ` +
    `d_ion,eff ≈ ${formatNumber(params.ionDiameterNm, 2)} nm. ` +
    `h_eff / d_ion,eff = ${formatNumber(ratio, 2)} (${accessibilityLabel(params)}). ` +
    "The PB source uses valence/stoichiometry; ion identity enters through accessibility and geometry.";
}

function dopingWindowScore(_enrichment, biasV, params) {
  const v = Math.abs(biasV);
  const access = Math.max(0.35, Math.min(3.5, accessibilityRatio(params)));
  const driveScale = 0.08 + 0.06 / access;
  const drive = 1 - Math.exp(-((v / driveScale) ** 2));
  const crowdingOnset = 0.45 + 0.22 * access;
  const crowdingPenalty = 1 / (1 + (v / crowdingOnset) ** 3);
  const stabilityWidth = Math.max(0.04, 0.04 * params.stabilityLimitV);
  const stabilityPenalty = 1 / (1 + Math.exp((v - params.stabilityLimitV) / stabilityWidth));
  return Math.max(0, Math.min(1, drive * crowdingPenalty * stabilityPenalty));
}

function crowdingEnrichmentLimit(params) {
  const ratio = accessibilityRatio(params);
  return Math.max(2, 2.5 + 2.5 * Math.min(ratio, 3));
}

async function runSweep(params, zTarget) {
  const sign = attractiveBiasSign(params.targetIonZ);
  const biasValues = linspace(0, params.stabilityLimitV, params.sweepPoints).map((v) => sign * v);
  const rows = [];
  for (let i = 0; i < biasValues.length; i += 1) {
    const p = cloneParamsWithMetalBias(params, biasValues[i], "nlpb");
    const dhParams = cloneParamsWithMetalBias(params, biasValues[i], "dh");
    const nlpb = solvePotential(p, "nlpb");
    const dh = solvePotential(dhParams, "dh");
    const solvedP = paramsWithSolvedSurface(p, nlpb);
    const enrichment = enrichmentForPsi(nlpb.midPsi, zTarget);
    const error = Math.abs(nlpb.chargeStar - dh.chargeStar) / Math.max(1e-9, Math.abs(nlpb.chargeStar));
    rows.push({
      psiS: solvedP.psiS,
      psiAbs: Math.abs(solvedP.psiS),
      metalPsi: p.metalPsi,
      metalPsiAbs: Math.abs(p.metalPsi),
      biasMv: p.biasMv,
      biasV: p.biasV,
      biasAbsV: Math.abs(p.biasV),
      diffuseBiasV: solvedP.diffuseBiasV,
      sternDropV: solvedP.sternDropV,
      qStar: nlpb.chargeStar,
      qDhStar: dh.chargeStar,
      cStar: NaN,
      midPsi: nlpb.midPsi,
      overlap: nlpb.overlap,
      enrichment,
      dhError: error,
      windowScore: dopingWindowScore(enrichment, p.biasV, params),
    });
    if (i % 3 === 2) {
      setStatus(`Sweep ${i + 1}/${biasValues.length}`);
      await frame();
    }
  }
  computeSweepCapacitance(rows);
  return rows;
}

function runWindowSweep(params) {
  const sign = attractiveBiasSign(params.targetIonZ);
  return linspace(0, params.stabilityLimitV, params.sweepPoints).map((biasAbsV) => {
    const biasV = sign * biasAbsV;
    const p = cloneParamsWithMetalBias(params, biasV, "nlpb");
    return {
      psiS: p.psiS,
      psiAbs: Math.abs(p.psiS),
      metalPsi: p.metalPsi,
      metalPsiAbs: Math.abs(p.metalPsi),
      biasV,
      biasAbsV,
      diffuseBiasV: p.diffuseBiasV,
      sternDropV: p.sternDropV,
      windowScore: dopingWindowScore(NaN, biasV, params),
    };
  });
}

function computeSweepCapacitance(rows) {
  for (let i = 0; i < rows.length; i += 1) {
    if (rows.length === 1) {
      rows[i].cStar = NaN;
    } else if (i === 0) {
      rows[i].cStar = (rows[i + 1].qStar - rows[i].qStar) / (rows[i + 1].metalPsi - rows[i].metalPsi);
    } else if (i === rows.length - 1) {
      rows[i].cStar = (rows[i].qStar - rows[i - 1].qStar) / (rows[i].metalPsi - rows[i - 1].metalPsi);
    } else {
      rows[i].cStar = (rows[i + 1].qStar - rows[i - 1].qStar) / (rows[i + 1].metalPsi - rows[i - 1].metalPsi);
    }
  }
}

function updateMetricCards(result) {
  const nearest = nearestSweepRowByKey(result.sweep, Math.abs(result.params.biasV), "biasAbsV");
  result.metrics.capacitanceStar = nearest?.cStar ?? NaN;
  metrics.psi.textContent = formatNumber(result.metrics.psiS, 3);
  metrics.stern.textContent = formatNumber(result.metrics.sternDropV, 3);
  metrics.lambda.textContent = formatNumber(result.params.debyeNm, 3);
  metrics.gap.textContent = formatNumber(result.metrics.hStar, 3);
  metrics.overlap.textContent = formatNumber(result.metrics.overlap, 3);
  metrics.enrichment.textContent = formatNumber(result.metrics.enrichment, 2) + "x";
  metrics.charge.textContent = formatNumber(result.metrics.chargeStar, 3);
  metrics.cap.textContent = Number.isFinite(result.metrics.capacitanceStar)
    ? formatNumber(result.metrics.capacitanceStar, 3)
    : "--";
  metrics.error.textContent = `${formatNumber(100 * result.metrics.error, 1)}%`;
  metrics.access.textContent = accessibilityLabel(result.params);
  updateWindowMetricFromBias(result, Math.abs(result.params.biasV));
}

function updateMetricCardsFromSweep(result, metalBiasV) {
  const row = interpolateSweepRowByKey(result.sweep, Math.abs(metalBiasV), "biasAbsV");
  if (!row) return;
  metrics.psi.textContent = formatNumber(row.psiS, 3);
  metrics.stern.textContent = formatNumber(row.sternDropV, 3);
  metrics.lambda.textContent = formatNumber(result.params.debyeNm, 3);
  metrics.gap.textContent = formatNumber(result.params.gapStar, 3);
  metrics.overlap.textContent = formatNumber(row.overlap, 3);
  metrics.enrichment.textContent = formatNumber(row.enrichment, 2) + "x";
  metrics.charge.textContent = formatNumber(row.qStar, 3);
  metrics.cap.textContent = Number.isFinite(row.cStar) ? formatNumber(row.cStar, 3) : "--";
  metrics.error.textContent = `${formatNumber(100 * row.dhError, 1)}%`;
  metrics.access.textContent = accessibilityLabel(result.params);
  updateWindowMetricFromBias(result, Math.abs(metalBiasV));
  return true;
}

function updateWindowMetricFromBias(result, biasAbsV) {
  const row = interpolateSweepRowByKey(result.windowSweep || result.sweep, biasAbsV, "biasAbsV");
  metrics.window.textContent = formatNumber(row?.windowScore, 2);
}

function nearestSweepRowByKey(rows, value, keyName) {
  let best = null;
  let bestDistance = Infinity;
  for (const row of rows) {
    const distance = Math.abs(row[keyName] - value);
    if (distance < bestDistance) {
      best = row;
      bestDistance = distance;
    }
  }
  return best;
}

function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  if (abs > 999 || (abs > 0 && abs < 0.01)) return value.toExponential(2);
  return value.toFixed(digits);
}

function formatTick(value) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  const abs = Math.abs(value);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function drawAll(result) {
  const currentBiasAbsV = Math.abs(Number(controls.biasMv.value));
  const oneCylinder = result.params.cylinderCount === 1;
  updateOneCylinderVisibility(oneCylinder);
  drawPotential(outputs.potential, result);
  drawSvgLinePlot(outputs.qc, {
    rows: result.sweep,
    xKey: "biasAbsV",
    series: [
      { key: "qStar", label: "q′*", color: "#064f9e", axis: "left" },
      { key: "cStar", label: "c′*", color: "#19724a", axis: "right" },
    ],
    xLabel: "|ψₘ| (V)",
    yLabel: "q′*",
    rightYLabel: "c′*",
    xLabelParts: mathVoltageMagnitudeParts(),
    currentX: currentBiasAbsV,
    xMinZero: true,
    xFixedRange: [0, result.params.stabilityLimitV],
    yMinZero: true,
    rightYMinZero: true,
  });
  drawSvgTrajectory(outputs.trajectory, result.sweep, currentBiasAbsV);
  drawSvgLinePlot(outputs.error, {
    rows: result.sweep,
    xKey: "biasAbsV",
    series: [{ key: "dhError", label: "DH error", color: "#a11c1c", axis: "left" }],
    xLabel: "|ψₘ| (V)",
    yLabel: "ε_q*",
    xLabelParts: mathVoltageMagnitudeParts(),
    yLabelParts: mathEpsilonQParts(),
    currentX: currentBiasAbsV,
    xMinZero: true,
    xFixedRange: [0, result.params.stabilityLimitV],
    yMinZero: true,
    showLegend: false,
  });
  if (!oneCylinder) {
    outputs.enrichmentCaption.innerHTML =
      `${escapeHtml(result.params.targetIonName)} enrichment, ` +
      `<span class="latex">n<sub>mid</sub>/n<sub>&infin;</sub></span> (1 = bulk) vs ` +
      `<span class="latex">|&psi;<sub>m</sub>|</span>`;
    drawSvgLinePlot(outputs.enrichment, {
      rows: result.sweep,
      xKey: "biasAbsV",
      series: [{
        key: "enrichment",
        label: `${result.params.targetIonName} enrichment`,
        color: "#bd6b0d",
        axis: "left",
      }],
      xLabel: "|ψₘ| (V)",
      yLabel: "n_mid / n_∞",
      xLabelParts: mathVoltageMagnitudeParts(),
      yLabelParts: mathNMidNInfParts(),
      currentX: currentBiasAbsV,
      xMinZero: true,
      xFixedRange: [0, result.params.stabilityLimitV],
      yScale: "log10",
      yFixedRange: [1, maxPositivePlotValue(result.sweep, "enrichment")],
      referenceY: 1,
      referenceLabel: "bulk",
      showLegend: false,
    });
    drawSvgLinePlot(outputs.window, {
      rows: result.windowSweep || result.sweep,
      xKey: "biasAbsV",
      series: [{ key: "windowScore", label: "window score", color: "#19724a", axis: "left" }],
      xLabel: "|ψₘ| (V)",
      yLabel: "S_w*",
      xLabelParts: mathVoltageMagnitudeParts(),
      yLabelParts: mathWindowScoreParts(),
      currentX: currentBiasAbsV,
      xMinZero: true,
      xFixedRange: [0, result.params.stabilityLimitV],
      yFixedRange: [0, 1],
      preferredYTickStep: 0.25,
      showLegend: false,
    });
  }
  drawSingleCylinderBenchmark(outputs.benchmark, result);
}

function updateOneCylinderVisibility(oneCylinder) {
  metrics.enrichmentCard?.classList.toggle("hidden", oneCylinder);
  metrics.windowCard?.classList.toggle("hidden", oneCylinder);
  outputs.enrichmentFigure?.classList.toggle("hidden", oneCylinder);
  outputs.windowFigure?.classList.toggle("hidden", oneCylinder);
}

function drawSingleCylinderBenchmark(svg, result) {
  if (!svg) return;
  if (result.params.cylinderCount !== 1 || result.dh.mesh.centers.length !== 1) {
    const { plot } = clearSvg(svg);
    if (outputs.benchmarkCaption) {
      outputs.benchmarkCaption.textContent =
        "set CNT cylinders = 1 to compare FEM-DH charge with analytic cylindrical DH";
    }
    svg.appendChild(svgText("Set CNT cylinders = 1", plot.x + 82, plot.y + 112, {
      class: "axis-label",
      "font-size": 16,
    }));
    svg.appendChild(svgText("The benchmark is only defined for an isolated cylinder.", plot.x + 28, plot.y + 142, {
      "font-size": 12,
    }));
    return;
  }

  const benchmark = singleCylinderDhChargeBenchmark(result);
  if (!benchmark || !benchmark.rows.length) {
    const { plot } = clearSvg(svg);
    if (outputs.benchmarkCaption) {
      outputs.benchmarkCaption.textContent = "benchmark unavailable for this parameter set";
    }
    svg.appendChild(svgText("Benchmark unavailable", plot.x + 84, plot.y + 128, {
      class: "axis-label",
      "font-size": 16,
    }));
    return;
  }

  if (outputs.benchmarkCaption) {
    outputs.benchmarkCaption.innerHTML =
      `FEM-DH charge vs analytic cylinder DH; mean error ` +
      `<span class="latex">${formatNumber(100 * benchmark.meanChargeError, 2)}%</span>`;
  }

  drawSvgLinePlot(svg, {
    rows: benchmark.rows,
    xKey: "biasAbsV",
    series: [
      { key: "analyticQAbs", label: "analytic DH", color: "#111827", axis: "left" },
      { key: "femQAbs", label: "FEM-DH", color: "#064f9e", axis: "left" },
    ],
    xLabel: "|ψₘ| (V)",
    yLabel: "q_DH*",
    xLabelParts: mathVoltageMagnitudeParts(),
    yLabelParts: mathQDhParts(),
    xMinZero: true,
    xFixedRange: [0, result.params.stabilityLimitV],
    yMinZero: true,
    currentX: Math.abs(Number(controls.biasMv.value)),
    showLegend: true,
  });
}

function singleCylinderDhChargeBenchmark(result) {
  const mesh = result.dh.mesh;
  const center = mesh.centers[0];
  const rLimit = Math.min(
    mesh.maxX - center.x,
    center.x - mesh.minX,
    mesh.maxY - center.y,
    center.y - mesh.minY,
  );
  const effectiveBoundary = effectiveRobinBoundary(mesh);
  const boundaryRadius = effectiveBoundary.radius || mesh.a;
  const rows = [];
  let errorSum = 0;
  let errorCount = 0;
  for (const row of result.sweep) {
    const reference = cylindricalDhReference(
      { ...result.dhParams, metalPsi: row.metalPsi },
      rLimit,
      boundaryRadius,
      effectiveBoundary.perimeter || 2 * Math.PI * mesh.a,
    );
    if (!reference || !Number.isFinite(reference.qStar) || !Number.isFinite(row.qDhStar)) continue;
    const chargeError = Math.abs(row.qDhStar - reference.qStar) / Math.max(1e-12, Math.abs(reference.qStar));
    if (Math.abs(reference.qStar) > 1e-9) {
      errorSum += chargeError;
      errorCount += 1;
    }
    rows.push({
      biasAbsV: row.biasAbsV,
      femQAbs: Math.abs(row.qDhStar),
      analyticQAbs: Math.abs(reference.qStar),
      chargeError,
    });
  }
  return {
    rows,
    meanChargeError: errorCount > 0 ? errorSum / errorCount : 0,
  };
}

function effectiveRobinBoundary(mesh) {
  if (!mesh.robinBoundary.length || !mesh.centers.length) {
    return { radius: mesh.a, perimeter: 2 * Math.PI * mesh.a };
  }
  const center = mesh.centers[0];
  const byUnknown = new Map();
  for (const node of mesh.nodes) {
    if (node.unknown >= 0) byUnknown.set(node.unknown, node);
  }
  let weightedRadius = 0;
  let perimeter = 0;
  for (const item of mesh.robinBoundary) {
    const node = byUnknown.get(item.unknown);
    if (!node) continue;
    const radius = Math.sqrt((node.x - center.x) ** 2 + (node.y - center.y) ** 2);
    weightedRadius += item.weight * radius;
    perimeter += item.weight;
  }
  return {
    radius: perimeter > 0 ? weightedRadius / perimeter : mesh.a,
    perimeter,
  };
}

function cylindricalDhReference(params, outerRadiusStar = Infinity, boundaryRadiusStar = params.radiusStar, boundaryPerimeterStar = 2 * Math.PI * params.radiusStar) {
  const rb = boundaryRadiusStar;
  if (!Number.isFinite(rb) || rb <= 0) return null;
  const k0b = modifiedBesselK(0, rb);
  const k1b = modifiedBesselK(1, rb);
  let beta = 0;
  if (Number.isFinite(outerRadiusStar) && outerRadiusStar > rb) {
    beta = -modifiedBesselK(0, outerRadiusStar) / Math.max(modifiedBesselI(0, outerRadiusStar), 1e-300);
  }
  const i0b = modifiedBesselI(0, rb);
  const i1b = modifiedBesselI(1, rb);
  const surfaceShape = k0b + beta * i0b;
  const normalShape = k1b - beta * i1b;
  const denom = surfaceShape + params.sternDelta * normalShape;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) return null;
  const amplitude = params.metalPsi / denom;
  return {
    psiAtR: (r) => amplitude * (modifiedBesselK(0, r) + beta * modifiedBesselI(0, r)),
    qStar: boundaryPerimeterStar * amplitude * normalShape,
  };
}

function modifiedBesselI(order, x) {
  if (!Number.isFinite(x)) return NaN;
  const n = 720;
  const h = Math.PI / n;
  let sum = 0;
  for (let i = 0; i <= n; i += 1) {
    const theta = i * h;
    const weight = i === 0 || i === n ? 1 : (i % 2 === 0 ? 2 : 4);
    sum += weight * Math.exp(x * Math.cos(theta)) * (order === 0 ? 1 : Math.cos(theta));
  }
  return (h / (3 * Math.PI)) * sum;
}

function modifiedBesselK(order, x) {
  if (!Number.isFinite(x) || x <= 0) return Infinity;
  const n = 720;
  const tMax = Math.max(12, Math.min(22, Math.log(80 / Math.max(x, 1e-9)) + 5));
  const h = tMax / n;
  let sum = 0;
  for (let i = 0; i <= n; i += 1) {
    const t = i * h;
    const weight = i === 0 || i === n ? 1 : (i % 2 === 0 ? 2 : 4);
    const coshT = Math.cosh(t);
    const kernel = Math.exp(-x * coshT) * (order === 0 ? 1 : coshT);
    sum += weight * kernel;
  }
  return (h / 3) * sum;
}

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function drawPotential(canvas, result) {
  const ctx = clearCanvas(canvas);
  const { mesh } = result.nlpb;
  const plot = aspectFitPlot(canvas, mesh);
  const image = ctx.createImageData(plot.w, plot.h);
  const maxAbs = Math.max(0.2, Math.abs(result.params.psiS));
  for (let py = 0; py < plot.h; py += 1) {
    const y = mesh.maxY - (py / (plot.h - 1)) * (mesh.maxY - mesh.minY);
    for (let px = 0; px < plot.w; px += 1) {
      const x = mesh.minX + (px / (plot.w - 1)) * (mesh.maxX - mesh.minX);
      const inside = insideCylinderIndex(x, y, mesh.centers, mesh.a);
      let rgb;
      if (inside >= 0) {
        rgb = [16, 24, 39];
      } else {
        const psi = interpolatePotential(mesh, result.nlpb.potential, x, y);
        rgb = divergingColor(psi / maxAbs);
      }
      const idx = 4 * (py * plot.w + px);
      image.data[idx] = rgb[0];
      image.data[idx + 1] = rgb[1];
      image.data[idx + 2] = rgb[2];
      image.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(image, plot.x, plot.y);
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);

  for (const c of mesh.centers) {
    const cx = map(c.x, mesh.minX, mesh.maxX, plot.x, plot.x + plot.w);
    const cy = map(c.y, mesh.maxY, mesh.minY, plot.y, plot.y + plot.h);
    const r = mesh.a * plot.scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = "#111827";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  drawColorbar(ctx, canvas.width - 56, plot.y, 14, plot.h, maxAbs);
  ctx.fillStyle = "#111827";
  ctx.font = "700 13px Arial";
  ctx.fillText(mesh.centers.length === 1 ? "isolated CNT cylinder" : "same-bias CNT cylinders", plot.x + 10, plot.y + 20);
  ctx.fillStyle = "#5c6676";
  ctx.font = "12px Arial";
  const geometryText = mesh.centers.length === 1
    ? `a*=${formatNumber(mesh.a, 2)}`
    : `a*=${formatNumber(mesh.a, 2)}, h*=${formatNumber(mesh.h, 2)}`;
  ctx.fillText(geometryText, plot.x + 10, plot.y + 38);
}

function aspectFitPlot(canvas, mesh) {
  const available = { x: 52, y: 28, w: canvas.width - 132, h: canvas.height - 76 };
  const worldW = mesh.maxX - mesh.minX;
  const worldH = mesh.maxY - mesh.minY;
  const scale = Math.min(available.w / worldW, available.h / worldH);
  const w = Math.max(1, Math.floor(worldW * scale));
  const h = Math.max(1, Math.floor(worldH * scale));
  return {
    x: Math.round(available.x + 0.5 * (available.w - w)),
    y: Math.round(available.y + 0.5 * (available.h - h)),
    w,
    h,
    scale,
  };
}

function divergingColor(t) {
  const clamped = Math.max(-1, Math.min(1, t));
  if (clamped >= 0) {
    return interpolateRgb([250, 250, 250], [161, 28, 28], Math.sqrt(clamped));
  }
  return interpolateRgb([250, 250, 250], [6, 79, 158], Math.sqrt(-clamped));
}

function interpolateRgb(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function drawColorbar(ctx, x, y, w, h, maxAbs) {
  const grad = ctx.createLinearGradient(0, y + h, 0, y);
  grad.addColorStop(0, "#064f9e");
  grad.addColorStop(0.5, "#fafafa");
  grad.addColorStop(1, "#a11c1c");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#111827";
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#111827";
  ctx.font = "11px Arial";
  ctx.fillText(`+${formatNumber(maxAbs, 1)}`, x - 4, y - 6);
  ctx.fillText("0", x + w + 5, y + h / 2 + 4);
  ctx.fillText(`-${formatNumber(maxAbs, 1)}`, x - 4, y + h + 16);
}

function clearSvg(svg) {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  return {
    width: 520,
    height: 360,
    plot: { x: 82, y: 30, w: 385, h: 270 },
  };
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

function svgText(text, x, y, attrs = {}) {
  const el = svgEl("text", { x, y, ...attrs });
  el.textContent = text;
  return el;
}

function drawSvgLinePlot(svg, config) {
  const { plot } = clearSvg(svg);
  const hasRightAxis = config.series.some((s) => s.axis === "right");
  if (hasRightAxis) plot.w -= 34;
  const rows = config.rows.filter((row) => Number.isFinite(row[config.xKey]));
  const yScale = config.yScale || "linear";
  const xValues = rows.map((row) => row[config.xKey]);
  const leftSeries = config.series.filter((s) => s.axis !== "right");
  const rightSeries = config.series.filter((s) => s.axis === "right");
  const yValues = leftSeries.flatMap((s) => rows.map((row) => row[s.key]).filter(Number.isFinite));
  const rightYValues = rightSeries.flatMap((s) => rows.map((row) => row[s.key]).filter(Number.isFinite));
  const xRange = config.xFixedRange || (config.xMinZero
    ? zeroMinRange(Math.max(...xValues))
    : niceRange(Math.min(...xValues), Math.max(...xValues)));
  const yRange = config.yFixedRange || (yScale === "log10"
    ? logRange(yValues)
    : (config.yMinZero
      ? zeroMinRange(Math.max(...yValues))
      : niceRange(Math.min(...yValues), Math.max(...yValues))));
  const rightYRange = hasRightAxis
    ? (config.rightYFixedRange || (config.rightYMinZero
      ? zeroMinRange(Math.max(...rightYValues))
      : niceRange(Math.min(...rightYValues), Math.max(...rightYValues))))
    : null;
  if (config.preferredYTickStep && !config.yFixedRange) {
    yRange[0] = 0;
    yRange[1] = preferredStepMax(yRange[1], config.preferredYTickStep, config.maxYTicks || 12);
  }
  drawSvgAxes(svg, plot, xRange, yRange, config.xLabel, config.yLabel, {
    ...config,
    rightYRange,
  });
  drawSvgReferenceLine(svg, plot, yRange, config.referenceY, config.referenceLabel, yScale);

  config.series.forEach((s, seriesIndex) => {
    const activeYRange = s.axis === "right" && rightYRange ? rightYRange : yRange;
    const activeYScale = s.axis === "right" ? "linear" : yScale;
    const path = rows
      .filter((row) => Number.isFinite(row[s.key]) && (activeYScale !== "log10" || row[s.key] > 0))
      .map((row, idx) => {
        const x = map(row[config.xKey], xRange[0], xRange[1], plot.x, plot.x + plot.w);
        const y = plotY(row[s.key], activeYRange, plot, activeYScale);
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    svg.appendChild(svgEl("path", {
      d: path,
      fill: "none",
      stroke: s.color,
      "stroke-width": 2.6,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    }));

    const currentX = Number.isFinite(config.currentX) ? config.currentX : config.currentPsi;
    const current = interpolateSweepRowByKey(rows, currentX, config.xKey);
    if (
      current &&
      Number.isFinite(current[s.key]) &&
      (activeYScale !== "log10" || current[s.key] > 0) &&
      currentX >= xRange[0] &&
      currentX <= xRange[1]
    ) {
      const cx = map(currentX, xRange[0], xRange[1], plot.x, plot.x + plot.w);
      const cy = plotY(current[s.key], activeYRange, plot, activeYScale);
      svg.appendChild(svgEl("circle", {
        cx,
        cy,
        r: 5 + seriesIndex,
        fill: s.color,
        stroke: "#ffffff",
        "stroke-width": 1.6,
      }));
    }
  });

  if (config.showLegend !== false && config.series.length > 1) {
    drawSvgLegend(svg, config.series, plot.x + 14, plot.y + 18);
  }
}

function drawSvgReferenceLine(svg, plot, yRange, value, label, yScale = "linear") {
  if (!Number.isFinite(value) || value < yRange[0] || value > yRange[1]) return;
  if (yScale === "log10" && value <= 0) return;
  const y = plotY(value, yRange, plot, yScale);
  svg.appendChild(svgEl("line", {
    x1: plot.x,
    y1: y,
    x2: plot.x + plot.w,
    y2: y,
    stroke: "#7c8798",
    "stroke-width": 1.2,
    "stroke-dasharray": "5 5",
  }));
  if (label) {
    svg.appendChild(svgText(label, plot.x + plot.w - 36, y - 6, {
      class: "legend",
      "font-size": 11,
      fill: "#5c6676",
    }));
  }
}

function drawSvgTrajectory(svg, rows, currentBiasAbsV) {
  const { plot } = clearSvg(svg);
  const points = rows.filter((row) => Number.isFinite(row.qStar) && Number.isFinite(row.cStar));
  const xRange = niceRange(Math.min(...points.map((p) => p.qStar)), Math.max(...points.map((p) => p.qStar)));
  const yRange = niceRange(Math.min(...points.map((p) => p.cStar)), Math.max(...points.map((p) => p.cStar)));
  drawSvgAxes(svg, plot, xRange, yRange, "q′*", "c′*", {});

  const path = points
    .map((p, idx) => {
      const x = map(p.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w);
      const y = map(p.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  svg.appendChild(svgEl("path", {
    d: path,
    fill: "none",
    stroke: "#111827",
    "stroke-width": 2.4,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }));

  points.forEach((p, idx) => {
    const t = idx / Math.max(1, points.length - 1);
    const [r, g, b] = interpolateRgb([6, 79, 158], [161, 28, 28], t);
    const x = map(p.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w);
    const y = map(p.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y);
    svg.appendChild(svgEl("circle", {
      cx: x,
      cy: y,
      r: 3.8,
      fill: `rgb(${r},${g},${b})`,
    }));
  });

  const current = interpolateSweepRowByKey(rows, currentBiasAbsV, "biasAbsV");
  if (current && Number.isFinite(current.qStar) && Number.isFinite(current.cStar)) {
    const cx = map(current.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w);
    const cy = map(current.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y);
    svg.appendChild(svgEl("circle", {
      cx,
      cy,
      r: 7,
      fill: "#ffffff",
      stroke: "#a11c1c",
      "stroke-width": 2.4,
    }));
  }
}

function drawSvgAxes(svg, plot, xRange, yRange, xLabel, yLabel, config = {}) {
  for (let i = 0; i <= 4; i += 1) {
    const tx = i / 4;
    const x = plot.x + tx * plot.w;
    const xv = xRange[0] + tx * (xRange[1] - xRange[0]);
    svg.appendChild(svgEl("line", { class: "grid", x1: x, y1: plot.y, x2: x, y2: plot.y + plot.h }));
    svg.appendChild(svgText(formatTick(xv), x - 16, plot.y + plot.h + 20, { "font-size": 11 }));
  }
  const yScale = config.yScale || "linear";
  const yTicks = yScale === "log10"
    ? logTicks(yRange, config.maxYTicks || 8)
    : axisTicks(yRange, config.preferredYTickStep, config.maxYTicks || 12);
  for (const yv of yTicks) {
    const y = plotY(yv, yRange, plot, yScale);
    svg.appendChild(svgEl("line", { class: "grid", x1: plot.x, y1: y, x2: plot.x + plot.w, y2: y }));
    svg.appendChild(svgText(yScale === "log10" ? formatLogTick(yv) : formatTick(yv), plot.x - 12, y + 4, {
      "font-size": 11,
      "text-anchor": "end",
    }));
  }
  if (config.rightYRange) {
    const rightTicks = axisTicks(config.rightYRange, config.rightPreferredYTickStep, config.rightMaxYTicks || 6);
    for (const yv of rightTicks) {
      const y = map(yv, config.rightYRange[0], config.rightYRange[1], plot.y + plot.h, plot.y);
      svg.appendChild(svgText(formatTick(yv), plot.x + plot.w + 12, y + 4, {
        "font-size": 11,
        "text-anchor": "start",
        fill: "#19724a",
      }));
    }
    appendSvgAxisLabel(svg, config.rightYLabelParts, config.rightYLabel || "", plot.x + plot.w + 62, plot.y + 56, {
      class: "axis-label right-axis-label",
      "font-size": 13,
      fill: "#19724a",
      transform: `rotate(-90 ${plot.x + plot.w + 62} ${plot.y + 56})`,
    });
  }
  svg.appendChild(svgEl("rect", {
    class: "axis",
    x: plot.x,
    y: plot.y,
    width: plot.w,
    height: plot.h,
  }));
  appendSvgAxisLabel(svg, config.xLabelParts, xLabel, plot.x + plot.w - 50, plot.y + plot.h + 46, {
    class: "axis-label",
    "font-size": 13,
  });
  appendSvgAxisLabel(svg, config.yLabelParts, yLabel, 26, plot.y + 56, {
    class: "axis-label",
    "font-size": 13,
    transform: `rotate(-90 26 ${plot.y + 56})`,
  });
}

function appendSvgAxisLabel(svg, parts, fallback, x, y, attrs = {}) {
  if (!parts) {
    svg.appendChild(svgText(fallback, x, y, attrs));
    return;
  }
  const text = svgEl("text", { x, y, ...attrs });
  for (const part of parts) {
    const tspanAttrs = {};
    if (part.sub) {
      tspanAttrs["baseline-shift"] = "-35%";
      tspanAttrs["font-size"] = "70%";
    }
    if (part.sup) {
      tspanAttrs["baseline-shift"] = "45%";
      tspanAttrs["font-size"] = "70%";
    }
    const tspan = svgEl("tspan", tspanAttrs);
    tspan.textContent = part.text;
    text.appendChild(tspan);
  }
  svg.appendChild(text);
}

function mathPsiMagnitudeParts() {
  return [
    { text: "|" },
    { text: "Ψ" },
    { text: "s", sub: true },
    { text: "*" , sup: true },
    { text: "|" },
  ];
}

function mathVoltageMagnitudeParts() {
  return [
    { text: "|" },
    { text: "ψ" },
    { text: "m", sub: true },
    { text: "| (V)" },
  ];
}

function mathEpsilonQParts() {
  return [
    { text: "ε" },
    { text: "q", sub: true },
    { text: "*", sup: true },
  ];
}

function mathNMidNInfParts() {
  return [
    { text: "n" },
    { text: "mid", sub: true },
    { text: " / n" },
    { text: "∞", sub: true },
  ];
}

function mathWindowScoreParts() {
  return [
    { text: "S" },
    { text: "w", sub: true },
    { text: "*", sup: true },
  ];
}

function mathQDhParts() {
  return [
    { text: "q" },
    { text: "DH", sub: true },
    { text: "*", sup: true },
  ];
}

function drawSvgLegend(svg, series, x, y) {
  series.forEach((s, idx) => {
    const yy = y + idx * 18;
    svg.appendChild(svgEl("line", {
      x1: x,
      y1: yy,
      x2: x + 22,
      y2: yy,
      stroke: s.color,
      "stroke-width": 3,
    }));
    svg.appendChild(svgText(s.label, x + 30, yy + 4, {
      class: "legend",
      "font-size": 12,
    }));
  });
}

function interpolateSweepRowByKey(rows, value, keyName) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => a[keyName] - b[keyName]);
  if (value <= sorted[0][keyName]) return sorted[0];
  if (value >= sorted[sorted.length - 1][keyName]) return sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i += 1) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (value >= lo[keyName] && value <= hi[keyName]) {
      const t = (value - lo[keyName]) / Math.max(1e-12, hi[keyName] - lo[keyName]);
      const out = { [keyName]: value };
      for (const key of ["psiS", "psiAbs", "metalPsi", "metalPsiAbs", "biasMv", "biasV", "biasAbsV", "diffuseBiasV", "sternDropV", "qStar", "qDhStar", "cStar", "midPsi", "overlap", "enrichment", "dhError", "windowScore"]) {
        if (Number.isFinite(lo[key]) && Number.isFinite(hi[key])) {
          out[key] = lo[key] + t * (hi[key] - lo[key]);
        }
      }
      return out;
    }
  }
  return nearestSweepRowByKey(rows, value, keyName);
}

function drawLinePlot(canvas, config) {
  const ctx = clearCanvas(canvas);
  const plot = { x: 58, y: 28, w: canvas.width - 90, h: canvas.height - 78 };
  const rows = config.rows.filter((row) => Number.isFinite(row[config.xKey]));
  const xValues = rows.map((row) => row[config.xKey]);
  const yValues = config.series.flatMap((s) => rows.map((row) => row[s.key]).filter(Number.isFinite));
  const xRange = niceRange(Math.min(...xValues), Math.max(...xValues));
  const yRange = niceRange(Math.min(...yValues), Math.max(...yValues));
  drawAxes(ctx, plot, xRange, yRange, config.xLabel, config.yLabel);

  for (const s of config.series) {
    ctx.beginPath();
    let started = false;
    for (const row of rows) {
      const x = row[config.xKey];
      const y = row[s.key];
      if (!Number.isFinite(y)) continue;
      const px = map(x, xRange[0], xRange[1], plot.x, plot.x + plot.w);
      const py = map(y, yRange[0], yRange[1], plot.y + plot.h, plot.y);
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  drawLegend(ctx, config.series, plot.x + 12, plot.y + 12);
}

function drawTrajectory(canvas, rows) {
  const ctx = clearCanvas(canvas);
  const plot = { x: 58, y: 28, w: canvas.width - 90, h: canvas.height - 78 };
  const points = rows.filter((row) => Number.isFinite(row.qStar) && Number.isFinite(row.cStar));
  const xRange = niceRange(Math.min(...points.map((p) => p.qStar)), Math.max(...points.map((p) => p.qStar)));
  const yRange = niceRange(Math.min(...points.map((p) => p.cStar)), Math.max(...points.map((p) => p.cStar)));
  drawAxes(ctx, plot, xRange, yRange, "q′*", "c′*");

  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = map(p.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w);
    const y = map(p.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2.4;
  ctx.stroke();

  points.forEach((p, idx) => {
    const x = map(p.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w);
    const y = map(p.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y);
    const t = idx / Math.max(1, points.length - 1);
    const [r, g, b] = interpolateRgb([6, 79, 158], [161, 28, 28], t);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.arc(x, y, 4.2, 0, 2 * Math.PI);
    ctx.fill();
  });

  if (points.length >= 2) {
    const p0 = points[points.length - 2];
    const p1 = points[points.length - 1];
    drawArrow(ctx,
      map(p0.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w),
      map(p0.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y),
      map(p1.qStar, xRange[0], xRange[1], plot.x, plot.x + plot.w),
      map(p1.cStar, yRange[0], yRange[1], plot.y + plot.h, plot.y),
      "#a11c1c",
    );
  }
}

function drawAxes(ctx, plot, xRange, yRange, xLabel, yLabel) {
  ctx.strokeStyle = "#d8d2c6";
  ctx.lineWidth = 1;
  ctx.fillStyle = "#5c6676";
  ctx.font = "11px Arial";
  for (let i = 0; i <= 4; i += 1) {
    const tx = i / 4;
    const x = plot.x + tx * plot.w;
    const xv = xRange[0] + tx * (xRange[1] - xRange[0]);
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    ctx.fillText(formatNumber(xv, 2), x - 15, plot.y + plot.h + 18);
  }
  for (let i = 0; i <= 4; i += 1) {
    const ty = i / 4;
    const y = plot.y + plot.h - ty * plot.h;
    const yv = yRange[0] + ty * (yRange[1] - yRange[0]);
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillText(formatNumber(yv, 2), 8, y + 4);
  }
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 1.4;
  ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
  ctx.fillStyle = "#111827";
  ctx.font = "700 12px Arial";
  ctx.fillText(xLabel, plot.x + plot.w - 44, plot.y + plot.h + 42);
  ctx.save();
  ctx.translate(16, plot.y + 38);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();
}

function drawLegend(ctx, series, x, y) {
  ctx.font = "12px Arial";
  series.forEach((s, idx) => {
    const yy = y + idx * 18;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + 20, yy);
    ctx.stroke();
    ctx.fillStyle = "#111827";
    ctx.fillText(s.label, x + 28, yy + 4);
  });
}

function drawArrow(ctx, x0, y0, x1, y1, color) {
  const angle = Math.atan2(y1 - y0, x1 - x0);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 10 * Math.cos(angle - 0.45), y1 - 10 * Math.sin(angle - 0.45));
  ctx.lineTo(x1 - 10 * Math.cos(angle + 0.45), y1 - 10 * Math.sin(angle + 0.45));
  ctx.closePath();
  ctx.fill();
}

function niceRange(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (Math.abs(max - min) < 1e-12) {
    const pad = Math.max(1, Math.abs(max) * 0.2);
    return [min - pad, max + pad];
  }
  const pad = 0.08 * (max - min);
  return [min - pad, max + pad];
}

function zeroMinRange(max) {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const range = niceRange(0, max);
  return [0, Math.max(max * 1.05, range[1])];
}

function logRange(values) {
  const positive = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!positive.length) return [1, 10];
  const min = Math.min(...positive);
  const max = Math.max(...positive);
  const lo = Math.max(1e-12, 10 ** Math.floor(Math.log10(Math.max(1, min))));
  const hi = 10 ** Math.ceil(Math.log10(Math.max(10, max)));
  return [lo, hi];
}

function maxPositivePlotValue(rows, key) {
  const values = rows.map((row) => row[key]).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return 10;
  return 10 ** Math.ceil(Math.log10(Math.max(10, Math.max(...values))));
}

function logTicks(range, maxTicks = 8) {
  const minPower = Math.floor(Math.log10(Math.max(range[0], 1e-12)));
  const maxPower = Math.ceil(Math.log10(Math.max(range[1], range[0] * 10)));
  const span = Math.max(1, maxPower - minPower);
  const powerStep = Math.max(1, Math.ceil(span / Math.max(1, maxTicks - 1)));
  const ticks = [];
  for (let p = minPower; p <= maxPower; p += powerStep) {
    ticks.push(10 ** p);
  }
  if (ticks[ticks.length - 1] < 10 ** maxPower) ticks.push(10 ** maxPower);
  return ticks;
}

function formatLogTick(value) {
  const power = Math.round(Math.log10(value));
  if (power === 0) return "1";
  if (power === 1) return "10";
  return `10^${power}`;
}

function preferredStepMax(max, preferredStep, maxTicks) {
  if (!Number.isFinite(max) || max <= 0) return preferredStep;
  let step = preferredStep;
  while (Math.ceil(max / step) + 1 > maxTicks) {
    step *= 2;
  }
  return Math.ceil(max / step) * step;
}

function axisTicks(range, preferredStep, maxTicks = 12) {
  const [min, max] = range;
  if (preferredStep && min === 0) {
    let step = preferredStep;
    while (Math.ceil((max - min) / step) + 1 > maxTicks) {
      step *= 2;
    }
    const ticks = [];
    for (let v = min; v <= max + 1e-9; v += step) {
      ticks.push(Number(v.toFixed(10)));
    }
    if (ticks[ticks.length - 1] < max - 1e-9) ticks.push(max);
    return ticks;
  }
  const ticks = [];
  for (let i = 0; i <= 4; i += 1) {
    const t = i / 4;
    ticks.push(min + t * (max - min));
  }
  return ticks;
}

function map(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function plotY(value, range, plot, scale = "linear") {
  if (scale === "log10") {
    return map(Math.log10(value), Math.log10(range[0]), Math.log10(range[1]), plot.y + plot.h, plot.y);
  }
  return map(value, range[0], range[1], plot.y + plot.h, plot.y);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function exportCsv() {
  if (!latestResult) return;
  const header = [
    "metal_psi_star",
    "abs_metal_psi_star",
    "diffuse_psi_star",
    "abs_diffuse_psi_star",
    "metal_bias_V",
    "metal_bias_mV",
    "diffuse_bias_V",
    "stern_drop_V",
    "q_star_nlpb",
    "q_star_dh",
    "c_star_total_wrt_metal_voltage",
    "mid_gap_psi_star",
    "overlap_metric",
    "target_ion_enrichment",
    "dh_relative_charge_error",
    "doping_window_score",
  ];
  const lines = [header.join(",")];
  for (const row of latestResult.sweep) {
    lines.push([
      row.metalPsi,
      row.metalPsiAbs,
      row.psiS,
      row.psiAbs,
      row.biasV,
      row.biasMv,
      row.diffuseBiasV,
      row.sternDropV,
      row.qStar,
      row.qDhStar,
      row.cStar,
      row.midPsi,
      row.overlap,
      row.enrichment,
      row.dhError,
      row.windowScore,
    ].join(","));
  }
  const blob = new Blob([`${lines.join("\n")}\n`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cnt-edl-fem-sweep.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function syncBiasFromSlider() {
  const biasV = latestResult
    ? enforceAttractiveBiasV(Number(controls.biasSlider.value), latestResult.params.targetIonZ)
    : Number(controls.biasSlider.value);
  controls.biasMv.value = formatInputNumber(biasV, 3);
  controls.biasSlider.value = biasV;
  if (!latestResult) return;
  updateMetricCardsFromSweep(latestResult, biasV);
  drawAll(latestResult);
  setStatus("Slider preview; run model to recompute field");
}

function syncBiasFromNumber() {
  const biasV = latestResult
    ? enforceAttractiveBiasV(Number(controls.biasMv.value), latestResult.params.targetIonZ)
    : Number(controls.biasMv.value);
  controls.biasMv.value = formatInputNumber(biasV, 3);
  controls.biasSlider.value = biasV;
  if (!latestResult) return;
  updateMetricCardsFromSweep(latestResult, biasV);
  drawAll(latestResult);
  setStatus("Slider preview; run model to recompute field");
}

function syncStabilityLimit() {
  const stabilityLimitV = Math.max(0.1, Math.abs(Number(controls.stabilityLimitV.value) || 0));
  controls.stabilityLimitV.value = formatInputNumber(stabilityLimitV, 3);
  const sign = latestResult ? attractiveBiasSign(latestResult.params.targetIonZ) : 1;
  if (sign > 0) {
    controls.biasSlider.min = 0;
    controls.biasSlider.max = stabilityLimitV;
  } else {
    controls.biasSlider.min = -stabilityLimitV;
    controls.biasSlider.max = 0;
  }
  const currentBias = Number(controls.biasMv.value);
  if (Math.abs(currentBias) > stabilityLimitV) {
    const nextBias = sign * stabilityLimitV;
    controls.biasMv.value = formatInputNumber(nextBias, 3);
    controls.biasSlider.value = nextBias;
  }
  if (latestResult) setStatus("Stability limit changed; run model to recompute");
}

function applyPresetDefaults() {
  const preset = controls.electrolytePreset.value;
  const isCustom = preset === "custom";
  const wasFixedGap = controls.gapNm.disabled;
  controls.customSpecies.disabled = !isCustom;
  controls.customSpeciesControl.classList.toggle("hidden", !isCustom);
  controls.customSpeciesHelp.classList.toggle("hidden", !isCustom);
  controls.ionDiameterControl.classList.toggle("hidden", !isCustom);
  controls.ionDiameterNm.disabled = !isCustom;

  const presetInfo = ELECTROLYTE_PRESETS[preset];
  if (isCustom) {
    controls.gapControl.classList.remove("hidden");
    controls.gapNm.disabled = false;
    if (wasFixedGap) controls.gapNm.value = "1";
    controls.presetGapNote.textContent =
      "Custom electrolyte: enter h_eff, d_ion,eff, and electroneutral species manually.";
    if (latestResult) setStatus("Preset changed; run model to recompute");
    return;
  }

  if (presetInfo) {
    controls.ionDiameterNm.value = presetInfo.ionDiameterNm;
    controls.customSpecies.value = JSON.stringify(presetInfo.species, null, 2);
    const hasFixedGap = Number.isFinite(presetInfo.gapNm);
    controls.gapControl.classList.toggle("hidden", hasFixedGap);
    controls.gapNm.disabled = hasFixedGap;
    if (hasFixedGap) {
      controls.gapNm.value = formatInputNumber(presetInfo.gapNm, 7);
      controls.presetGapNote.textContent =
        `${presetInfo.label}: from Density Functional Theory, stable h_eff = ` +
        `${formatNumber(presetInfo.gapNm, 3)} nm (${formatNumber(10 * presetInfo.gapNm, 3)} Å).`;
    } else {
      controls.gapNm.disabled = false;
      if (wasFixedGap) controls.gapNm.value = "1";
      controls.presetGapNote.textContent = `${presetInfo.label}: ${presetInfo.gapSource}.`;
    }
    if (latestResult) setStatus("Preset changed; run model to recompute");
  }
}

function formatInputNumber(value, digits = 4) {
  return Number(value).toFixed(digits).replace(/\.?0+$/, "");
}

function frame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

controls.runButton.addEventListener("click", runModel);
controls.exportCsvButton.addEventListener("click", exportCsv);
controls.biasSlider.addEventListener("input", syncBiasFromSlider);
controls.biasMv.addEventListener("input", syncBiasFromNumber);
controls.stabilityLimitV.addEventListener("input", syncStabilityLimit);
controls.electrolytePreset.addEventListener("change", applyPresetDefaults);
applyPresetDefaults();

runModel();
