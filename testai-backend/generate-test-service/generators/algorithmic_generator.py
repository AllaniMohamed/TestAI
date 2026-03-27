import random
from faker import Faker
from generators.base import BaseGenerator

fake = Faker()
Faker.seed(42)
random.seed(42)

# ─────────────────────────────────────────────────────────
# SMART VALUE GENERATORS
# ─────────────────────────────────────────────────────────

NAME_GENERATORS = {
    "id":           lambda p: random.randint(1, 9999),
    "petid":        lambda p: random.randint(1, 999),
    "orderid":      lambda p: random.randint(1, 100),
    "userid":       lambda p: random.randint(1, 5000),
    "username":     lambda p: fake.user_name(),
    "email":        lambda p: fake.email(),
    "password":     lambda p: fake.password(length=12),
    "phone":        lambda p: fake.phone_number(),
    "firstname":    lambda p: fake.first_name(),
    "lastname":     lambda p: fake.last_name(),
    "name":         lambda p: fake.name(),
    "status":       lambda p: random.choice(["available", "pending", "sold"]),
    "tags":         lambda p: fake.word(),
    "tag":          lambda p: fake.word(),
    "date":         lambda p: fake.date(),
    "zipcode":      lambda p: fake.zipcode(),
    "city":         lambda p: fake.city(),
    "country":      lambda p: fake.country_code(),
    "address":      lambda p: fake.street_address(),
    "title":        lambda p: fake.sentence(nb_words=4),
    "description":  lambda p: fake.sentence(nb_words=8),
    "url":          lambda p: fake.url(),
    "color":        lambda p: fake.color_name(),
    "price":        lambda p: round(random.uniform(1.0, 999.99), 2),
    "quantity":     lambda p: random.randint(1, 50),
    "count":        lambda p: random.randint(1, 100),
    "page":         lambda p: random.randint(1, 20),
    "limit":        lambda p: random.randint(10, 100),
    "offset":       lambda p: random.randint(0, 500),
    "sort":         lambda p: random.choice(["asc", "desc"]),
    "search":       lambda p: fake.word(),
    "query":        lambda p: fake.word(),
    "q":            lambda p: fake.word(),
    "token":        lambda p: fake.sha256()[:32],
    "key":          lambda p: fake.sha256()[:16],
    "apikey":       lambda p: fake.sha256()[:32],
    "api_key":      lambda p: fake.sha256()[:32],
    "category":     lambda p: fake.word(),
    "type":         lambda p: fake.word(),
    "lang":         lambda p: random.choice(["en", "fr", "es", "de"]),
    "language":     lambda p: random.choice(["en", "fr", "es", "de"]),
    "locale":       lambda p: random.choice(["en_US", "fr_FR", "es_ES"]),
    "currency":     lambda p: random.choice(["USD", "EUR", "GBP"]),
    "version":      lambda p: random.choice(["v1", "v2", "v3"]),
    "format":       lambda p: random.choice(["json", "xml"]),
    "size":         lambda p: random.choice(["S", "M", "L", "XL"]),
    "weight":       lambda p: round(random.uniform(0.1, 100.0), 2),
    "latitude":     lambda p: round(random.uniform(-90, 90), 6),
    "longitude":    lambda p: round(random.uniform(-180, 180), 6),
    "lat":          lambda p: round(random.uniform(-90, 90), 6),
    "lng":          lambda p: round(random.uniform(-180, 180), 6),
    "lon":          lambda p: round(random.uniform(-180, 180), 6),
}


def generate_valid_value(param):
    """Generate a realistic valid value based on param name, type, enum, and constraints."""
    name = param.get("name", "").lower().replace("-", "").replace("_", "")
    ptype = param.get("type", "string")
    enum = param.get("enum")
    items = param.get("items")
    minimum = param.get("minimum")
    maximum = param.get("maximum")

    if enum:
        return random.choice(enum)

    if items and isinstance(items, list) and len(items) > 0:
        item_schema = items[0]
        if item_schema.get("enum"):
            return random.choice(item_schema["enum"])
        item_type = item_schema.get("type", "string")
        if item_type == "integer":
            return random.randint(1, 100)
        return fake.word()

    for pattern, gen_fn in NAME_GENERATORS.items():
        if pattern in name:
            val = gen_fn(param)
            if ptype == "integer" and isinstance(val, str):
                return random.randint(1, 9999)
            if ptype == "string" and isinstance(val, (int, float)):
                return str(val)
            return val

    if ptype == "integer":
        lo = minimum if minimum is not None else 1
        hi = maximum if maximum is not None else 9999
        return random.randint(int(lo), int(hi))
    elif ptype == "number":
        lo = minimum if minimum is not None else 0.01
        hi = maximum if maximum is not None else 9999.99
        return round(random.uniform(float(lo), float(hi)), 2)
    elif ptype == "boolean":
        return random.choice([True, False])
    else:
        return fake.word()


