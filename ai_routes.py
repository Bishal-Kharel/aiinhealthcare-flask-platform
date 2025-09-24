# ai_routes.py
from dotenv import load_dotenv
import os
load_dotenv()

# Disable Chroma telemetry to avoid errors
os.environ["ANONYMIZED_TELEMETRY"] = "False"

from flask import Blueprint, request, jsonify, stream_with_context, Response
import redis
import hashlib
import json
from openai import OpenAI
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

# Create a Flask blueprint for AI-related routes
ai_bp = Blueprint("ai", __name__)

# Initialize the OpenAI client
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load persisted vectorstore
embedding = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"), model="text-embedding-3-small")
vectorstore = Chroma(persist_directory="chroma_store", embedding_function=embedding)

# Redis connection
redis_url = os.getenv("REDIS_URL")
if redis_url:
    redis_client = redis.from_url(redis_url, decode_responses=True)
else:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST"),
        port=int(os.getenv("REDIS_PORT")),
        db=int(os.getenv("REDIS_DB", 0)),
        decode_responses=True
    )

# List of body parts based on sketchfab_fetcher.py queries
BODY_PARTS = [
    "bones", "innerbody",
    "heart", "lungs", "skeleton", "muscle",
    "brain", "kidney", "liver", "skull", "body", "ecorche_-_anatomy_study", "fullBody","hands and legs","Dermis", "skin","spinal_cord", "eye"
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
            if model_path:
                yield f"data: {json.dumps({'model_path': model_path})}\n\n"
            # send cached markdown as a single chunk
            yield f"data: {json.dumps({'text': cached_response, 'body_part': body_part})}\n\n"
        return Response(stream_with_context(cached_stream()), mimetype="text/event-stream")

    # Embed and search for relevant docs
    docs = vectorstore.similarity_search(prompt, k=3)
    context = "\n\n---\n\n".join([doc.page_content for doc in docs if doc.page_content.strip()])

    # Construct full prompt for LLM (Markdown output requested)
    if context:
        full_prompt = (
            "You are a medical assistant. "
            "Format the entire answer in Markdown with clear headings (#, ##), bold text, and bullet lists. "
            "Do not wrap Markdown in code fences. Keep it concise and readable.\n\n"
            f"Context:\n{context}\n\n"
            f"User's Question: {prompt}\n\n"
            "Your Answer:"
        )
    else:
        full_prompt = (
            "You are a medical assistant. "
            "Format the entire answer in Markdown with clear headings (#, ##), bold text, and bullet lists. "
            "Do not wrap Markdown in code fences. Keep it concise and readable.\n\n"
            f"User's Question: {prompt}\n\n"
            "Your Answer:"
        )

    # Streamed response for uncached prompts
    def generate():
        full_response = ""
        if model_path:
            yield f"data: {json.dumps({'model_path': model_path})}\n\n"

        stream = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful medical assistant. "
                        "Always output Markdown with headings, bold, and lists. "
                        "Never use code fences unless explicitly asked. "
                        "No unsafe medical claims."
                    ),
                },
                {"role": "user", "content": full_prompt}
            ],
            stream=True,
            temperature=0.7
        )

        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield f"data: {json.dumps({'text': content, 'body_part': body_part})}\n\n"

        redis_client.setex(cache_key, 3600, full_response)

    return Response(stream_with_context(generate()), mimetype="text/event-stream")
