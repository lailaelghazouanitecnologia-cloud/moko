/**
 * Represents a testable code hypothesis in the system.
 * A hypothesis is an assumption about how code should behave,
 * validated through test cases and measured by confidence levels.
 */
export interface Hypothesis {
  /**
   * Unique identifier for this hypothesis
   */
  id: string;

  /**
   * Human-readable description of the hypothesis
   */
  description: string;

  /**
   * Test case used to validate this hypothesis
   */
  test: TestCase;

  /**
   * Confidence level in this hypothesis (0.0 to 1.0)
   */
  confidence: number;
}

/**
 * Test case used to validate a hypothesis
 */
export interface TestCase {
  /**
   * Unique identifier for the test case
   */
  id: string;

  /**
   * Name or title of the test
   */
  name: string;

  /**
   * Input parameters for the test
   */
  input: unknown;

  /**
   * Expected output or result
   */
  expectedOutput: unknown;

  /**
   * Actual output from running the test
   */
  actualOutput?: unknown;

  /**
   * Whether the test passed
   */
  passed?: boolean;

  /**
   * Error message if test failed
   */
  error?: string;

  /**
   * Test execution duration in milliseconds
   */
  duration?: number;
}

/**
 * Validates a hypothesis for correctness
 * @param hypothesis - The hypothesis to validate
 * @returns Validation result with any errors
 */
