/**
 * NoSQL operator-injection guard. Removes any key that starts with "$" or contains "."
 * from the request body, query string and route params, at any depth, so a payload such as
 * {"productId": {"$ne": null}} can never reach a Mongo query as an operator.
 */
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !Buffer.isBuffer(v);

function clean(value, depth = 0) {
  if (depth > 10) return value;
  if (Array.isArray(value)) {
    value.forEach((v, i) => { value[i] = clean(v, depth + 1); });
    return value;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || key === '__proto__') {
        delete value[key];
      } else {
        value[key] = clean(value[key], depth + 1);
      }
    }
  }
  return value;
}

const sanitizeRequest = (req, res, next) => {
  if (req.body && !Buffer.isBuffer(req.body)) clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);
  next();
};

module.exports = sanitizeRequest;
module.exports.clean = clean;
