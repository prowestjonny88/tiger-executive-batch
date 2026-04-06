export type ResolverTier = "driver" | "local_site_resolver" | "remote_ops" | "technician";

export type DemoScenario = {
  scenario_id: string;
  name: string;
  site_id: string;
  headline: string;
  photo_hint: string;
  symptom_text: string;
  error_code: string;
  follow_up_answers: Record<string, string>;
  expected_tier: ResolverTier;
};

export const sites = [
  {
    site_id: "site-mall-01",
    site_name: "Sunrise Mall Basement Charging Bay",
    charger_id: "rex-ac-01",
    charger_label: "Bay A1",
    has_local_resolver: true,
    has_remote_ops: true,
  },
  {
    site_id: "site-condo-01",
    site_name: "North Residences Visitor Parking",
    charger_id: "rex-ac-09",
    charger_label: "Visitor Lot V3",
    has_local_resolver: false,
    has_remote_ops: true,
  },
] as const;

export const scenarios: DemoScenario[] = [
  {
    scenario_id: "demo-driver-connectivity",
    name: "Driver-resolvable connectivity issue",
    site_id: "site-mall-01",
    headline: "Charging never starts but charger appears powered",
    photo_hint: "display on, no damage",
    symptom_text: "Blinking blue LED, charging never starts.",
    error_code: "NET-01",
    follow_up_answers: { screen_on: "yes", visible_damage: "no", charging_state: "never_started" },
    expected_tier: "driver",
  },
  {
    scenario_id: "demo-remote-ops",
    name: "Remote ops investigation case",
    site_id: "site-condo-01",
    headline: "Charger offline with no local resolver",
    photo_hint: "screen dim, no visible damage",
    symptom_text: "Screen is dim and LED blinks red intermittently.",
    error_code: "OFF-12",
    follow_up_answers: { screen_on: "dim", visible_damage: "no", charging_state: "stopped_suddenly" },
    expected_tier: "remote_ops",
  },
  {
    scenario_id: "demo-local-resolver",
    name: "Local resolver SOP check",
    site_id: "site-mall-01",
    headline: "Powered charger needs a safe on-site SOP restart",
    photo_hint: "screen dim, no visible damage",
    symptom_text: "Session stopped suddenly and LED blinks red intermittently.",
    error_code: "OFF-12",
    follow_up_answers: { screen_on: "yes", visible_damage: "no", charging_state: "stopped_suddenly" },
    expected_tier: "local_site_resolver",
  },
  {
    scenario_id: "demo-technician-hazard",
    name: "Technician escalation for visible damage",
    site_id: "site-mall-01",
    headline: "Cable jacket damage with burn marks",
    photo_hint: "visible connector damage and scorching",
    symptom_text: "User reports a burnt smell near the connector.",
    error_code: "SAFE-99",
    follow_up_answers: { screen_on: "yes", visible_damage: "yes", charging_state: "stopped_suddenly" },
    expected_tier: "technician",
  },
];
