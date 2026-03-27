import json

METHODS = ["POST", "PUT", "GET", "DELETE"]


def parse_json_string(raw):
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    try:
        return json.loads(raw)
    except:
        return None


def extract_constraints(node, include_type=True):
    """
    Extract commonly useful schema metadata/constraints.
    Keeps only validation + descriptive fields, skips structural ones like:
    properties, items, required, xml
    """
    result = {}

    allowed_keys = [
        # base
        "type",
        "nullable",
        # numeric
        "minimum",
        "maximum",
        "exclusiveMinimum",
        "exclusiveMaximum",
        "multipleOf",
        # string
        "minLength",
        "maxLength",
        "pattern",
        # enum / const
        "enum",
        # array
        "minItems",
        "maxItems",
        "uniqueItems",
        # object
        "minProperties",
        "maxProperties",
    ]

    for k in allowed_keys:
        if k == "type" and not include_type:
            continue
        if k in node:
            result[k] = node[k]

    return result


def convert_schema_node(node, required=False):
    """
    Recursive converter:
    - object -> { ...metadata..., "required": bool, ...fields... }
    - array  -> { ...metadata..., "required": bool, "items": [ ... ] }
    - primitive -> { ...constraints..., required: bool }
    """
    if not isinstance(node, dict):
        return {"type": "string", "required": required}

    node_type = node.get("type", "string")

    # -------- OBJECT --------
    if node_type == "object":
        nested_required = node.get("required", [])
        nested_props = node.get("properties", {})

        obj = extract_constraints(node, include_type=False)
        obj["required"] = required

        for prop_name, prop_schema in nested_props.items():
            if prop_name == "xml":
                continue
            obj[prop_name] = convert_schema_node(
                prop_schema,
                required=(prop_name in nested_required)
            )

        return obj

    # -------- ARRAY --------
    if node_type == "array":
        items = node.get("items", {})

        arr = extract_constraints(node, include_type=False)
        arr["required"] = required
        arr["items"] = [convert_schema_node(items, required=False)]

        return arr

    # -------- PRIMITIVE / FILE --------
    field = extract_constraints(node)
    field["required"] = required
    return field


def extract_parameters(parameters_raw, location):
    params = parse_json_string(parameters_raw)
    if not params:
        return []

    result = []
    for p in params:
        if p.get("in") != location:
            continue

        name = p["name"]
        required = p.get("required", False)

        # Reuse recursive converter for params too
        converted = convert_schema_node(p, required=required)

        # Parameters should always keep name
        param = {
            "name": name,
            **converted
        }

        result.append(param)

    return result


def extract_formdata_as_schema(parameters_raw):
    """
    Convert formData parameters into the expected schema format:
    {
        "_isFormData": True,
        "fieldName": {"type": "...", "required": ..., "description": "..."},
        ...
    }
    Returns None if no formData parameters exist.
    """
    params = parse_json_string(parameters_raw)
    if not params:
        return None

    form_fields = [p for p in params if p.get("in") == "formData"]
    if not form_fields:
        return None

    schema = {"_isFormData": True}

    for p in form_fields:
        name = p["name"]
        required = p.get("required", False)

        field = {}

        # type
        field["type"] = p.get("type", "string")

        # required
        field["required"] = required

        # description
        if "description" in p:
            field["description"] = p["description"]

        # For file types, we don't extract numeric/string constraints
        # For other types, extract relevant constraints
        if field["type"] != "file":
            constraint_keys = [
                "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum",
                "multipleOf", "minLength", "maxLength", "pattern", "enum",
                "minItems", "maxItems", "uniqueItems",
            ]
            for k in constraint_keys:
                if k in p:
                    field[k] = p[k]

        schema[name] = field

    return schema


def extract_schema_from_request_body(request_body_raw):
    body = parse_json_string(request_body_raw)
    if not body:
        return None

    content = body.get("content", {})

    if "application/json" in content:
        return content["application/json"].get("schema")

    if content:
        first = next(iter(content))
        return content[first].get("schema")

    if "schema" in body:
        return body["schema"]

    return None


def schema_to_model_format(schema):
    if not schema:
        return None

    # -------- TOP-LEVEL OBJECT --------
    if schema.get("type") == "object":
        required = schema.get("required", [])
        properties = schema.get("properties", {})

        result = {}

        for name, prop in properties.items():
            if name == "xml":
                continue
            result[name] = convert_schema_node(
                prop,
                required=(name in required)
            )

        return result

    # -------- TOP-LEVEL ARRAY --------
    if schema.get("type") == "array":
        items = schema.get("items", {})
        return [convert_schema_node(items, required=False)]

    # -------- TOP-LEVEL PRIMITIVE --------
    return convert_schema_node(schema, required=False)


def has_formdata_params(parameters_raw):
    """Check if any parameters have in=formData."""
    params = parse_json_string(parameters_raw)
    if not params:
        return False
    return any(p.get("in") == "formData" for p in params)


def convert_endpoint(raw):
    method = raw.get("method", "").upper()

    if method not in METHODS:
        return None

    result = {
        "method": method,
        "path": raw.get("path"),
        "description": raw.get("description"),
        "requiresAuth": raw.get("requiresAuth", False)
    }

    # -------- Check for formData parameters --------
    is_formdata = has_formdata_params(raw.get("parameters"))

    if is_formdata:
        # Add contentType for formData endpoints
        result["contentType"] = "multipart/form-data"

    # -------- BODY (POST / PUT / optional others) --------
    # Only process requestBody if this is NOT a formData endpoint
    if not is_formdata:
        schema_raw = extract_schema_from_request_body(raw.get("requestBody"))
        schema = schema_to_model_format(schema_raw)
        if schema is not None:
            result["schema"] = schema

    # -------- PATH PARAMS --------
    path_params = extract_parameters(raw.get("parameters"), "path")
    if path_params:
        result["pathParams"] = path_params

    # -------- QUERY PARAMS --------
    query_params = extract_parameters(raw.get("parameters"), "query")
    if query_params:
        result["queryParams"] = query_params

    # -------- FORMDATA -> schema with _isFormData --------
    if is_formdata:
        formdata_schema = extract_formdata_as_schema(raw.get("parameters"))
        if formdata_schema:
            result["schema"] = formdata_schema

    return result