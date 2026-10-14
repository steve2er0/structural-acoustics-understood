# SP-8072 control inventory

Generated from the actual adapter and model bounds. Defaults are demonstration assumptions unless a handbook basis is stated. Bounds constrain the software; empirical curve domains and configuration checks can be narrower. Independent environmental metadata without a published correction remains metadata, not invented acoustic sensitivity.

| Control / key | Unit | Default | Software bounds / options | Basis |
| --- | --- | --- | --- | --- |
| Prediction method / `method` | dimensionless | apparent | apparent, distributed | §4.2 pp. 28–31, Eqs. 1–10 |
| Identical engine count / `engines` | dimensionless | 1 | 1 to 64 | Eq. 1/3 p. 28 |
| Thrust per engine / `thrust` | N | 1000000 | 1 to 1000000000 | Eq. 1 p. 28, N per engine |
| Fully expanded exit velocity / `velocity` | m/s | 2200 | 100 to 10000 | Eq. 1 p. 28; Fig. 5 pp. 8–9 |
| Individual fully expanded nozzle diameter / `diameter` | m | 1.5 | 0.001 to 100 | Eq. 3 p. 28; Fig. 5 p. 8 |
| Acoustic / mechanical power efficiency / `efficiency` | % | 1 | 0.000001 to 100 | §2.1.1 pp. 6–7; Eq. 1 p. 28 (1% conservative) |
| Nozzle-flow treatment / `cluster` | dimensionless | merged | merged, independent | Fig. 7 pp. 9–10; Eq. 3 p. 28 |
| Independent nozzle layout radius / `nozzleRadius` | m | 0 | 0 to 1000 | Multiple-jet geometry scenario; §3.2 p. 25 |
| Optional independent nozzle coordinates / `nozzlePositions` | dimensionless | empty | text/curve | Multiple-jet geometry scenario; §3.2 p. 25 |
| Receiver X / `receiverX` | m | -25 | -100000 to 100000 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Receiver Y / `receiverY` | m | 0 | -100000 to 100000 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Receiver Z / `receiverZ` | m | 20 | -100000 to 100000 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Nozzle height above pad datum / `altitude` | m | 0 | 0 to 10000 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Geometry keyboard increment / `receiverStep` | m | 1 | 0.001 to 100 | Interface-only control; no acoustic relationship |
| Comparison microphone locations / `measurementLocations` | SI m (JSON XYZ) | [[-50,0,20],[25,0,20]] | text/curve | Proposed receiver coordinates in SI metres; each location independently applies the same SP-8072 Eqs. 5/6 or 9/10. Up to two comparison locations is a software limit; no measured microphone dataset is supplied. |
| Deflector configuration / `deflector` | dimensionless | none | none, open, closed, twin, covered, flat6, flat22, curved45, bucket150, conical | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Nozzle-to-turn stand-off / `standOffD` | nozzle diameters | 4 | 0 to 1000 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Total flow turning angle / `turn` | deg | 90 | 0 to 170 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Outlet azimuth / `azimuth` | deg | 0 | -360 to 360 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Circular bend radius / `bendRadiusD` | nozzle diameters | 2 | 0 to 100 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Power share in first branch / `branchFraction` | dimensionless | 0.5 | 0.001 to 0.999 | Flow/receiver geometry: §4.2 p. 28, Fig. 17 p. 20; arc/radial/twin details are entered geometric assumptions |
| Source spectrum basis / `sourceBasis` | dimensionless | handbook | handbook, example8, custom | Figs. 5/8 pp. 8/10; Eqs. 4/8 pp. 29/30 |
| Out-of-family scenario transfer / `transfer` | dimensionless | no | no, yes | Explicit user assumption; §3.3 p. 26 testing boundary |
| User normalized source spectrum / `customSpectrum` | dimensionless | empty | text/curve | User density replaces Fig. 5 p. 8 |
| User normalized axial power / `customAxial` | dimensionless | empty | text/curve | User density replaces Fig. 12 p. 13 |
| User local spectral density / `customLocal` | dimensionless | empty | text/curve | User density replaces Fig. 13 p. 14 |
| Acoustic bandwidth / `band` | dimensionless | third | third, octave, linear | Bandwidth and spectrum selection: Eq. 4 p. 29 / Eq. 8 p. 30; software limits separate from empirical curve limits |
| Linear bin bandwidth / `linearWidth` | Hz | 10 | 0.001 to 100000 | Bandwidth and spectrum selection: Eq. 4 p. 29 / Eq. 8 p. 30; software limits separate from empirical curve limits |
| First band center / `fmin` | Hz | 20 | 0.01 to 1000000 | Bandwidth and spectrum selection: Eq. 4 p. 29 / Eq. 8 p. 30; software limits separate from empirical curve limits |
| Last allowed band center / `fmax` | Hz | 400 | 0.01 to 1000000 | Bandwidth and spectrum selection: Eq. 4 p. 29 / Eq. 8 p. 30; software limits separate from empirical curve limits |
| Density-to-band conversion / `integration` | dimensionless | integral | integral, center | Bandwidth and spectrum selection: Eq. 4 p. 29 / Eq. 8 p. 30; software limits separate from empirical curve limits |
| Directional radiation / `directivity` | dimensionless | edge | strict, edge, isotropic, entered | Fig. 10 p. 12; local use assumption p. 14 |
| Entered directional gain / `directivityDb` | dB | 0 | -60 to 60 | User directional scenario replacing Fig. 10 |
| Apparent-source position multiplier / `positionScale` | dimensionless | 1 | 0.01 to 100 | Entered empirical multiplier on Fig. 14 p. 15 |
| Core-length multiplier / `coreScale` | dimensionless | 1 | 0.01 to 100 | Entered empirical multiplier on Fig. 11 p. 13 |
| Fully expanded exit Mach number / `mach` | dimensionless | 3 | 1 to 4 | Fig. 11 p. 13 |
| Ambient sound speed / `ambientSound` | m/s | 343 | 100 to 1000 | Eq. 8 p. 30 |
| Slices per flow branch / `slices` | dimensionless | 96 | 8 to 512 | Source quadrature and truncation choice, Figs. 11–13 pp. 13–14 / Eq. 7 p. 30 |
| First distributed source station / `axialMin` | core lengths | 0.1 | 0.1 to 4.6 | Source quadrature and truncation choice, Figs. 11–13 pp. 13–14 / Eq. 7 p. 30 |
| Last distributed source station / `axialMax` | core lengths | 4.7 | 0.11 to 4.7 | Source quadrature and truncation choice, Figs. 11–13 pp. 13–14 / Eq. 7 p. 30 |
| Water treatment / `water` | dimensionless | dry | dry, source-scenario | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Water mass flow / `waterFlow` | kg/s | 0 | 0 to 10000000 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Exhaust mass flow override / `exhaustFlow` | kg/s | 0 | 0 to 10000000 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Broadband incremental source reduction / `waterReduction` | dB | 0 | 0 to 60 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Incremental reduction versus frequency / `waterCurve` | dimensionless | empty | text/curve | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Water scenario basis / `waterProvenance` | dimensionless | empty | text/curve | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Water injection station / `injectionStationD` | nozzle diameters | 4 | 0 to 1000 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Injection angle / `injectionAngle` | deg | 90 | 0 to 180 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Injection pressure / `injectionPressure` | kPa | 0 | 0 to 100000 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Injector diameter / `injectorDiameter` | m | 0 | 0 to 10 | §2.4 pp. 23–24 / §4.4 p. 34; water metadata or explicitly entered incremental source scenario |
| Shielded source interval start / `shieldStartD` | nozzle diameters | 4 | 0 to 1000 | Interface-only control; no acoustic relationship |
| Shielded source interval end / `shieldEndD` | nozzle diameters | 40 | 0 to 1000 | Interface-only control; no acoustic relationship |
| Incremental source-path shielding loss / `shieldDb` | dB | 0 | 0 to 60 | Interface-only control; no acoustic relationship |
| Entered atmospheric path loss / `propagationDbPerKm` | dB/km | 0 | 0 to 1000 | User path-loss scenario; no atmospheric absorption law implemented |
| Additional reflected-field gain / `reflectionDb` | dB | 0 | -60 to 60 | User additional reflected field; §4.2 p. 31 |
| Receiver surface pressure correction / `surfaceDb` | dB | 0 | -60 to 60 | User receiver-loading correction; §4.2 p. 31 |
| Minimum source-to-receiver range / `minimumRangeD` | nozzle diameters | 0.5 | 0.001 to 100 | Software/model exclusion radius, not a published validity boundary |
| Vehicle free-stream Mach number / `vehicleMach` | dimensionless | 0 | 0 to 0.99 | Fig. 16 p. 19 (undeflected); 20 log10(1−M) |
| Auxiliary spatial correlation / `correlation` | dimensionless | off | off, longitudinal, circumferential | Figs. 18–19 p. 21; §4.2 pp. 31–32, auxiliary estimate |
| Longitudinal receiver separation / `separation` | m | 0 | 0 to 1000 | Fig. 19 p. 21 |
| Circumferential separation angle / `circumferenceAngle` | deg | 0 | 0 to 180 | Fig. 18 p. 21 |
| Vehicle radius for correlation / `vehicleRadius` | m | 3 | 0.001 to 100 | Fig. 18 p. 21 |
| Incidence angle beta for correlation / `beta` | deg | 30 | 0 to 90 | Fig. 17 p. 20; entered directional approximation |
| Exit-gas density / `exitDensity` | kg/m³ | 0.2 | 0.000001 to 100 | §3.2 p. 25 / §3.3.1 p. 26; water mass-flow estimate |
| Ambient gas density / `ambientDensity` | kg/m³ | 1.225 | 0.000001 to 100 | §3.3.1 p. 26 applicability metadata |
| Exit / ambient static-pressure ratio / `pressureRatio` | dimensionless | 1 | 0.001 to 100 | §3.3.1 p. 26 applicability metadata |
| Nozzle similarity class / `nozzleShape` | dimensionless | circular | circular, other | §3.2 p. 25; similarity applicability |
| Nozzle expansion area ratio / `areaRatio` | dimensionless | 20 | 1 to 1000 | §3.2 p. 25 metadata; no independent correction in Eqs. 1–10 |

Group visibility: Engine and source allocation; Receiver and flow geometry; Spectrum and empirical basis; Water suppression scenario; Source / directivity assumptions; Propagation and receiver loading; Spatial correlation; Applicability and exhaust metadata. Model-specific controls are hidden when inapplicable.
