# Errors

All API errors return HTTP `400`:

`ERR_INVALID_REQUEST_00` - Invalid request body, field type, network, recipient, meta, redirect URL, amount value, or amount change.

`ERR_INVALID_JSON_00` - Request body is not valid JSON.

`ERR_UNSUPPORTED_MEDIA_TYPE_00` - Request is missing `Content-Type: application/json`.

`ERR_PAYMENT_NOT_FOUND_00` - Payment identifier does not exist or expired.

`ERR_PAYMENT_RECORD_INVALID_00` - Payment data in Redis is invalid or incompatible.

`ERR_PAYMENT_IDENTIFIER_COLLISION_00` - Could not allocate a short payment identifier.

`ERR_SOL_PRICE_UNAVAILABLE_00` - SOL/USD price could not be fetched or parsed.

`ERR_REDIS_NOT_CONFIGURED_00` - `REDIS_URL` is missing.

`ERR_INTERNAL_SERVER_ERROR_00` - Unexpected server error.
