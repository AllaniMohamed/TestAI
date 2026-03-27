from flask import Flask, request, jsonify
import sys
import os
import config

# Add project root to path for imports
sys.path.append(os.path.dirname(__file__))

from models.model_loader import load_model
from converters.endpoint_converter import convert_endpoint
from generators.algorithmic_generator import AlgorithmicGenerator
from generators.ai_generator import AIGenerator

app = Flask(__name__)

# Load model once at startup
load_model()

# Create generator instances
algorithmic_gen = AlgorithmicGenerator()
ai_gen = AIGenerator()

@app.route('/set_headers', methods=['POST'])
def set_headers():
    data = request.get_json()
    if not data or 'headers' not in data:
        return jsonify({"error": "Missing 'headers' key"}), 400
    headers = data['headers']
    config.set_default_headers(headers)
    return jsonify({"updated_headers": headers})

@app.route('/get_headers', methods=['GET'])
def get_headers():
    return jsonify({"headers": config.DEFAULT_HEADERS})

@app.route("/reset_headers", methods=['GET'])
def reset_headers():
    config.set_default_headers({"Authorization": "Bearer valid_test_token"})
    return jsonify({"reset_headers": config.DEFAULT_HEADERS})

@app.route('/generate_tests', methods=['POST'])
def generate_tests():
    data = request.get_json()
    if not data or 'endpoints' not in data:
        return jsonify({"error": "Missing 'endpoints' key"}), 400

    raw_endpoints = data['endpoints']
    results = []

    for raw_ep in raw_endpoints:
        # Convert to standard format
        try:
            converted = convert_endpoint(raw_ep)
            if converted is None:
                continue   # skip unsupported methods
        except Exception as e:
            # Log error and skip
            app.logger.error(f"Conversion failed: {e}")
            continue

        method = converted['method']
        if method in ('GET', 'DELETE'):
            tests = algorithmic_gen.generate(converted)
        else:
            tests = ai_gen.generate(converted)

        results.append({
            "endpoint": f"{method} {converted['path']}",
            "tests": tests
        })

    return jsonify(results)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8083)
