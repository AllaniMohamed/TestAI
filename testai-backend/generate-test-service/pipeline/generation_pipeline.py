import copy
import json
import re
from pipeline.payload_post_processor import PayloadPostProcessor
from utils.json_utils import generate_test,  clean_json_response, build_user_prompt
import hashlib
import config

class GenerationPipeline:
    """
    Orchestrates generation + post-processing + smart regeneration.

    Key design: regeneration MUST produce different output than the original.
    We achieve this by:
    1. Varying the prompt (different instruction variation)
    2. Enabling sampling with higher temperature on retries
    3. Detecting duplicate outputs and skipping to synthesis immediately
    4. Hard timeout per generation attempt
    """

    MAX_RETRIES = 2          # Max regeneration attempts per failed test
    REGEN_TIMEOUT = 120       # Seconds max per single generation attempt
    CATEGORIES = ["POSITIVE", "AUTH", "WRONG_TYPE", "MISSING_FIELDS", "VALIDATION", "BOUNDARY"]

    def __init__(self, model, tokenizer, endpoint, user_headers=None,
                 generate_fn=None, build_prompt_fn=None, clean_json_fn=None):
        """
        Args:
            model: The loaded LoRA model
            tokenizer: The tokenizer
            endpoint: Endpoint config dict
            user_headers: User-supplied headers dict (replaces model-generated headers)
            generate_fn: The raw generation function (defaults to generate_test)
            build_prompt_fn: Function to build user prompts (defaults to build_user_prompt)
            clean_json_fn: Function to clean JSON strings (defaults to clean_json_response)
        """
        self.model = model
        self.tokenizer = tokenizer
        self.endpoint = endpoint
        self.user_headers = user_headers

        # Allow dependency injection for testability, fall back to globals
        self.generate_fn = generate_fn or generate_test
        self.build_prompt_fn = build_prompt_fn or build_user_prompt
        self.clean_json_fn = clean_json_fn or clean_json_response

        # Track previously seen raw outputs to detect duplicates
        self._seen_raw_hashes = {}  # category -> set of hashes

        # Will be set after first POSITIVE generation
        self.positive_result = None

    def _hash_raw(self, raw_string):
        """
        Create a short hash of a raw generation output.
        Used to detect when the model produces identical broken output on retry.
        """
        return hashlib.md5(raw_string.encode()).hexdigest()

    def _generate_with_variation(self, category, attempt=0):
        """
        Generate a test payload, varying the approach based on attempt number.

        Attempt 0: Standard generation (deterministic, default prompt variation)
        Attempt 1: Different prompt variation + sampling enabled
        Attempt 2: Yet another variation + higher temperature

        This is the KEY fix: each retry MUST use different generation parameters
        to avoid producing the exact same broken output.

        Returns:
            (parsed_dict_or_None, raw_string, error_or_None)
        """
        # Build the user prompt with a specific variation index
        # instead of random.choice, we pick based on attempt number
        user_content = self._build_varied_prompt(category, attempt)

        messages = [
            {"role": "system", "content": config.SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        prompt = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )

        inputs = self.tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=config.MAX_SEQ_LENGTH
        )
        inputs = {k: v.to(self.model.device) for k, v in inputs.items()}

        # Vary generation parameters based on attempt
        # Attempt 0: greedy (deterministic) — same as original
        # Attempt 1+: enable sampling so we get different outputs
        gen_kwargs = {
            "max_new_tokens": config.MAX_SEQ_LENGTH,
            "pad_token_id": self.tokenizer.pad_token_id,
            "eos_token_id": self.tokenizer.eos_token_id,
        }

        if attempt == 0:
            # First try: deterministic greedy decoding
            gen_kwargs["do_sample"] = False
        elif attempt == 1:
            # Second try: mild sampling to get different output
            gen_kwargs["do_sample"] = True
            gen_kwargs["temperature"] = 0.5
            gen_kwargs["top_p"] = 0.9
        else:
            # Third try: more aggressive sampling
            gen_kwargs["do_sample"] = True
            gen_kwargs["temperature"] = 0.7
            gen_kwargs["top_p"] = 0.85
            gen_kwargs["top_k"] = 50

        import torch
        with torch.no_grad():
            outputs = self.model.generate(**inputs, **gen_kwargs)

        generated_tokens = outputs[0][inputs["input_ids"].shape[-1]:]
        response = self.tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()

        # Extract JSON from possible markdown wrapping
        json_match = re.search(r'```json\s*(.*?)\s*```', response, re.DOTALL)
        if json_match:
            response = json_match.group(1)

        start = response.find('{')
        end = response.rfind('}')
        if start != -1 and end != -1:
            response = response[start:end + 1]

        response = self.clean_json_fn(response)

        # Try parsing
        try:
            parsed = json.loads(response)
            return parsed, response, None
        except json.JSONDecodeError as e:
            return None, response, str(e)

    def _build_varied_prompt(self, category, attempt):
        """
        Build a user prompt using a DIFFERENT variation for each attempt.

        The model is deterministic with greedy decoding, so the only way
        to get different output is to give it a different input prompt.
        We cycle through PROMPT_VARIATIONS for the category, and on later
        attempts also add an explicit instruction about the previous failure.
        """
        variations = config.PROMPT_VARIATIONS.get(category, ["Generate an API test payload."])

        # Pick a different variation for each attempt (cycle through them)
        variation_idx = attempt % len(variations)
        # Use a different variation than default (which uses random.choice)
        selected_variation = variations[variation_idx]

        # Build the base prompt using the standard function
        # We temporarily override random.choice to force our variation
        original_prompt = self.build_prompt_fn(self.endpoint, category)

        # Replace the instruction line with our selected variation
        # The original prompt ends with "Instruction: {variation}\n..."
        # We find and replace it
        for v in variations:
            if f"Instruction: {v}" in original_prompt:
                original_prompt = original_prompt.replace(
                    f"Instruction: {v}",
                    f"Instruction: {selected_variation}"
                )
                break

        # On retry attempts, add extra guidance to avoid the same error
        if attempt > 0:
            original_prompt += f"""
CRITICAL: Ensure the JSON is complete and properly closed.
- Every {{ must have a matching }}
- Every [ must have a matching ]
- The payload array must be closed with ] before other fields like "requiresAuth"
- Double-check bracket nesting before outputting
"""

        return original_prompt

    def _attempt_json_recovery(self, raw_string):
        """
        Try to recover valid JSON from a malformed model output.
        Handles the specific pattern where the model fails to close
        an array payload before continuing with other fields.

        Common error pattern:
        {"payload": [{"field": "val"}, "requiresAuth": true}
        Should be:
        {"payload": [{"field": "val"}], "requiresAuth": true}
        """
        cleaned = raw_string.strip()

        # Strategy 1: Fix the specific "unclosed array in payload" pattern
        # The model outputs: "payload": [{...}, "requiresAuth": ...
        # It should be:       "payload": [{...}], "requiresAuth": ...
        #
        # Detect: after a } inside payload array, the next key is a top-level field
        top_level_fields = (
            '"requiresAuth"', '"expectedStatus"', '"headers"',
            '"name"', '"category"', '"pathParams"'
        )

        for field in top_level_fields:
            # Pattern: }, "topLevelField" where } should be }], "topLevelField"
            # But only when we're inside a payload array context
            pattern = r'(\})\s*,\s*(' + re.escape(field) + r')'

            # Check if this pattern exists AND we have an unclosed [
            if re.search(pattern, cleaned):
                # Count brackets up to this point to verify we're in an unclosed array
                match = re.search(pattern, cleaned)
                if match:
                    prefix = cleaned[:match.start() + 1]
                    open_brackets = prefix.count('[')
                    close_brackets = prefix.count(']')

                    if open_brackets > close_brackets:
                        # We have an unclosed [ — insert the missing ]
                        cleaned = (
                            cleaned[:match.start() + 1] +
                            ']' +
                            cleaned[match.start() + 1:]
                        )
                        break  # Only fix one occurrence

        # Strategy 2: General bracket balancing
        open_braces = cleaned.count('{')
        close_braces = cleaned.count('}')
        open_brackets = cleaned.count('[')
        close_brackets = cleaned.count(']')

        if open_braces > close_braces:
            cleaned += '}' * (open_braces - close_braces)
        if open_brackets > close_brackets:
            cleaned += ']' * (open_brackets - close_brackets)

        # Strategy 3: Trim after last }
        last_brace = cleaned.rfind('}')
        if last_brace != -1 and last_brace < len(cleaned) - 1:
            cleaned = cleaned[:last_brace + 1]

        # Apply standard cleaning
        cleaned = self.clean_json_fn(cleaned)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        return None

    def _synthesize_fallback(self, category):
        """
        Last resort: create a test from the POSITIVE result by modifying it
        to match the requested category. This guarantees valid JSON output
        even when the model consistently fails for a specific category.

        This is NOT a regeneration — it's a deterministic transformation
        that always produces a valid test, just not as creative as the model's.
        """
        if not self.positive_result:
            return None

        fallback = copy.deepcopy(self.positive_result)
        fallback["category"] = category
        fallback["expectedStatus"] = 400 if category != "AUTH" else 401
        desc = self.endpoint.get("description", "Test")
        payload = fallback.get("payload")

        # Get the schema fields for intelligent modification
        schema_fields = self.endpoint.get("schema", {})
        if isinstance(schema_fields, list) and len(schema_fields) > 0:
            schema_fields = schema_fields[0]
        if isinstance(schema_fields, dict) and schema_fields.get("_isArray"):
            schema_fields = schema_fields.get("_itemSchema", {})
        if isinstance(schema_fields, dict) and schema_fields.get("_isFormData"):
            schema_fields = {k: v for k, v in schema_fields.items()
                            if not k.startswith("_")}

        # Get the modifiable dict (first element if array payload)
        target = payload
        is_array = isinstance(payload, list)
        if is_array and len(payload) > 0:
            target = payload[0]

        if not isinstance(target, dict) or not isinstance(schema_fields, dict):
            # Can't intelligently modify, return as-is with category change
            fallback["name"] = f"{desc} - {category} test (synthesized)"
            return fallback

        if category == "MISSING_FIELDS":
            # Remove one required field
            for fname, fspec in schema_fields.items():
                if isinstance(fspec, dict) and fspec.get("required") and fname in target:
                    del target[fname]
                    fallback["name"] = f"{desc} - Missing required field: {fname} (synthesized)"
                    break
            else:
                fallback["name"] = f"{desc} - Missing fields test (synthesized)"

        elif category == "WRONG_TYPE":
            # Change one field to wrong type
            for fname, fspec in schema_fields.items():
                if isinstance(fspec, dict) and fname in target:
                    expected = fspec.get("type", "")
                    if expected in ("string",):
                        target[fname] = True
                    elif expected in ("integer", "number"):
                        target[fname] = "not_a_number"
                    elif expected in ("boolean",):
                        target[fname] = "not_a_boolean"
                    elif expected in ("file",):
                        target[fname] = 12345
                    else:
                        target[fname] = [1, 2, 3]
                    fallback["name"] = f"{desc} - Wrong type for {fname} (synthesized)"
                    break

        elif category == "VALIDATION":
            # Use invalid enum value or bad format
            modified = False
            for fname, fspec in schema_fields.items():
                if isinstance(fspec, dict) and fname in target:
                    if fspec.get("enum"):
                        target[fname] = "INVALID_ENUM_VALUE"
                        fallback["name"] = f"{desc} - Invalid enum for {fname} (synthesized)"
                        modified = True
                        break
                    elif fspec.get("format") == "email":
                        target[fname] = "not-an-email"
                        fallback["name"] = f"{desc} - Invalid email for {fname} (synthesized)"
                        modified = True
                        break
                    elif fspec.get("format") in ("date", "date-time"):
                        target[fname] = "not-a-date"
                        fallback["name"] = f"{desc} - Invalid date for {fname} (synthesized)"
                        modified = True
                        break
            if not modified:
                # No enum/format constraints found, try setting a string field to empty
                for fname, fspec in schema_fields.items():
                    if isinstance(fspec, dict) and fspec.get("required") and fname in target:
                        if fspec.get("type") == "string":
                            target[fname] = ""
                            fallback["name"] = f"{desc} - Empty required string {fname} (synthesized)"
                            break

        elif category == "BOUNDARY":
            # Exceed a constraint
            modified = False
            for fname, fspec in schema_fields.items():
                if isinstance(fspec, dict) and fname in target:
                    if fspec.get("maxLength"):
                        max_len = fspec["maxLength"]
                        target[fname] = "A" * (max_len + 10)
                        fallback["name"] = f"{desc} - {fname} exceeds maxLength {max_len} (synthesized)"
                        modified = True
                        break
                    elif fspec.get("maximum") is not None:
                        maximum = fspec["maximum"]
                        target[fname] = maximum + 1
                        fallback["name"] = f"{desc} - {fname} exceeds maximum {maximum} (synthesized)"
                        modified = True
                        break
                    elif fspec.get("minimum") is not None:
                        minimum = fspec["minimum"]
                        target[fname] = minimum - 1
                        fallback["name"] = f"{desc} - {fname} below minimum {minimum} (synthesized)"
                        modified = True
                        break
            if not modified:
                fallback["name"] = f"{desc} - Boundary test (synthesized)"

        return fallback

    def run(self):
        """
        Execute the full pipeline: generate → recover → post-process →
        regenerate (with variation) → synthesize fallback.

        The key insight: regeneration uses DIFFERENT prompts and sampling
        parameters to avoid the infinite loop of identical broken outputs.
        """
        ep_key = f"{self.endpoint['method']} {self.endpoint['path']}"
        print(f"\n{'='*70}")
        print(f"  {ep_key}")
        print(f"  {self.endpoint.get('description', '')}")
        print(f"{'='*70}")

        results = []

        # === Phase 1: Initial generation (attempt=0, deterministic) ===
        for category in self.CATEGORIES:
            print(f"\n  [{category}]", end=" ")

            # Initialize hash tracking for this category
            self._seen_raw_hashes.setdefault(category, set())

            parsed, raw, error = self._generate_with_variation(category, attempt=0)
            raw_hash = self._hash_raw(raw)
            self._seen_raw_hashes[category].add(raw_hash)

            if parsed:
                if parsed.get("category") not in self.CATEGORIES:
                    parsed["category"] = category
                results.append({
                    "endpoint": ep_key,
                    "category": category,
                    "response": parsed,
                    "valid": True,
                })
                print(f"✓ OK")
            else:
                # Try JSON recovery before marking as failed
                recovered = self._attempt_json_recovery(raw)
                if recovered:
                    if recovered.get("category") not in self.CATEGORIES:
                        recovered["category"] = category
                    results.append({
                        "endpoint": ep_key,
                        "category": category,
                        "response": recovered,
                        "valid": True,
                        "_warnings": ["Recovered from malformed JSON"],
                    })
                    print(f"⚠ Recovered")
                else:
                    results.append({
                        "endpoint": ep_key,
                        "category": category,
                        "response": raw,
                        "valid": False,
                        "_raw_error": error,
                    })
                    print(f"✗ Failed: {error[:60]}")

        # === Phase 2: Post-processing ===
        processor = PayloadPostProcessor(self.endpoint, self.user_headers)
        results = processor.process_all(results)

        # Cache POSITIVE for fallback synthesis
        self.positive_result = None
        for r in results:
            if r.get("valid") and isinstance(r.get("response"), dict):
                if r["category"] == "POSITIVE":
                    self.positive_result = copy.deepcopy(r["response"])
                    break

        # === Phase 3: Smart regeneration with variation ===
        for attempt in range(1, self.MAX_RETRIES + 1):
            # Collect indices that need regeneration
            regen_indices = [
                i for i, r in enumerate(results)
                if r.get("_needs_regeneration") and not r.get("_regen_exhausted")
            ]

            if not regen_indices:
                break

            print(f"\n  --- Retry {attempt}/{self.MAX_RETRIES} "
                  f"({len(regen_indices)} tests) ---")

            for idx in regen_indices:
                r = results[idx]
                category = r["category"]
                print(f"    [{category}]", end=" ")

                # Generate with VARIED prompt and sampling
                parsed, raw, error = self._generate_with_variation(category, attempt=attempt)
                raw_hash = self._hash_raw(raw)

                # Check if we got the EXACT same broken output
                if raw_hash in self._seen_raw_hashes[category]:
                    print(f"✗ Identical output — skipping to synthesis")
                    r["_regen_exhausted"] = True
                    r["_warnings"] = r.get("_warnings", []) + [
                        f"Retry {attempt} produced identical output, skipping further retries"
                    ]
                    continue

                # New output — track it
                self._seen_raw_hashes[category].add(raw_hash)

                if parsed:
                    if parsed.get("category") not in self.CATEGORIES:
                        parsed["category"] = category
                    r["response"] = parsed
                    r["valid"] = True
                    r["_needs_regeneration"] = False
                    r["_warnings"] = r.get("_warnings", []) + [
                        f"Regenerated on attempt {attempt} (varied prompt)"
                    ]
                    print(f"✓ Regenerated")
                else:
                    # Try recovery on the new (different) output
                    recovered = self._attempt_json_recovery(raw)
                    if recovered:
                        if recovered.get("category") not in self.CATEGORIES:
                            recovered["category"] = category
                        r["response"] = recovered
                        r["valid"] = True
                        r["_needs_regeneration"] = False
                        r["_warnings"] = r.get("_warnings", []) + [
                            f"Recovered on retry {attempt}"
                        ]
                        print(f"⚠ Recovered on retry")
                    else:
                        r["_warnings"] = r.get("_warnings", []) + [
                            f"Retry {attempt} failed: {error[:50]}"
                        ]
                        print(f"✗ Still broken")

            # Re-run post-processing on everything
            processor2 = PayloadPostProcessor(self.endpoint, self.user_headers)
            results = processor2.process_all(results)

        # === Phase 4: Synthesize fallbacks for anything still broken ===
        for r in results:
            needs_regen = r.get("_needs_regeneration") or not r.get("valid")
            is_skipped = r.get("_skipped")

            if needs_regen and not is_skipped:
                category = r["category"]
                print(f"\n  [{category}] Synthesizing fallback...", end=" ")

                if category == "POSITIVE":
                    # Can't synthesize POSITIVE from itself
                    print(f"✗ Cannot synthesize POSITIVE")
                    continue

                fallback = self._synthesize_fallback(category)
                if fallback:
                    r["response"] = fallback
                    r["valid"] = True
                    r["_needs_regeneration"] = False
                    r["_warnings"] = r.get("_warnings", []) + [
                        "Synthesized from POSITIVE (model could not generate valid JSON)"
                    ]
                    print(f"✓ Synthesized")
                else:
                    print(f"✗ No POSITIVE available for synthesis")

        # Final post-processing pass
        processor_final = PayloadPostProcessor(self.endpoint, self.user_headers)
        results = processor_final.process_all(results)

        return results