def generate_wrong_type_value(param):
    """Generate a value of the WRONG type for the param."""
    ptype = param.get("type", "string")
    if ptype == "integer":
        return random.choice(["not_a_number", "abc", "twelve", "$$invalid", True])
    elif ptype == "number":
        return random.choice(["NaN", "not_numeric", "abc", False])
    elif ptype == "boolean":
        return random.choice(["maybe", 42, "notbool", 3.14])
    elif ptype == "string":
        return random.choice([99999, True, -1, 3.14159])
    else:
        return "!!!WRONG!!!"


def generate_validation_value(param):
    """Generate an invalid value that violates enum, format, or range constraints."""
    enum = param.get("enum")
    items = param.get("items")
    ptype = param.get("type", "string")
    minimum = param.get("minimum")
    maximum = param.get("maximum")

    if enum:
        return "INVALID_ENUM_VALUE_" + fake.lexify("???")

    if items and isinstance(items, list) and len(items) > 0:
        if items[0].get("enum"):
            return "INVALID_ENUM_" + fake.lexify("???")

    if ptype in ("integer", "number"):
        if minimum is not None:
            return minimum - random.randint(1, 100)
        if maximum is not None:
            return maximum + random.randint(1, 100)
        return -99999

    name_lower = param.get("name", "").lower()
    if "email" in name_lower:
        return "not-an-email"
    if "url" in name_lower or "link" in name_lower:
        return "not a url at all"
    if "phone" in name_lower:
        return "not-a-phone"
    if "date" in name_lower:
        return "32-13-2099"
    if "zip" in name_lower:
        return "ZZZZZ"

    return "<script>alert('xss')</script>"


def generate_boundary_value(param):
    """Generate boundary/edge-case values."""
    ptype = param.get("type", "string")
    minimum = param.get("minimum")
    maximum = param.get("maximum")
    max_length = param.get("maxLength")
    min_length = param.get("minLength")

    if ptype == "integer":
        choices = []
        if minimum is not None:
            choices.extend([minimum, minimum - 1])
        else:
            choices.extend([0, -1])
        if maximum is not None:
            choices.extend([maximum, maximum + 1])
        else:
            choices.extend([2147483647, -2147483648])
        return random.choice(choices)

    elif ptype == "number":
        choices = []
        if minimum is not None:
            choices.extend([minimum, minimum - 0.001])
        else:
            choices.extend([0.0, -0.001])
        if maximum is not None:
            choices.extend([maximum, maximum + 0.001])
        else:
            choices.extend([9999999.99, -9999999.99])
        return random.choice(choices)

    elif ptype == "string":
        choices = [
            "",
            " ",
            "a" * (max_length + 10 if max_length else 10000),
        ]
        if min_length and min_length > 1:
            choices.append("a" * (min_length - 1))
        return random.choice(choices)

    elif ptype == "boolean":
        return random.choice([None, "", 0, 1, "true", "false"])

    return None


# ─────────────────────────────────────────────────────────
# STATUS CODE RESOLUTION
# ─────────────────────────────────────────────────────────

def resolve_expected_status(category, method, has_required_path, has_required_query,
                            missing_path_params=False, missing_query_params=False):
    """
    Determine the expected HTTP status code based on test category and context.

    Logic:
      POSITIVE     → 200 (GET) / 200 or 204 (DELETE)
      AUTH         → 401
      WRONG_TYPE   → 400 (query issues) / 404 (path issues, route won't match)
      MISSING_FIELDS:
        - missing required path param  → 404 (route doesn't match)
        - missing required query param → 400 (bad request)
        - both missing                 → 404 (path takes precedence)
      VALIDATION   → 400 (path = numeric out of range → could be 404 for not found)
                     422 (query semantic violations)
      BOUNDARY:
        - path params with extreme IDs → 404 (resource not found)
        - query params with extremes   → 400 (bad request)
        - both                         → 404 (path takes precedence)
    """
    if category == "POSITIVE":
        if method == "DELETE":
            return 200
        return 200

    if category == "AUTH":
        return 401

    if category == "WRONG_TYPE":
        # If path params have wrong types, the route itself likely 404s
        if has_required_path:
            return 400
        return 400

    if category == "MISSING_FIELDS":
        if missing_path_params:
            return 404
        if missing_query_params:
            return 400
        return 400

    if category == "VALIDATION":
        # Path param with invalid value (e.g., negative ID) → resource not found
        if has_required_path:
            return 404
        return 422

    if category == "BOUNDARY":
        # Extreme path param values (e.g., petId=2147483647) → resource not found
        if has_required_path:
            return 404
        return 400

    return 400


