# CNT Bundle EDL FEM Explorer

Static browser app for the ME 360 CNT bundle EDL analysis project.

The app solves a two-dimensional, same-bias CNT geometry using a structured
triangular P1 finite-element discretization. CNT metal bias is imposed through a
Stern Robin boundary condition, so the solved diffuse potential and local Stern
drop can vary around each CNT. The app compares the general multicomponent
nonlinear Poisson-Boltzmann model against the Debye-Huckel limit.

## Local use

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8088
```

Then open `http://localhost:8088`.

## Current model

- Applied metal voltage is the control variable.
- CNT boundaries use a Stern Robin condition rather than a fixed diffuse-plane
  Dirichlet potential.
- CNT centers use compact triangular-lattice bundle layouts for 2 to 8
  cylinders, including a diamond-like four-cylinder layout around the central
  interstitial.
- A one-cylinder benchmark mode solves an isolated CNT and compares FEM
  Debye-Huckel charge against the analytic cylindrical Debye-Huckel solution
  using modified Bessel functions, the same Stern Robin boundary condition, and
  a finite outer bath radius matching the FEM domain. The nonlinear cylindrical
  PB result remains numerical; there is no simple planar Gouy-Chapman-style
  closed form for that case.
- Debye length is computed from temperature, relative permittivity, formula
  concentration, and electrolyte stoichiometry.
- If the computed Debye length is too small for the fixed browser FEM mesh to
  resolve, the app reports the physical `lambda_D` but solves with a larger
  `lambda_D,solve`. This is a numerical regularization for the thin-EDL limit,
  not an exact small-Debye-length calculation. Capped runs should be interpreted
  as asymptotic/qualitative.
- Bias sweeps follow the attractive doping direction: positive for anion
  targets and negative for cation targets, plotted against absolute metal bias.
- Anion presets use the supplied DFT nearest intertube C-C distances as
  `h_eff` where available:
  - TFSI: 0.7070837 nm
  - AlCl4: 0.5011987 nm
  - PF6: 0.5555362 nm
  - BF4: 0.4274176 nm
- HSO4 and the higher-valence presets do not have a loaded CNT-bundle DFT gap,
  so `h_eff` stays manual for those cases.
- Relative permittivity is treated as a bulk solvent/electrolyte-medium input,
  not as a bare-ion property.
- General electrolyte source term:

```text
∇_*² Ψ* =
- [Σ_i z_i c_i exp(-z_i Ψ*)] / [Σ_i z_i² c_i]
```

- DH comparison:

```text
∇_*² Ψ* = Ψ*
```

## Deployment on Render

This app is static: `index.html`, `styles.css`, and `solver.js` are enough. It
can be hosted as a Render Static Site.

Use the included `render.yaml` if deploying from a Git repository:

- Service type: Static Site
- Publish path: `.`
- Build command: empty

If the repository root is above this folder, set Render's root directory to
`cnt-edl-fem`, or move this folder's files to the repository root.
