import type { ConfigField, ValidationRule } from './config-spec';

const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}[T ]\d{1,2}:\d{2}$/;

/**
 * One interpreter for every client — CLI, daemon, and the browser.
 * Empty values are fine unless a `required` rule (or the field flag) says otherwise.
 */
export function validateValue(
  rules: readonly ValidationRule[] | undefined,
  value: string,
  field?: Pick<ConfigField, 'label' | 'required' | 'type'>,
  current = '',
): string | undefined {
  const trimmed = value.trim();

  if (field?.required && !trimmed && !(field.type === 'secret' && current)) {
    return `${field.label} is needed`;
  }

  if (!rules?.length) {
    return undefined;
  }

  for (const rule of rules) {
    const error = checkRule(rule, trimmed, field?.label);
    if (error) {
      return error;
    }
  }

  return undefined;
}

function checkRule(
  rule: ValidationRule,
  value: string,
  label?: string,
): string | undefined {
  switch (rule.kind) {
    case 'required':
      return value
        ? undefined
        : (rule.message ?? (label ? `${label} is needed` : 'this is needed'));
    case 'pattern': {
      if (!value) {
        return undefined;
      }
      try {
        return new RegExp(rule.pattern).test(value) ? undefined : rule.message;
      } catch {
        return rule.message;
      }
    }
    case 'integer': {
      if (!value) {
        return undefined;
      }
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return rule.message ?? 'a whole number, please';
      }
      return parsed < rule.min || parsed > rule.max
        ? (rule.message ?? `between ${rule.min} and ${rule.max}`)
        : undefined;
    }
    case 'datetime': {
      if (!value) {
        return undefined;
      }
      if (rule.format !== 'local') {
        return rule.message ?? 'unsupported datetime format';
      }
      if (!LOCAL_DATETIME.test(value)) {
        return rule.message ?? 'YYYY-MM-DD HH:MM';
      }
      return Number.isNaN(Date.parse(value.replace(' ', 'T')))
        ? (rule.message ?? 'that is not a real date')
        : undefined;
    }
    default: {
      const _exhaustive: never = rule;
      return `unknown rule ${JSON.stringify(_exhaustive)}`;
    }
  }
}