# ─────────────────────────────────────────────────────────
# AUTH HEADER GENERATION
# ─────────────────────────────────────────────────────────

def generate_auth_header():
    """Generate a realistic auth header."""
    return {
        "Authorization": f"Bearer {fake.sha256()[:64]}"
    }


# ─────────────────────────────────────────────────────────
# CORE TEST GENERATORS
# ─────────────────────────────────────────────────────────

def build_params_dict(params_list, value_fn):
    """Build {name: value} dict from a params list using the given value function."""
    result = {}
    for p in params_list:
        result[p["name"]] = value_fn(p)
    return result


def generate_tests_for_endpoint(endpoint):
    """Generate all applicable test cases for a single GET/DELETE endpoint."""
    method = endpoint["method"]
    path = endpoint["path"]
    description = endpoint.get("description", "")
    requires_auth = endpoint.get("requiresAuth", False)
    path_params = endpoint.get("pathParams", [])
    query_params = endpoint.get("queryParams", [])

    all_params = path_params + query_params
    required_path = [p for p in path_params if p.get("required")]
    required_query = [p for p in query_params if p.get("required")]
    has_required_path = len(required_path) > 0
    has_required_query = len(required_query) > 0
    has_params = len(all_params) > 0

    tests = []

    # ─── 1. POSITIVE ───
    status = resolve_expected_status("POSITIVE", method, has_required_path, has_required_query)
    test_positive = {
        "endpoint": f"{method} {path}",
        "category": "POSITIVE",
        "response": {
            "name": f"{description} - Valid request with all correct parameters",
            "category": "POSITIVE",
            "expectedStatus": status,
            "pathParams": build_params_dict(path_params, generate_valid_value),
            "queryParams": build_params_dict(query_params, generate_valid_value),
        }
    }
    if requires_auth:
        test_positive["response"]["headers"] = generate_auth_header()
    tests.append(test_positive)

    # ─── 2. AUTH (skip if requiresAuth=false) ───
    if requires_auth:
        status = resolve_expected_status("AUTH", method, has_required_path, has_required_query)
        test_auth = {
            "endpoint": f"{method} {path}",
            "category": "AUTH",
            "response": {
                "name": f"{description} - Missing authentication credentials",
                "category": "AUTH",
                "expectedStatus": status,
                "pathParams": build_params_dict(path_params, generate_valid_value),
                "queryParams": build_params_dict(query_params, generate_valid_value),
                "headers": {}
            }
        }
        tests.append(test_auth)

    # ─── 3. WRONG_TYPE ───
    if has_params:
        status = resolve_expected_status("WRONG_TYPE", method, has_required_path, has_required_query)

        wrong_path = {}
        for p in path_params:
            wrong_path[p["name"]] = generate_wrong_type_value(p)

        wrong_query = {}
        for p in query_params:
            wrong_query[p["name"]] = generate_wrong_type_value(p)

        test_wrong = {
            "endpoint": f"{method} {path}",
            "category": "WRONG_TYPE",
            "response": {
                "name": f"{description} - Parameters with incorrect data types",
                "category": "WRONG_TYPE",
                "expectedStatus": status,
                "pathParams": wrong_path,
                "queryParams": wrong_query,
            }
        }
        if requires_auth:
            test_wrong["response"]["headers"] = generate_auth_header()
        tests.append(test_wrong)

    # ─── 4. MISSING_FIELDS ───
    if required_path or required_query:
        missing_path_flag = len(required_path) > 0
        missing_query_flag = len(required_query) > 0

        status = resolve_expected_status(
            "MISSING_FIELDS", method, has_required_path, has_required_query,
            missing_path_params=missing_path_flag,
            missing_query_params=missing_query_flag
        )

        missing_path = {}
        for p in path_params:
            if not p.get("required"):
                missing_path[p["name"]] = generate_valid_value(p)

        missing_query = {}
        for p in query_params:
            if not p.get("required"):
                missing_query[p["name"]] = generate_valid_value(p)

        omitted_names = [p["name"] for p in required_path + required_query]

        test_missing = {
            "endpoint": f"{method} {path}",
            "category": "MISSING_FIELDS",
            "response": {
                "name": f"{description} - Required parameters omitted: {', '.join(omitted_names)}",
                "category": "MISSING_FIELDS",
                "expectedStatus": status,
                "pathParams": missing_path,
                "queryParams": missing_query,
            }
        }
        if requires_auth:
            test_missing["response"]["headers"] = generate_auth_header()
        tests.append(test_missing)

    # ─── 5. VALIDATION ───
    if has_params:
        status = resolve_expected_status("VALIDATION", method, has_required_path, has_required_query)

        validation_path = {}
        for p in path_params:
            validation_path[p["name"]] = generate_validation_value(p)

        validation_query = {}
        for p in query_params:
            validation_query[p["name"]] = generate_validation_value(p)

        test_validation = {
            "endpoint": f"{method} {path}",
            "category": "VALIDATION",
            "response": {
                "name": f"{description} - Invalid parameter values (enum/range/format violations)",
                "category": "VALIDATION",
                "expectedStatus": status,
                "pathParams": validation_path,
                "queryParams": validation_query,
            }
        }
        if requires_auth:
            test_validation["response"]["headers"] = generate_auth_header()
        tests.append(test_validation)

    # ─── 6. BOUNDARY ───
    if has_params:
        status = resolve_expected_status("BOUNDARY", method, has_required_path, has_required_query)

        boundary_path = {}
        for p in path_params:
            boundary_path[p["name"]] = generate_boundary_value(p)

        boundary_query = {}
        for p in query_params:
            boundary_query[p["name"]] = generate_boundary_value(p)

        test_boundary = {
            "endpoint": f"{method} {path}",
            "category": "BOUNDARY",
            "response": {
                "name": f"{description} - Edge case boundary values",
                "category": "BOUNDARY",
                "expectedStatus": status,
                "pathParams": boundary_path,
                "queryParams": boundary_query,
            }
        }
        if requires_auth:
            test_boundary["response"]["headers"] = generate_auth_header()
        tests.append(test_boundary)

    return tests


