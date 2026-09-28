/** Add focus to existing physical-state glow; never replace field/current/heat encoding. */
export function highlightIntensity(
  physicalGlow: number,
  focused: boolean,
  strength = 0.16,
) {
  return physicalGlow + (focused ? strength : 0);
}
