export type IssueType = "no_power" | "tripping_mcb_rccb" | "charging_slow" | "not_responding";
export type WorkflowOutcome = "resolved" | "escalate";

export type DemoScenario = {
  scenario_id: string;
  name: string;
  site_id: string;
  headline: string;
  photo_hint: string;
  symptom_text: string;
  error_code: string;
  follow_up_answers: Record<string, string>;
  expected_issue_type: IssueType;
  expected_outcome: WorkflowOutcome;
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
    scenario_id: "demo-no-power",
    name: "No power supply issue",
    site_id: "site-mall-01",
    headline: "Charger is dark and the customer reports no power at the bay",
    photo_hint: "display off, no lights, breaker suspected off",
    symptom_text: "Charger has no lights and the session cannot start because the unit appears unpowered.",
    error_code: "",
    follow_up_answers: {
      main_power_supply: "Incoming voltage is missing at the charger.",
      cable_condition: "Cable and connector look normal.",
      indicator_or_error_code: "No screen or LED is visible.",
    },
    expected_issue_type: "no_power",
    expected_outcome: "resolved",
  },
  {
    scenario_id: "demo-tripping-mcb",
    name: "Tripping MCB/RCCB case",
    site_id: "site-mall-01",
    headline: "Breaker trips when charging starts",
    photo_hint: "protector trips, no burn marks visible",
    symptom_text: "The MCB trips shortly after charging begins and the connector feels slightly warm.",
    error_code: "TRIP-02",
    follow_up_answers: {
      main_power_supply: "Power is available before the trip.",
      cable_condition: "Loose connector and overheating observed.",
      indicator_or_error_code: "Breaker trip recorded as TRIP-02.",
    },
    expected_issue_type: "tripping_mcb_rccb",
    expected_outcome: "escalate",
  },
  {
    scenario_id: "demo-charging-slow",
    name: "Charging slow investigation",
    site_id: "site-condo-01",
    headline: "Charging is much slower than expected",
    photo_hint: "display on, current limited, no visible damage",
    symptom_text: "Charging starts but the current is much lower than usual for this vehicle.",
    error_code: "SLOW-11",
    follow_up_answers: {
      main_power_supply: "Main supply is available.",
      cable_condition: "Cable and connector are in good condition.",
      indicator_or_error_code: "Display shows reduced output and SLOW-11.",
    },
    expected_issue_type: "charging_slow",
    expected_outcome: "resolved",
  },
  {
    scenario_id: "demo-not-responding",
    name: "Not responding charger",
    site_id: "site-condo-01",
    headline: "Charger is powered but controls do not respond",
    photo_hint: "screen frozen, buttons do nothing, no visible damage",
    symptom_text: "The charger remains powered but the screen is frozen and the unit does not respond to input.",
    error_code: "UI-09",
    follow_up_answers: {
      main_power_supply: "Main power is available.",
      cable_condition: "Cable and connector are normal.",
      indicator_or_error_code: "Display shows UI-09 and stays frozen.",
    },
    expected_issue_type: "not_responding",
    expected_outcome: "resolved",
  },
];
