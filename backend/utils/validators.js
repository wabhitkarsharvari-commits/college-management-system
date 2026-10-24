const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  return typeof value === 'string' && value.length <= 120 && EMAIL_PATTERN.test(value.trim());
}

// Turns any input into a trimmed string with a length limit.
function cleanString(value, maxLength = 100) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, maxLength);
}

// Returns the list of required fields that are empty.
function missingFields(body, fields) {
  return fields.filter((field) => cleanString(body[field]) === '');
}

// At least 8 characters, with a letter and a number.
function isStrongPassword(value) {
  return (
    typeof value === 'string' &&
    value.length >= 8 &&
    value.length <= 72 &&
    /[A-Za-z]/.test(value) &&
    /[0-9]/.test(value)
  );
}

// Creates an error that the error handler turns into a clean reply.
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { isValidEmail, cleanString, missingFields, isStrongPassword, httpError };