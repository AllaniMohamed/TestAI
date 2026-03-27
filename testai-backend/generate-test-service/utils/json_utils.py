import re
import json
import random
import config
from models.model_loader import model, tokenizer
import torch

def is_array_schema(schema):
    return isinstance(schema, dict) and schema.get("_isArray", False)

def is_formdata_schema(schema):
    return isinstance(schema, dict) and schema.get("_isFormData", False)

def get_item_schema(schema):
    return schema.get("_itemSchema", {})

def get_formdata_fields(schema):
    return {k: v for k, v in schema.items() if not k.startswith("_") and isinstance(v, dict)}

def build_user_prompt(endpoint, category):

    body_schema = endpoint.get("schema", {})
    path_params = endpoint.get("pathParams", {})
    content_type = endpoint.get("contentType", "application/json")

    body_desc = {}
    body_desc_is_array = False
    body_desc_is_formdata = False
    path_desc = {}

    # -------------------------
    # Handle BODY SCHEMA
    # -------------------------
    if isinstance(body_schema, dict):
        if is_array_schema(body_schema):
            body_desc_is_array = True
            item_schema = get_item_schema(body_schema)
            for fname, fspec in item_schema.items():
                if not isinstance(fspec, dict):
                    continue
                desc_parts = [fspec.get("type", "string")]
                if fspec.get("required"):
                    desc_parts.append("required")
                if fspec.get("enum"):
                    desc_parts.append(f"enum: {fspec['enum']}")
                if fspec.get("format"):
                    desc_parts.append(f"format: {fspec['format']}")
                if fspec.get("maxLength"):
                    desc_parts.append(f"maxLength: {fspec['maxLength']}")
                if fspec.get("minLength"):
                    desc_parts.append(f"minLength: {fspec['minLength']}")
                if fspec.get("minimum") is not None:
                    desc_parts.append(f"minimum: {fspec['minimum']}")
                if fspec.get("maximum") is not None:
                    desc_parts.append(f"maximum: {fspec['maximum']}")
                body_desc[fname] = ", ".join(desc_parts)

        elif is_formdata_schema(body_schema):
            body_desc_is_formdata = True
            fields = get_formdata_fields(body_schema)
            for fname, fspec in fields.items():
                desc_parts = [fspec.get("type", "string")]
                if fspec.get("required"):
                    desc_parts.append("required")
                if fspec.get("enum"):
                    desc_parts.append(f"enum: {fspec['enum']}")
                if fspec.get("format"):
                    desc_parts.append(f"format: {fspec['format']}")
                if fspec.get("accept"):
                    desc_parts.append(f"accept: {fspec['accept']}")
                if fspec.get("maxSize"):
                    desc_parts.append(f"maxSize: {fspec['maxSize']}")
                if fspec.get("multiple"):
                    desc_parts.append("multiple files allowed")
                if fspec.get("maxLength"):
                    desc_parts.append(f"maxLength: {fspec['maxLength']}")
                if fspec.get("minLength"):
                    desc_parts.append(f"minLength: {fspec['minLength']}")
                if fspec.get("minimum") is not None:
                    desc_parts.append(f"minimum: {fspec['minimum']}")
                if fspec.get("maximum") is not None:
                    desc_parts.append(f"maximum: {fspec['maximum']}")
                if fspec.get("description"):
                    desc_parts.append(f"description: {fspec['description']}")
                body_desc[fname] = ", ".join(desc_parts)
        else:
            for fname, fspec in body_schema.items():
                if fname.startswith("_"):
                    continue
                if not isinstance(fspec, dict):
                    continue
                desc_parts = [fspec.get("type", "string")]
                if fspec.get("required"):
                    desc_parts.append("required")
                if fspec.get("enum"):
                    desc_parts.append(f"enum: {fspec['enum']}")
                body_desc[fname] = ", ".join(desc_parts)

    elif isinstance(body_schema, list):
      body_desc_is_array = True  # ADD THIS
      if len(body_schema) > 0 and isinstance(body_schema[0], dict):
          item_def = body_schema[0]
          for fname, fspec in item_def.items():
              if not isinstance(fspec, dict):
                  continue
              desc_parts = [fspec.get("type", "string")]
              if fspec.get("required"):
                  desc_parts.append("required")
              if fspec.get("enum"):
                  desc_parts.append(f"enum: {fspec['enum']}")
              if fspec.get("format"):
                  desc_parts.append(f"format: {fspec['format']}")
              if fspec.get("maxLength"):
                  desc_parts.append(f"maxLength: {fspec['maxLength']}")
              if fspec.get("minLength"):
                  desc_parts.append(f"minLength: {fspec['minLength']}")
              if fspec.get("minimum") is not None:
                  desc_parts.append(f"minimum: {fspec['minimum']}")
              if fspec.get("maximum") is not None:
                  desc_parts.append(f"maximum: {fspec['maximum']}")
              body_desc[fname] = ", ".join(desc_parts)

    # -------------------------
    # Handle PATH PARAMS
    # -------------------------
    if isinstance(path_params, list):
        for param in path_params:
            pname = param.get("name")
            desc_parts = [param.get("type", "string")]
            if param.get("required", True):
                desc_parts.append("required")
            if param.get("description"):
                desc_parts.append(f"description: {param['description']}")
            path_desc[pname] = ", ".join(desc_parts)

    variation = random.choice(
        config.PROMPT_VARIATIONS.get(category, ["Generate an API test payload."])
    )

    prompt = f"""Endpoint:
{endpoint['method']} {endpoint['path']}
Description: {endpoint['description']}
RequiresAuth: {endpoint.get('requiresAuth', False)}
Content-Type: {content_type}
Test Category: {category}
"""

    if path_desc:
        prompt += f"""
Path Parameters:
{json.dumps(path_desc, indent=2)}
"""

    if body_desc:
        if body_desc_is_array:
            prompt += f"""
Request Body Schema (array of objects):
"schema": [{json.dumps(body_desc, indent=2)}]

Note: The request body must be a JSON array. Each element follows the schema above.
"""
        elif body_desc_is_formdata:
            prompt += f"""
Request Body Schema (multipart/form-data):
{json.dumps(body_desc, indent=2)}

Note: This endpoint uses multipart/form-data. File fields should use descriptive placeholders like "(binary file: filename.ext)". Non-file fields are sent as form fields.
"""
        else:
            prompt += f"""
Request Body Schema:
{json.dumps(body_desc, indent=2)}
"""

    prompt += f"""
Instruction: {variation}

Return ONLY valid JSON with this structure:
{{ "name": "string", "category": "{category}", "pathParams": {{}},  // Must include all path parameters with valid values
  "payload": {{}},  "requiresAuth": {endpoint.get('requiresAuth', False)}, "expectedStatus": number }}
"""

    if body_desc_is_array:
        prompt += """
Important:
- The payload must be a JSON array of objects (e.g., [{...}, {...}])
- Each object in the array must follow the element schema
- pathParams must contain ALL path parameters from the endpoint URL
- Use realistic values for path parameters (e.g., integer IDs, valid usernames)
- If testing invalid scenarios, the pathParams should still be valid unless specifically testing path parameter validation
"""
    elif body_desc_is_formdata:
        prompt += """
Important:
- This endpoint uses multipart/form-data content type
- File fields should contain descriptive placeholders like "(binary file: photo.jpg)" for valid files
- For invalid file tests, use placeholders like "(empty file)", "(corrupt file: data.xyz)", or "(oversized file: large.dat)"
- Non-file form fields contain regular string/integer/boolean values
- pathParams must contain ALL path parameters from the endpoint URL
- Use realistic values for path parameters (e.g., integer IDs, valid usernames)
- If testing invalid scenarios, the pathParams should still be valid unless specifically testing path parameter validation
"""
    else:
        prompt += """
Important:
- pathParams must contain ALL path parameters from the endpoint URL
- Use realistic values for path parameters (e.g., integer IDs, valid usernames)
- If testing invalid scenarios, the pathParams should still be valid unless specifically testing path parameter validation
"""

    return prompt

