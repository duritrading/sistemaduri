// src/utils/defensive.ts - Pattern para prevenir undefined errors
export const safeAccess = {
  // Safe array access with default empty array
  array: <T>(arr: T[] | undefined | null): T[] => {
    return Array.isArray(arr) ? arr : [];
  },

  // Safe object access with default empty object  
  object: <T>(obj: T | undefined | null): T => {
    return obj || ({} as T);
  },

  // Safe string access with fallback
  string: (str: string | undefined | null, fallback: string = ''): string => {
    return str || fallback;
  },

  // Safe number access with fallback
  number: (num: number | undefined | null, fallback: number = 0): number => {
    return typeof num === 'number' && !isNaN(num) ? num : fallback;
  },

  // Safe property access with optional chaining
  property: <T, K extends keyof T>(obj: T | undefined | null, key: K): T[K] | undefined => {
    return obj?.[key];
  }
};

// Component prop validators
export const validateProps = {
  // Validate array prop with type safety
  arrayProp: <T>(prop: T[] | undefined, componentName: string, propName: string): T[] => {
    if (!Array.isArray(prop)) {
      console.warn(`${componentName}: ${propName} prop should be an array, received:`, typeof prop);
      return [];
    }
    return prop;
  },

  // Validate required prop
  requiredProp: <T>(prop: T | undefined, componentName: string, propName: string): T => {
    if (prop === undefined || prop === null) {
      throw new Error(`${componentName}: ${propName} is required but was not provided`);
    }
    return prop;
  }
};

// Usage example in components:
// const processes = safeAccess.array(trackings);
// const trackingLength = processes.length; // Never throws undefined error