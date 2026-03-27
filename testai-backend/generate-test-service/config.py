import os

# Model paths – adjust as needed
BASE_MODEL_PATH = os.getenv("BASE_MODEL_PATH", "./base-model")
ADAPTER_PATH   = os.getenv("ADAPTER_PATH",   "./put-post-adapter")

# Generation settings
MAX_SEQ_LENGTH = 2048
SYSTEM_PROMPT = """
You generate API test payloads for REST endpoints.

Return ONLY valid JSON with this exact structure:
{
  "name": "string",
  "category": "POSITIVE | AUTH | WRONG_TYPE | MISSING_FIELDS | VALIDATION | BOUNDARY",
  "pathParams": {},
  "payload": {},
  "headers": {},
  "requiresAuth": boolean,
  "expectedStatus": number
}

Rules:
- pathParams must contain values for URL path parameters if the endpoint includes them.
- payload contains the request body fields.
- If the endpoint has no path parameters, return an empty object for pathParams.
- headers contains request headers. For endpoints requiring authentication, include {"Authorization": "Bearer valid_test_token"} for all categories except AUTH. For AUTH category tests, use empty headers {} to simulate missing credentials.
- If the endpoint does not require authentication, headers should be empty {} or omitted.
- If the request body schema is an array (shown as "schema": [{ ... }]), the payload must be a JSON array of objects.
- If the content type is multipart/form-data, payload fields represent form fields. File fields use descriptive placeholder strings like "(binary file: image.jpg)" or "(empty file)".

Do not include explanations. Do not include text outside the JSON object.
"""

CATEGORIES = ["POSITIVE", "AUTH", "WRONG_TYPE", "MISSING_FIELDS", "VALIDATION", "BOUNDARY"]

# Prompt variations matching training data generator
PROMPT_VARIATIONS = {
    "POSITIVE": [
        "Generate a valid API request payload.",
        "Create a successful request payload.",
        "Produce a correct payload for this endpoint.",
        "Generate a valid test payload."
    ],
    "AUTH": [
        "Generate a payload that tests authentication.",
        "Create an authentication failure test payload.",
        "Produce a request payload related to authentication.",
        "Generate a payload to test authorization behavior."
    ],
    "WRONG_TYPE": [
        "Generate a payload using incorrect field types.",
        "Create a payload with wrong data types.",
        "Produce a request payload with invalid types.",
        "Generate a payload where some fields use the wrong type."
    ],
    "MISSING_FIELDS": [
        "Generate a payload missing required fields.",
        "Create a request payload with missing parameters.",
        "Produce a payload missing mandatory inputs.",
        "Generate a request missing required fields."
    ],
    "VALIDATION": [
        "Generate a payload that violates validation rules.",
        "Create an input validation failure payload.",
        "Produce a payload that breaks input constraints.",
        "Generate a request payload that fails validation."
    ],
    "BOUNDARY": [
        "Generate a boundary value payload.",
        "Create a payload testing edge values.",
        "Produce a payload using limit values.",
        "Generate a payload testing boundary conditions."
    ]
}

# Default headers to inject (used for non‑AUTH tests on authenticated endpoints)
DEFAULT_HEADERS = {"Authorization": "Bearer valid_test_token"}

def set_default_headers(headers):
    global DEFAULT_HEADERS
    DEFAULT_HEADERS = headers