# ─────────────────────────────────────────────────────────
# SPECIAL CASE: No-param endpoints
# ─────────────────────────────────────────────────────────

def generate_tests_no_params(endpoint):
    """
    For endpoints with NO path/query params, only POSITIVE and AUTH apply.
    """
    method = endpoint["method"]
    path = endpoint["path"]
    description = endpoint.get("description", "")
    requires_auth = endpoint.get("requiresAuth", False)

    tests = []

    # POSITIVE
    status = resolve_expected_status("POSITIVE", method, False, False)
    test_positive = {
        "endpoint": f"{method} {path}",
        "category": "POSITIVE",
        "response": {
            "name": f"{description} - Valid request (no parameters)",
            "category": "POSITIVE",
            "expectedStatus": status,
            "pathParams": {},
            "queryParams": {},
        }
    }
    if requires_auth:
        test_positive["response"]["headers"] = generate_auth_header()
    tests.append(test_positive)

    # AUTH
    if requires_auth:
        status = resolve_expected_status("AUTH", method, False, False)
        test_auth = {
            "endpoint": f"{method} {path}",
            "category": "AUTH",
            "response": {
                "name": f"{description} - Missing authentication credentials",
                "category": "AUTH",
                "expectedStatus": status,
                "pathParams": {},
                "queryParams": {},
                "headers": {}
            }
        }
        tests.append(test_auth)

    return tests

class AlgorithmicGenerator(BaseGenerator):
    def __init__(self):
        pass
    def generate(self, endpoint):
        method = endpoint.get("method", "").upper()
        if method not in ("GET", "DELETE"):
            raise ValueError("Algorithmic generator only supports GET and DELETE methods")

        path_params = endpoint.get("pathParams", [])
        query_params = endpoint.get("queryParams", [])
        has_params = len(path_params) + len(query_params) > 0

        if has_params:
            tests = generate_tests_for_endpoint(endpoint)
        else:
            tests = generate_tests_no_params(endpoint)
        return tests