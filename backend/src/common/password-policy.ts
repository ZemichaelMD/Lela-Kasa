import { BadRequestException } from "@nestjs/common";

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  minCharacterClasses: number;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  minCharacterClasses: 3,
};

export function loadPasswordPolicy(settings: { key: string; value: string }[]): PasswordPolicy {
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;
  return {
    minLength: parseInt(map["password_min_length"] || String(DEFAULT_POLICY.minLength), 10),
    maxLength: parseInt(map["password_max_length"] || String(DEFAULT_POLICY.maxLength), 10),
    minCharacterClasses: parseInt(map["password_min_character_classes"] || String(DEFAULT_POLICY.minCharacterClasses), 10),
  };
}

const CLASS_CHECKS = [
  { test: /[a-z]/, label: "lowercase letter" },
  { test: /[A-Z]/, label: "uppercase letter" },
  { test: /[0-9]/, label: "number" },
  { test: /[^A-Za-z0-9]/, label: "symbol" },
];

function describeClasses(policy: PasswordPolicy): string {
  const labels = CLASS_CHECKS.map((c) => c.label);
  return `${labels.slice(0, policy.minCharacterClasses - 1).join(", ")}${policy.minCharacterClasses > 1 ? ", " : ""}${policy.minCharacterClasses > 1 ? "or " : ""}${labels[policy.minCharacterClasses - 1]}`;
}

export function assertStrongPassword(password: string, policy?: PasswordPolicy): void {
  const p = policy ?? DEFAULT_POLICY;

  if (password.length < p.minLength) {
    throw new BadRequestException(`Password must be at least ${p.minLength} characters`);
  }
  if (password.length > p.maxLength) {
    throw new BadRequestException(`Password must be at most ${p.maxLength} characters`);
  }

  if (p.minCharacterClasses > 1 && p.minCharacterClasses <= CLASS_CHECKS.length) {
    const matched = CLASS_CHECKS.filter((c) => c.test.test(password)).length;
    if (matched < p.minCharacterClasses) {
      throw new BadRequestException(
        `Password must contain at least ${p.minCharacterClasses} of: ${CLASS_CHECKS.map((c) => c.label).join(", ")}`,
      );
    }
  }
}

export function describePasswordPolicy(policy: PasswordPolicy): string[] {
  const rules: string[] = [
    `Minimum ${policy.minLength} characters`,
    `Maximum ${policy.maxLength} characters`,
  ];
  if (policy.minCharacterClasses > 1) {
    rules.push(`At least ${policy.minCharacterClasses} of: lowercase, uppercase, numbers, symbols`);
  }
  return rules;
}
