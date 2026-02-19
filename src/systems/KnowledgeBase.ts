// src/systems/KnowledgeBase.ts

export const CHEMISTRY_KNOWLEDGE_BASE = `
# CHEMISTRY KNOWLEDGE BASE (UNIVERSITY LEVEL)

## 1. THERMODYNAMICS & KINETICS

### A. Activation Energy (Ea)
- Definition: The minimum energy required to start a chemical reaction.
- Arrhenius Equation: k = A * e^(-Ea / RT)
- Collision Theory: For a reaction to occur, particles must collide with:
  1. Sufficient energy (>= Ea).
  2. Correct orientation.
- Catalysts: Lower Ea by providing an alternative reaction pathway, increasing the rate without being consumed.

### B. Enthalpy (ΔH)
- Exothermic (ΔH < 0): Releases heat to the surroundings (e.g., Neutralization, Combustion). Temperature of the system increases.
- Endothermic (ΔH > 0): Absorbs heat from the surroundings (e.g., Thermal Decomposition). Temperature of the system decreases.

### C. Le Chatelier's Principle
- If a dynamic equilibrium is disturbed by changing the conditions (concentration, pressure, temperature), the position of equilibrium moves to counteract the change.

## 2. REACTION MECHANISMS & REGISTRY

### A. Sodium + Water (Na + H2O)
- Stoichiometry: 2Na(s) + 2H2O(l) -> 2NaOH(aq) + H2(g)
- Mechanism:
  1. Na atom loses an electron to become Na+.
  2. The electron is solvated by water, reducing H2O to OH- and H• radical.
  3. Two H• radicals combine to form H2 gas.
  4. Exothermic heat causes the H2 gas to expand rapidly. If trapped or if temperature is high enough, H2 ignites with O2 in air (2H2 + O2 -> 2H2O), causing an explosion.
- Visuals: Fizzing, rapid movement of metal on surface, potential yellow/orange flame (Sodium emission spectrum), release of white smoke (NaOH aerosol).

### B. Potassium + Water (K + H2O)
- Stoichiometry: 2K(s) + 2H2O(l) -> 2KOH(aq) + H2(g)
- Mechanism: Similar to Sodium but faster due to lower ionization energy of Potassium.
- Visuals: Lilac flame (Potassium emission), violent reaction, immediate ignition of Hydrogen.

### C. Acid-Base Neutralization (HCl + NaOH)
- Stoichiometry: HCl(aq) + NaOH(aq) -> NaCl(aq) + H2O(l)
- Net Ionic Equation: H+(aq) + OH-(aq) -> H2O(l)
- Thermodynamics: Highly exothermic (ΔH ≈ -57.6 kJ/mol).
- Mechanism: Proton transfer from Hydronium (H3O+) to Hydroxide (OH-).
- Indicator (Phenolphthalein): Turns pink in basic solution (pH > 8.2), colorless in acidic/neutral.

### D. Thermal Decomposition of Potassium Chlorate (KClO3)
- Stoichiometry: 2KClO3(s) -> 2KCl(s) + 3O2(g)
- Conditions: Requires heat (Catalyst MnO2 lowers temp, but here we assume heat alone).
- Mechanism: Complex radical mechanism involving chlorite intermediates.
- Safety: Generates Oxygen gas which supports combustion. Potentially explosive if mixed with combustibles.

### E. Golden Rain (Pb(NO3)2 + KI)
- Stoichiometry: Pb(NO3)2(aq) + 2KI(aq) -> PbI2(s) + 2KNO3(aq)
- Mechanism: Double displacement / Metathesis.
- Solubility Product (Ksp): PbI2 is sparingly soluble at room temperature but soluble in hot water.
- Visuals: Upon cooling, bright yellow hexagonal platelets of PbI2 crystallize, resembling "gold dust".

## 3. SAFETY PROTOCOLS

### A. Acid/Base Spills
- Immediate Action: Neutralize.
  - Acid Spill: Use weak base (NaHCO3 - Sodium Bicarbonate).
  - Base Spill: Use weak acid (Acetic Acid / Vinegar or Citric Acid).
- Never add water directly to concentrated acid ("Do as you oughter, add acid to water").

### B. Toxic Gas (e.g., Chlorine - Cl2)
- Properties: Green-yellow gas, denser than air, pungent odor.
- Hazard: Pulmonary irritant, forms HCl in lungs.
- Containment: Fume hood required. If released in open lab, evacuate immediately. Neutralize with basic solution or thiosulfate if small scale.

### C. Alkali Metals (Na, K)
- Storage: Under mineral oil to prevent reaction with atmospheric moisture/oxygen.
- Handling: Use forceps, never touch with skin (moisture in skin causes burns).
- Disposal: React small amounts with ethanol or isopropanol in a fume hood, NOT water.

### D. Broken Glass
- Handling: Use brush and dustpan, never bare hands. Dispose in dedicated "Sharps" container.

`;
