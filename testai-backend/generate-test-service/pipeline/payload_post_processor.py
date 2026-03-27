import copy
import json
import random

class PayloadPostProcessor:
    """
    Post-processes model-generated test payloads to fix known issues.

    Responsibilities:
    1. Injects user-supplied headers (replacing model-generated ones)
    2. Handles AUTH tests: removes for non-auth endpoints, rebuilds from POSITIVE for auth endpoints
    3. Fixes category mismatches between requested and generated
    4. Validates and backfills pathParams
    5. Normalizes expectedStatus codes per category
    6. Detects and fixes MISSING_FIELDS tests that don't actually miss fields
    7. Detects cross-category semantic confusion (e.g., BOUNDARY looking like MISSING_FIELDS)
    8. Removes extra non-standard fields from output
    9. Deduplicates across categories
    10. Provides a needs_regeneration flag for tests that can't be fixed
    """

    # Standard fields that should appear in the final output
    ALLOWED_RESPONSE_FIELDS = {
        "name", "category", "pathParams", "payload",
        "headers", "requiresAuth", "expectedStatus"
    }

    # Categories that should produce error status codes (4xx)
    ERROR_CATEGORIES = {"WRONG_TYPE", "MISSING_FIELDS", "VALIDATION", "BOUNDARY"}

    def __init__(self, endpoint_config, user_headers=None):
        """
        Initialize the post-processor for a specific endpoint.

        Args:
            endpoint_config: The endpoint definition dict (method, path, schema, etc.)
            user_headers: Dict of headers the user wants injected into every test.
                          For auth endpoints, AUTH tests get empty headers {};
                          all other tests get these headers.
                          If None, defaults to {"Authorization": "Bearer valid_test_token"}
                          for auth endpoints.
        """
        self.endpoint = endpoint_config
        self.requires_auth = endpoint_config.get("requiresAuth", False)
        self.has_path_params = bool(endpoint_config.get("pathParams"))
        self.method = endpoint_config.get("method", "POST")
        self.schema = endpoint_config.get("schema", {})

        # Extract required field names from schema for validation
        self.required_fields = self._extract_required_fields()

        # User-supplied headers (what the real API consumer sends)
        if user_headers is not None:
            self.user_headers = user_headers
        elif self.requires_auth:
            self.user_headers = {"Authorization": "Bearer valid_test_token"}
        else:
            self.user_headers = {}

        # Will be populated during first pass
        self.positive_payload = None
        self.positive_path_params = None
        self.positive_response = None

    def _extract_required_fields(self):
        """
        Extract the set of required field names from the endpoint schema.
        Handles both dict schemas and array schemas (list of dicts).
        Used to verify MISSING_FIELDS tests actually omit required fields,
        and POSITIVE tests include all required fields.
        """
        schema = self.schema
        required = set()

        # Array schema: [{field_defs}]
        if isinstance(schema, list):
            if len(schema) > 0 and isinstance(schema[0], dict):
                schema = schema[0]
            else:
                return required

        # Dict schema with _isArray flag
        if isinstance(schema, dict) and schema.get("_isArray"):
            item_schema = schema.get("_itemSchema", {})
            for fname, fspec in item_schema.items():
                if isinstance(fspec, dict) and fspec.get("required"):
                    required.add(fname)
            return required

        # Dict schema with _isFormData flag
        if isinstance(schema, dict) and schema.get("_isFormData"):
            for fname, fspec in schema.items():
                if fname.startswith("_"):
                    continue
                if isinstance(fspec, dict) and fspec.get("required"):
                    required.add(fname)
            return required

        # Standard dict schema
        if isinstance(schema, dict):
            for fname, fspec in schema.items():
                if fname.startswith("_"):
                    continue
                if isinstance(fspec, dict) and fspec.get("required"):
                    required.add(fname)

        return required

    def _get_payload_fields(self, payload):
        """
        Get the set of field names present in a payload.
        For array payloads, inspects the first element.
        Returns empty set if payload is empty/None.
        """
        if payload is None:
            return set()
        if isinstance(payload, list):
            if len(payload) > 0 and isinstance(payload[0], dict):
                return set(payload[0].keys())
            return set()
        if isinstance(payload, dict):
            return set(payload.keys())
        return set()

    def _generate_valid_path_params(self):
        """
        Generate placeholder path parameter values based on the endpoint's
        pathParams definition. Uses appropriate types (int for integer params,
        string prefix for string params).
        """
        params = {}
        for pp in (self.endpoint.get("pathParams") or []):
            if pp["type"] == "integer":
                params[pp["name"]] = random.randint(1, 1000)
            else:
                params[pp["name"]] = f"valid_{pp['name']}"
        return params

    def _get_success_status(self):
        """
        Determine the correct HTTP success status based on method.
        POST typically returns 201 (created), PUT returns 200 (updated).
        Exception: POST to a path ending in {id} (e.g., POST /pet/{petId})
        is treated as an update -> 200.
        """
        path = self.endpoint.get("path", "")
        if self.method == "POST":
            # POST to /resource/{id} is typically an update, not a create
            path_parts = path.rstrip("/").split("/")
            if path_parts and path_parts[-1].startswith("{"):
                return 200
            return 201
        elif self.method == "PUT":
            return 200
        return 200

    def _ensure_path_params(self, resp):
        """
        Ensure pathParams exists and is properly populated.
        If the endpoint requires path params but the response doesn't have them
        (or has empty ones), backfill from the POSITIVE test or generate defaults.
        Also replaces any None values with empty strings.
        """
        if "pathParams" not in resp:
            resp["pathParams"] = {}

        if self.has_path_params:
            if not resp["pathParams"] or resp["pathParams"] == {}:
                if self.positive_path_params:
                    resp["pathParams"] = copy.deepcopy(self.positive_path_params)
                else:
                    resp["pathParams"] = self._generate_valid_path_params()

            # Ensure all expected path params are present
            expected_params = {pp["name"] for pp in (self.endpoint.get("pathParams") or [])}
            for param_name in expected_params:
                if param_name not in resp["pathParams"]:
                    # Find the type from the definition
                    param_def = next(
                        (pp for pp in self.endpoint.get("pathParams", []) if pp["name"] == param_name),
                        None
                    )
                    if param_def and param_def.get("type") == "integer":
                        resp["pathParams"][param_name] = random.randint(1, 1000)
                    else:
                        resp["pathParams"][param_name] = f"valid_{param_name}"

        # Replace None values
        for k, v in list(resp["pathParams"].items()):
            if v is None:
                resp["pathParams"][k] = ""

        return resp

    def _inject_headers(self, resp, include_auth=True):
        """
        Replace the response's headers with user-supplied headers.
        For AUTH tests (include_auth=False), always sets headers to {}.
        For all other tests on auth endpoints, uses user_headers.
        For non-auth endpoints, uses user_headers (which may be empty or contain
        custom headers like Content-Type, API keys, etc.).
        """
        if include_auth:
            resp["headers"] = copy.deepcopy(self.user_headers)
        else:
            # AUTH test: explicitly empty to simulate missing credentials
            resp["headers"] = {}
        return resp

    def _build_auth_test_from_positive(self):
        """
        Create a proper AUTH test by cloning the POSITIVE response.
        The AUTH test should have:
        - Valid payload (identical to POSITIVE)
        - Valid pathParams (identical to POSITIVE)
        - Empty headers {} (simulating no auth)
        - expectedStatus 401
        - requiresAuth matching endpoint config
        Returns None if no POSITIVE response is available.
        """
        if not self.positive_response:
            return None

        auth_test = copy.deepcopy(self.positive_response)
        auth_test["category"] = "AUTH"
        auth_test["expectedStatus"] = 401
        auth_test["requiresAuth"] = self.requires_auth
        auth_test["headers"] = {}

        # Update the name to reflect AUTH purpose
        old_name = auth_test.get("name", "")
        desc = self.endpoint.get("description", "Test")
        auth_test["name"] = f"{desc} - No authentication token"

        return auth_test

    def _is_payload_empty_or_trivial(self, payload):
        """
        Check if a payload is effectively empty (None, {}, or []).
        Used to detect MISSING_FIELDS-style payloads appearing in other categories.
        """
        if payload is None:
            return True
        if isinstance(payload, dict) and len(payload) == 0:
            return True
        if isinstance(payload, list) and len(payload) == 0:
            return True
        return False

    def _check_missing_fields_validity(self, payload):
        """
        Check if a MISSING_FIELDS payload actually has fields missing.
        Returns (is_valid, missing_set, present_set).
        A valid MISSING_FIELDS test should:
        - Not be completely empty (that's too trivial but acceptable)
        - OR have at least one required field missing
        """
        if self._is_payload_empty_or_trivial(payload):
            # Empty payload = all fields missing. Valid but lazy.
            return True, self.required_fields, set()

        present = self._get_payload_fields(payload)
        missing = self.required_fields - present
        # Valid if at least one required field is actually missing
        return len(missing) > 0, missing, present

    def _check_wrong_type_has_wrong_types(self, payload):
        """
        Heuristic check: does a WRONG_TYPE payload actually contain any wrong types?
        Looks for values that are bool where string/number expected, arrays where
        scalar expected, strings where numbers expected, etc.
        Returns True if at least one suspicious type mismatch is found.
        """
        if self._is_payload_empty_or_trivial(payload):
            return False

        # Get the actual payload dict (first element if array)
        check_dict = payload
        if isinstance(payload, list) and len(payload) > 0:
            check_dict = payload[0]

        if not isinstance(check_dict, dict):
            return False

        schema_fields = self.schema
        if isinstance(schema_fields, list) and len(schema_fields) > 0:
            schema_fields = schema_fields[0]
        if isinstance(schema_fields, dict) and schema_fields.get("_isArray"):
            schema_fields = schema_fields.get("_itemSchema", {})
        if isinstance(schema_fields, dict) and schema_fields.get("_isFormData"):
            schema_fields = {k: v for k, v in schema_fields.items() if not k.startswith("_")}

        for field_name, value in check_dict.items():
            if field_name in schema_fields and isinstance(schema_fields[field_name], dict):
                expected_type = schema_fields[field_name].get("type", "")
                # Check for obvious type mismatches
                if expected_type in ("string",) and isinstance(value, bool):
                    return True
                if expected_type in ("integer", "number") and isinstance(value, (str, bool, list)):
                    return True
                if expected_type in ("string",) and isinstance(value, list):
                    return True
                if expected_type in ("boolean",) and isinstance(value, str):
                    return True

        return False

    def _remove_extra_fields(self, resp):
        """
        Remove non-standard fields from the response that the model sometimes adds.
        Examples: "type", "contentType" — these aren't part of our output schema.
        Only keeps fields in ALLOWED_RESPONSE_FIELDS.
        """
        extra_keys = set(resp.keys()) - self.ALLOWED_RESPONSE_FIELDS
        for key in extra_keys:
            del resp[key]
        return resp

    def _fix_boundary_empty_payload(self, resp):
        """
        If a BOUNDARY test has an empty payload (identical to a MISSING_FIELDS test),
        attempt to create a real boundary payload by cloning POSITIVE and modifying
        one field to its boundary value.
        Returns (fixed_resp, was_fixed).
        """
        if not self._is_payload_empty_or_trivial(resp.get("payload")):
            return resp, False

        if not self.positive_payload:
            return resp, False

        # Clone the POSITIVE payload and set one field to a boundary value
        boundary_payload = copy.deepcopy(self.positive_payload)

        schema_fields = self.schema
        if isinstance(schema_fields, list) and len(schema_fields) > 0:
            schema_fields = schema_fields[0]
        if isinstance(schema_fields, dict) and schema_fields.get("_isArray"):
            schema_fields = schema_fields.get("_itemSchema", {})
        if isinstance(schema_fields, dict) and schema_fields.get("_isFormData"):
            schema_fields = {k: v for k, v in schema_fields.items() if not k.startswith("_")}

        # Try to find a field with a maxLength or maximum constraint
        modified = False
        target = boundary_payload
        if isinstance(boundary_payload, list) and len(boundary_payload) > 0:
            target = boundary_payload[0]

        if isinstance(target, dict) and isinstance(schema_fields, dict):
            for fname, fspec in schema_fields.items():
                if not isinstance(fspec, dict):
                    continue
                if fname not in target:
                    continue

                if fspec.get("maxLength"):
                    # Set value exceeding maxLength
                    max_len = fspec["maxLength"]
                    target[fname] = "A" * (max_len + 10)
                    modified = True
                    resp["name"] = f"{self.endpoint.get('description', '')} - {fname} exceeds maxLength ({max_len})"
                    break
                elif fspec.get("maximum") is not None:
                    # Set value exceeding maximum
                    maximum = fspec["maximum"]
                    target[fname] = maximum + 1
                    modified = True
                    resp["name"] = f"{self.endpoint.get('description', '')} - {fname} exceeds maximum ({maximum})"
                    break
                elif fspec.get("minimum") is not None:
                    # Set value below minimum
                    minimum = fspec["minimum"]
                    target[fname] = minimum - 1
                    modified = True
                    resp["name"] = f"{self.endpoint.get('description', '')} - {fname} below minimum ({minimum})"
                    break

        if modified:
            resp["payload"] = boundary_payload
            return resp, True

        return resp, False

    def _fix_missing_fields_all_present(self, resp):
        """
        If a MISSING_FIELDS test has all required fields present in the payload,
        fix it by removing one required field.
        Returns (fixed_resp, was_fixed).
        """
        payload = resp.get("payload")
        is_valid, missing, present = self._check_missing_fields_validity(payload)

        if is_valid:
            return resp, False  # Already valid

        if not self.required_fields:
            return resp, False  # No required fields defined in schema

        # All required fields are present — remove one
        field_to_remove = None
        target = payload
        if isinstance(payload, list) and len(payload) > 0:
            target = payload[0]

        if isinstance(target, dict):
            for field in self.required_fields:
                if field in target:
                    field_to_remove = field
                    break

        if field_to_remove and isinstance(target, dict):
            del target[field_to_remove]
            resp["name"] = f"{self.endpoint.get('description', '')} - Missing required field: {field_to_remove}"
            return resp, True

        return resp, False

    def _validate_category_payload_consistency(self, resp, category):
        """
        Perform semantic validation of a payload against its claimed category.
        Returns a list of warnings and a boolean indicating if the test needs regeneration.
        Checks:
        - POSITIVE: should have all required fields, non-empty payload
        - MISSING_FIELDS: should actually be missing at least one required field
        - WRONG_TYPE: should have at least one type mismatch
        - BOUNDARY: should not be empty (that's MISSING_FIELDS)
        - AUTH: should have valid payload (clone of POSITIVE)
        - VALIDATION: should not look identical to WRONG_TYPE
        """
        warnings = []
        needs_regen = False
        payload = resp.get("payload")

        if category == "POSITIVE":
            if self._is_payload_empty_or_trivial(payload):
                warnings.append("POSITIVE test has empty payload")
                needs_regen = True

        elif category == "BOUNDARY":
            if self._is_payload_empty_or_trivial(payload):
                warnings.append("BOUNDARY test has empty payload (looks like MISSING_FIELDS)")

        elif category == "AUTH":
            if self._is_payload_empty_or_trivial(payload) and self.requires_auth:
                warnings.append("AUTH test has empty payload (should have valid body)")

        elif category == "MISSING_FIELDS":
            if self.required_fields and not self._is_payload_empty_or_trivial(payload):
                is_valid, missing, present = self._check_missing_fields_validity(payload)
                if not is_valid:
                    warnings.append(
                        f"MISSING_FIELDS test has all required fields present: "
                        f"{self.required_fields & present}"
                    )

        elif category == "WRONG_TYPE":
            if not self._is_payload_empty_or_trivial(payload):
                if not self._check_wrong_type_has_wrong_types(payload):
                    warnings.append("WRONG_TYPE test may not have actual type mismatches")

        elif category == "VALIDATION":
            # Check if it looks more like WRONG_TYPE (array/bool where scalar expected)
            if not self._is_payload_empty_or_trivial(payload):
                if self._check_wrong_type_has_wrong_types(payload):
                    warnings.append("VALIDATION test contains wrong-type values (may be confused with WRONG_TYPE)")

        return warnings, needs_regen

    def process_all(self, results_for_endpoint):
        """
        Process all generated results for a single endpoint.
        Two-pass approach:
        1. First pass: find the POSITIVE test to use as reference
        2. Second pass: fix each test, inject headers, validate consistency

        Args:
            results_for_endpoint: List of result dicts with keys:
                endpoint, category, response (dict or str), valid (bool)

        Returns:
            List of fixed result dicts. AUTH tests for non-auth endpoints are removed.
            Each result gets a '_warnings' list and optional '_needs_regeneration' flag.
        """
        # === First pass: find POSITIVE payload ===
        for r in results_for_endpoint:
            if r.get("valid") and isinstance(r.get("response"), dict):
                if r["response"].get("category") == "POSITIVE":
                    self.positive_response = copy.deepcopy(r["response"])
                    self.positive_payload = copy.deepcopy(r["response"].get("payload"))
                    self.positive_path_params = copy.deepcopy(r["response"].get("pathParams", {}))
                    break

        # === Second pass: fix each result ===
        fixed = []
        seen_payloads = {}  # For cross-category dedup: payload_hash -> (category, name)

        for r in results_for_endpoint:
            if not r.get("valid") or not isinstance(r.get("response"), dict):
                # Invalid JSON — mark for regeneration
                r["_warnings"] = ["Invalid JSON - could not parse"]
                r["_needs_regeneration"] = True
                fixed.append(r)
                continue

            resp = r["response"]
            requested_cat = r["category"]
            warnings = []

            # --- Fix 1: Force category to match request ---
            if resp.get("category") != requested_cat:
                warnings.append(
                    f"Category mismatch: model said '{resp.get('category')}', "
                    f"forced to '{requested_cat}'"
                )
                resp["category"] = requested_cat

            # --- Fix 2: Set requiresAuth from endpoint config ---
            resp["requiresAuth"] = self.requires_auth

            # --- Fix 3: AUTH handling ---
            if requested_cat == "AUTH":
                if not self.requires_auth:
                    # Endpoint doesn't need auth — AUTH test is meaningless, skip it
                    warnings.append("AUTH test removed: endpoint does not require authentication")
                    r["_skipped"] = True
                    r["_skip_reason"] = "AUTH test for non-authenticated endpoint"
                    r["_warnings"] = warnings
                    # Don't append to fixed — effectively removes it
                    continue
                else:
                    # Rebuild AUTH test from POSITIVE clone for consistency
                    proper_auth = self._build_auth_test_from_positive()
                    if proper_auth:
                        resp = proper_auth
                        warnings.append("AUTH test rebuilt from POSITIVE clone")
                    else:
                        # No POSITIVE found — fix what we can
                        resp["expectedStatus"] = 401
                        resp = self._inject_headers(resp, include_auth=False)
                        if self._is_payload_empty_or_trivial(resp.get("payload")):
                            warnings.append("AUTH test has empty payload and no POSITIVE to clone from")
                            r["_needs_regeneration"] = True

            # --- Fix 4: Header injection for non-AUTH tests ---
            elif requested_cat == "AUTH":
                pass  # Already handled above
            else:
                resp = self._inject_headers(resp, include_auth=True)

            # --- Fix 5: Ensure pathParams are present and complete ---
            resp = self._ensure_path_params(resp)

            # --- Fix 6: Normalize expectedStatus ---
            if requested_cat == "POSITIVE":
                resp["expectedStatus"] = self._get_success_status()
            elif requested_cat == "AUTH":
                resp["expectedStatus"] = 401
            elif requested_cat in self.ERROR_CATEGORIES:
                status = resp.get("expectedStatus")
                # Any 2xx status is wrong for error categories
                if status is not None and 200 <= status < 300:
                    resp["expectedStatus"] = 400
                    warnings.append(f"Fixed success status {status} to 400 for {requested_cat} test")
                # 401 is also wrong for non-AUTH error tests
                elif status == 401 and requested_cat != "AUTH":
                    resp["expectedStatus"] = 400
                    warnings.append(f"Fixed 401 to 400 for {requested_cat} test (401 is for AUTH)")

            # --- Fix 7: Fix MISSING_FIELDS tests that have all fields ---
            if requested_cat == "MISSING_FIELDS":
                resp, was_fixed = self._fix_missing_fields_all_present(resp)
                if was_fixed:
                    warnings.append("Fixed MISSING_FIELDS: removed a required field that was present")

            # --- Fix 8: Fix BOUNDARY tests with empty payloads ---
            if requested_cat == "BOUNDARY":
                resp, was_fixed = self._fix_boundary_empty_payload(resp)
                if was_fixed:
                    warnings.append("Fixed BOUNDARY: generated boundary payload from POSITIVE clone")
                elif self._is_payload_empty_or_trivial(resp.get("payload")):
                    r["_needs_regeneration"] = True

            # --- Fix 9: Validate payload-category semantic consistency ---
            consistency_warnings, needs_regen = self._validate_category_payload_consistency(
                resp, requested_cat
            )
            warnings.extend(consistency_warnings)
            if needs_regen:
                r["_needs_regeneration"] = True

            # --- Fix 10: Remove extra non-standard fields ---
            resp = self._remove_extra_fields(resp)

            # --- Fix 11: Cross-category dedup check ---
            payload_str = json.dumps(resp.get("payload"), sort_keys=True)
            if payload_str in seen_payloads:
                prev_cat, prev_name = seen_payloads[payload_str]
                warnings.append(
                    f"Duplicate payload detected (same as {prev_cat} test "
                    f"'{prev_name}')"
                )
            else:
                seen_payloads[payload_str] = (requested_cat, resp.get("name", "unknown"))

            r["response"] = resp
            r["_warnings"] = warnings
            fixed.append(r)

        return fixed