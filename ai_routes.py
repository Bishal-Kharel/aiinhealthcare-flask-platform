from flask import Blueprint, request, jsonify,stream_with_context, Response
from langchain_ollama import OllamaLLM
import redis
import hashlib
import os
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma


# Create a Flask blueprint for AI-related routes
ai_bp = Blueprint("ai", __name__)

# Initialize the LLM model
llm = OllamaLLM(model="llama3:8b")

# Load persisted vectorstore (same embeddings as used during ingest)
embedding = OllamaEmbeddings(model="nomic-embed-text")
vectorstore = Chroma(persist_directory="chroma_store", embedding_function=embedding)

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
    # Hash prompt for caching
    cache_key = f"llm_response:{hash_prompt(prompt)}"

    # Check cache first
    cached_response = redis_client.get(cache_key)
    if cached_response:
        def cached_stream():
            for chunk in cached_response:
                yield f"data: {chunk}\n\n"
        return Response(stream_with_context(cached_stream()), mimetype="text/event-stream")
    
    # 1. Embed and search for relevant docs
    docs = vectorstore.similarity_search(prompt, k=3)  # top 3 docs

    # 2. Combine docs text into context string
    context = "\n\n---\n\n".join([doc.page_content for doc in docs])

    # 3. Construct full prompt for LLM
    full_prompt = f"Use the following context to answer the question:\n\n{context}\n\nQuestion: {prompt}\nAnswer:"

    # Streamed response for uncached prompts
    def generate():
        full_response = ""
        for chunk in llm.stream(full_prompt):
            full_response += chunk
            yield f"data: {chunk}\n\n"
        redis_client.setex(cache_key, 3600, full_response)

    # Used SSE-compatible stream response
    return Response(stream_with_context(generate()), mimetype="text/event-stream")