export function validateHypothesis(hypothesis: Hypothesis): ValidationResult {
  const errors: string[] = [];

  if (!hypothesis || typeof hypothesis !== 'object') {
    return { valid: false, errors: ['Hypothesis must be an object'] };
  }

  // Validate ID
  if (!hypothesis.id || typeof hypothesis.id !== 'string') {
    errors.push('Hypothesis ID must be a non-empty string');
  } else if (hypothesis.id.trim().length === 0) {
    hypothesis.id = hypothesis.id.trim();
    errors.push('Hypothesis ID cannot be empty or whitespace');
  }

  // Validate description
  if (!hypothesis.description || typeof hypothesis.description !== 'string') {
    errors.push('Hypothesis description must be a non-empty string');
  } else if (hypothesis.description.trim().length === 0) {
    hypothesis.description = hypothesis.description.trim();
    errors.push('Hypothesis description cannot be empty or whitespace');
  }

  // Validate test
  if (!hypothesis.test || typeof hypothesis.test !== 'object') {
    errors.push('Hypothesis test must be a valid TestCase object');
  } else {
    const testValidation = validateTestCase(hypothesis.test);
    if (!testValidation.valid) {
      errors.push(...testValidation.errors);
    }
  }

  // Validate confidence
  if (typeof hypothesis.confidence !== 'number') {
    errors.push('Hypothesis confidence must be a number');
  } else if (isNaN(hypothesis.confidence)) {
    errors.push('Hypothesis confidence cannot be NaN');
  } else if (hypothesis.confidence < 0 || hypothesis.confidence > 1) {
    errors.push('Hypothesis confidence must be between 0.0 and 1.0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates a test case for correctness
 * @param testCase - The test case to validate
 * @returns Validation result with any errors
 */
export function validateTestCase(testCase: TestCase): ValidationResult {
  const errors: string[] = [];

  if (!testCase || typeof testCase !== 'object') {
    return { valid: false, errors: ['TestCase must be an object'] };
  }

  // Validate ID
  if (!testCase.id || typeof testCase.id !== 'string') {
    errors.push('TestCase ID must be a non-empty string');
  } else if (testCase.id.trim().length === 0) {
    testCase.id = testCase.id.trim();
    errors.push('TestCase ID cannot be empty or whitespace');
  }

  // Validate name
  if (!testCase.name || typeof testCase.name !== 'string') {
    errors.push('TestCase name must be a non-empty string');
  } else if (testCase.name.trim().length === 0) {
    testCase.name = testCase.name.trim();
    errors.push('TestCase name cannot be empty or whitespace');
  }

  // Validate input (can be any type including undefined)
  if ('input' in testCase && testCase.input === undefined && !('input' in testCase)) {
    errors.push('TestCase must have an input property');
  }

  // Validate expected output (can be any type including undefined)
  if (!('expectedOutput' in testCase)) {
    errors.push('TestCase must have an expectedOutput property');
  }

  // Validate optional properties
  if (testCase.passed !== undefined && typeof testCase.passed !== 'boolean') {
    errors.push('TestCase passed must be a boolean if provided');
  }

  if (testCase.error !== undefined && typeof testCase.error !== 'string') {
    errors.push('TestCase error must be a string if provided');
  }

  if (testCase.duration !== undefined) {
    if (typeof testCase.duration !== 'number') {
      errors.push('TestCase duration must be a number if provided');
    } else if (testCase.duration < 0) {
      errors.push('TestCase duration cannot be negative');
    } else if (!isFinite(testCase.duration)) {
      errors.push('TestCase duration must be a finite number');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates a new hypothesis with validation
 * @param params - Parameters for creating the hypothesis
 * @returns The created hypothesis
 * @throws Error if validation fails
 */
export function createHypothesis(params: {
  id: string;
  description: string;
  test: TestCase;
  confidence: number;
}): Hypothesis {
  if (!params || typeof params !== 'object') {
    throw new Error('Hypothesis parameters must be an object');
  }

  const hypothesis: Hypothesis = {
    id: params.id,
    description: params.description,
    test: params.test,
    confidence: params.confidence
  };

  const validation = validateHypothesis(hypothesis);
  if (!validation.valid) {
    throw new Error(`Invalid hypothesis: ${validation.errors.join(', ')}`);
  }

  return hypothesis;
}

/**
 * Updates an existing hypothesis with new values
 * @param hypothesis - The hypothesis to update
 * @param updates - Properties to update
 * @returns Updated hypothesis
 * @throws Error if validation fails
 */
export function updateHypothesis(
  hypothesis: Hypothesis,
  updates: Partial<Omit<Hypothesis, 'id'>>
): Hypothesis {
  if (!hypothesis || typeof hypothesis !== 'object') {
    throw new Error('Hypothesis must be a valid object');
  }

  if (!updates || typeof updates !== 'object') {
    throw new Error('Updates must be a valid object');
  }

  const updated = { ...hypothesis };

  if (updates.description !== undefined) {
    updated.description = updates.description;
  }

  if (updates.test !== undefined) {
    updated.test = updates.test;
  }

  if (updates.confidence !== undefined) {
    updated.confidence = updates.confidence;
  }

  const validation = validateHypothesis(updated);
  if (!validation.valid) {
    throw new Error(`Updated hypothesis is invalid: ${validation.errors.join(', ')}`);
  }

  return updated;
}

/**
 * Creates a new test case with validation
 * @param params - Parameters for creating the test case
 * @returns The created test case
 * @throws Error if validation fails
 */
export function createTestCase(params: {
  id: string;
  name: string;
  input: unknown;
  expectedOutput: unknown;
  passed?: boolean;
  error?: string;
  duration?: number;
}): TestCase {
  if (!params || typeof params !== 'object') {
    throw new Error('TestCase parameters must be an object');
  }

  const testCase: TestCase = {
    id: params.id,
    name: params.name,
    input: params.input,
    expectedOutput: params.expectedOutput
  };

  if (params.passed !== undefined) {
    testCase.passed = params.passed;
  }

  if (params.error !== undefined) {
    testCase.error = params.error;
  }

  if (params.duration !== undefined) {
    testCase.duration = params.duration;
  }

  const validation = validateTestCase(testCase);
  if (!validation.valid) {
    throw new Error(`Invalid test case: ${validation.errors.join(', ')}`);
  }

  return testCase;
}

/**
 * Result of validation operation
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  valid: boolean;

  /**
   * Array of error messages if validation failed
   */
  errors: string[];
}

/**
 * Checks if two hypotheses are equal
 * @param a - First hypothesis
  * @param b - Second hypothesis
 * @returns Whether they are equal
 */
export function areHypothesesEqual(a: Hypothesis, b: Hypothesis): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  return (
    a.id === b.id &&
    a.description === b.description &&
    a.confidence === b.confidence &&
    areTestCasesEqual(a.test, b.test)
  );
}

/**
 * Checks if two test cases are equal
 * @param a - First test case
 * @param b - Second test case
 * @returns Whether they are equal
 */
export function areTestCasesEqual(a: TestCase, b: TestCase): boolean {
  if (!a || !b) return false;
  if (a === b) return true;

  return (
    a.id === b.id &&
    a.name === b.name &&
    JSON.stringify(a.input) === JSON.stringify(b.input) &&
    JSON.stringify(a.expectedOutput) === JSON.stringify(b.expectedOutput) &&
    a.passed === b.passed &&
    a.error === b.error &&
    a.duration === b.duration
  );
}

/**
 * Clones a hypothesis for immutability
 * @param hypothesis - Hypothesis to clone
 * @returns Cloned hypothesis
 */
export function cloneHypothesis(hypothesis: Hypothesis): Hypothesis {
  if (!hypothesis || typeof hypothesis !== 'object') {
    throw new Error('Hypothesis must be a valid object');
  }

  return {
    id: hypothesis.id,
    description: hypothesis.description,
    test: cloneTestCase(hypothesis.test),
    confidence: hypothesis.confidence
  };
}

/**
 * Clones a test case for immutability
 * @param testCase - Test case to clone
 * @returns Cloned test case
 */
export function cloneTestCase(testCase: TestCase): TestCase {
  if (!testCase || typeof testCase !== 'object') {
    throw new Error('TestCase must be a valid object');
  }

  return {
    id: testCase.id,
    name: testCase.name,
    input: JSON.parse(JSON.stringify(testCase.input)),
    expectedOutput: JSON.parse(JSON.stringify(testCase.expectedOutput)),
    actualOutput: testCase.actualOutput !== undefined ? JSON.parse(JSON.stringify(testCase.actualOutput)) : undefined,
    passed: testCase.passed,
    error: testCase.error,
    duration: testCase.duration
  };
}
