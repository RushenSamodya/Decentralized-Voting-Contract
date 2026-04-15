function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg} | Expected: ${expected}, Actual: ${actual}`);
  }
}

function assertSuccessResponse(resp, msg) {
  if (!resp || !resp.success) {
    throw new Error(`Assertion failed: ${msg} | Expected success, got: ${JSON.stringify(resp)}`);
  }
}

function assertErrorResponse(resp, msg) {
  if (!resp || !resp.error) {
    throw new Error(`Assertion failed: ${msg} | Expected error, got: ${JSON.stringify(resp)}`);
  }
}

module.exports = { assertEqual, assertSuccessResponse, assertErrorResponse };
