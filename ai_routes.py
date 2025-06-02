from flask import Blueprint, request, jsonify, stream_with_context, Response
from langchain_ollama import OllamaLLM
import redis
import hashlib
import os
import json
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma

# Create a Flask blueprint for AI-related routes
ai_bp = Blueprint("ai", __name__)

# Initialize the LLM model
llm = OllamaLLM(model="llama3:8b")

# Load persisted vectorstore
embedding = OllamaEmbeddings(model="nomic-embed-text")
vectorstore = Chroma(persist_directory="chroma_store", embedding_function=embedding)

# Redis connection
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6380)),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=True
)

# List of body parts based on sketchfab_fetcher.py queries
BODY_PARTS = [
    "whole body anatomy", "human anatomy full body",
    "heart", "lungs", "skeleton", "muscle",
    "brain", "kidney", "liver","skull","body","ecorche_-_anatomy_study","fullBody"
]

def hash_prompt(prompt):
    """Create a consistent hash key for a given prompt"""
    return hashlib.sha256(prompt.encode('utf-8')).hexdigest()

def detect_body_part(prompt):
    """Detect if a body part is mentioned in the prompt"""
    prompt_lower = prompt.lower()
    for body_part in BODY_PARTS:
        if body_part in prompt_lower:
            return body_part
    return None

def get_model_path(body_part):
    """Get the path to the 3D model for the body part"""
    safe_name = body_part.replace(" ", "_")
    model_dir = os.path.join("static", "assets", "3d", safe_name)
    if os.path.exists(model_dir):
        for file in os.listdir(model_dir):
            if file.endswith(".gltf") or file.endswith(".glb"):
                return f"/{model_dir}/{file}"
        return f"/{model_dir}"
    return None

@ai_bp.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json()
    prompt = data.get("prompt")
    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # Hash prompt for caching
    cache_key = f"llm_response:{hash_prompt(prompt)}"

    # Detect body part and get model path
    body_part = detect_body_part(prompt)
    model_path = get_model_path(body_part) if body_part else None

    # Check cache first
    cached_response = redis_client.get(cache_key)
    if cached_response:
        def cached_stream():
            # Send model path first (if any)
            if model_path:
                yield f"data: {json.dumps({'model_path': model_path})}\n\n"
            # cached_response is a string, send it as one chunk with body_part
            yield f"data: {json.dumps({'text': cached_response, 'body_part': body_part})}\n\n"
        return Response(stream_with_context(cached_stream()), mimetype="text/event-stream")

    # Embed and search for relevant docs
    docs = vectorstore.similarity_search(prompt, k=3)
    context = "\n\n---\n\n".join([doc.page_content for doc in docs if doc.page_content.strip()])

    # Construct full prompt for LLM
    if context:
        full_prompt = f"Use the following medical context to answer the question:\n\n{context}\n\nQuestion: {prompt}\nAnswer:"
    else:
        full_prompt = prompt

    # Streamed response for uncached prompts
    def generate():
        full_response = ""
        # Send model path first (if any)
        if model_path:
            yield f"data: {json.dumps({'model_path': model_path})}\n\n"
        # Stream LLM response chunk by chunk
        for chunk in llm.stream(full_prompt):
            full_response += chunk
            yield f"data: {json.dumps({'text': chunk, 'body_part': body_part})}\n\n"
        # Cache full response as string
        redis_client.setex(cache_key, 3600, full_response)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")