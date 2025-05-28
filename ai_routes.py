from flask import Blueprint, request, jsonify,stream_with_context, Response
from langchain_ollama import OllamaLLM
import redis
import hashlib
import os


# Create a Flask blueprint for AI-related routes
ai_bp = Blueprint("ai", __name__)


# Initialize the LLM model
llm = OllamaLLM(model="llama3:8b")

# Redis connection using environment variables with fallback defaults
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6380)),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=True
)

def hash_prompt(prompt):
    """Create a consistent hash key for a given prompt"""
    return hashlib.sha256(prompt.encode('utf-8')).hexdigest()

@ai_bp.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json()
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    cache_key = f"llm_response:{hash_prompt(prompt)}"

    # Check cache first
    cached_response = redis_client.get(cache_key)
    if cached_response:
        return jsonify({"response": cached_response, "cached": True})

    # Streamed response for uncached prompts
    def generate():
        full_response = ""
        for chunk in llm.stream(prompt):
            full_response += chunk
            yield f"data: {chunk}\n\n"
        redis_client.setex(cache_key, 3600, full_response)

    # Used SSE-compatible stream response
    return Response(stream_with_context(generate()), mimetype="text/event-stream")


