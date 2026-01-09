import { ExecutionContext } from '../types/handler-types';

/**
 * Utility for resolving template variables in workflow configurations
 */

/**
 * Get nested value from object using dot notation
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

/**
 * Set nested value in object using dot notation
 */
export function setNestedValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((acc, key) => {
    if (!acc[key]) acc[key] = {};
    return acc[key];
  }, obj);
  target[lastKey] = value;
}

/**
 * Resolve variables in template string
 * Supports {{key}}, {key}, and nested paths like {{form.amount}}
 */
export function resolveVariables(
  template: string,
  context: ExecutionContext,
  input: any
): string {
  if (!template) return template;

  // Support both {key} and {{key}} syntax
  return template.replace(/\{\{?([^{}]+)\}?\}|(\{[^{}]+\})/g, (match, p1, p2) => {
    const path = (p1 || p2 || match).replace(/^\{\{?/, '').replace(/\}?\}$/, '').trim();

    // Try to find in context.variables first
    const contextValue = getNestedValue(context.variables, path);
    if (contextValue !== undefined) {
      return String(contextValue);
    }

    // Then try input if path starts with input.
    if (path.startsWith('input.') && input) {
      const inputPath = path.replace('input.', '');
      const inputValue = getNestedValue(input, inputPath);
      if (inputValue !== undefined) {
        return String(inputValue);
      }
    }

    // Then try context. if path starts with context.
    if (path.startsWith('context.') && context.variables) {
      const contextPath = path.replace('context.', '');
      const contextValue = getNestedValue(context.variables, contextPath);
      if (contextValue !== undefined) {
        return String(contextValue);
      }
    }

    // Default to original match if not found
    return match;
  });
}

/**
 * Get step key for storing data in context
 */
export function getStepKey(step: { order: number; config: any }): string {
  const config = step.config as any;
  return config?.dataKey || `step_${step.order}`;
}