def clean_json_response(response):
    """Fix common model output issues that break JSON parsing."""

    # 1. Remove JavaScript/C-style comments (// ... and /* ... */)
    # Remove single-line comments: // anything to end of line
    # But be careful not to strip // inside strings like URLs
    lines = response.split('\n')
    cleaned_lines = []
    for line in lines:
        # Find // that's NOT inside a string value
        in_string = False
        i = 0
        clean_line = line
        while i < len(line) - 1:
            if line[i] == '"' and (i == 0 or line[i-1] != '\\'):
                in_string = not in_string
            elif line[i] == '/' and line[i+1] == '/' and not in_string:
                clean_line = line[:i].rstrip()
                break
            i += 1
        cleaned_lines.append(clean_line)
    response = '\n'.join(cleaned_lines)

    # 2. Fix Python True/False/None → JSON true/false/null
    # Only replace when they appear as values (not inside strings)
    # Simple approach: replace standalone occurrences
    response = re.sub(r':\s*True\b', ': true', response)
    response = re.sub(r':\s*False\b', ': false', response)
    response = re.sub(r':\s*None\b', ': null', response)

    # 3. Remove trailing commas before } or ]
    response = re.sub(r',\s*([}\]])', r'\1', response)

    return response


# noinspection PyCallingNonCallable
def generate_test(endpoint, category):
    """Generate a test payload using the exact training prompt format."""

    user_content = build_user_prompt(endpoint, category)

    messages = [
        {"role": "system", "content": config.SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    prompt = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        truncation=True,
        max_length=config.MAX_SEQ_LENGTH
    )
    inputs = {k: v.to(model.device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=config.MAX_SEQ_LENGTH,
            do_sample=False,
            temperature=0.3,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated_tokens = outputs[0][inputs["input_ids"].shape[-1]:]
    response = tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()

    # Extract JSON from possible markdown wrapping
    json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
    if json_match:
        response = json_match.group(1)

    start = response.find('{')
    end = response.rfind('}')
    if start != -1 and end != -1:
        response = response[start:end + 1]

    response = clean_json_response(response)

    return response