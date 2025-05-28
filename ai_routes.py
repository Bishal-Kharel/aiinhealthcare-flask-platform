from flask import Blueprint, request, jsonify
import requests
import sqlite3
import logging

ai_bp = Blueprint("ai", __name__)

OLLAMA_API_URL = "http://localhost:11434/api/generate"

# Configure logging
logging.basicConfig(level=logging.INFO)

def select_model(prompt, task_type):
    """Select model based on task type or prompt length."""
    if task_type == "symptom_check" or len(prompt) < 100:
        return "mistral"  # Lightweight for quick responses
    return "llama3:8b"  # Better for complex reasoning

@ai_bp.route("/api/ask", methods=["POST"])
def ask():
    data = request.get_json()
    prompt = data.get("prompt", "")
    task_type = data.get("task_type", "symptom_check")

    # Check cache
    conn = sqlite3.connect("cache.db")
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS cache (prompt TEXT PRIMARY KEY, response TEXT)")
    cursor.execute("SELECT response FROM cache WHERE prompt=?", (prompt,))
    cached = cursor.fetchone()

    if cached:
        conn.close()
        logging.info(f"Cache hit for prompt: {prompt}")
        return jsonify({"reply": cached[0]})

    # Select model
    model = select_model(prompt, task_type)
    logging.info(f"Using model: {model} for prompt: {prompt}")

    # Craft healthcare-specific prompt
    if task_type == "symptom_check":
        full_prompt = (
            f"You are a healthcare assistant. Analyze these symptoms: {prompt}. "
            f"Suggest possible conditions and actions in bullet points, max 100 words. "
            f"Avoid definitive diagnoses; always recommend consulting a doctor."
        )
    else:  # Medical report
        full_prompt = (
            f"You are a medical report generator. Based on input: {prompt}, "
            f"generate a detailed summary with sections for Observations, Analysis, and Recommendations."
        )

    # Call Ollama
    try:
        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": model,
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "num_ctx": 2048,  # Context length suitable for M1 Max
                    "temperature": 0.7  # Balanced creativity
                }
            },
            timeout=30
        )
        response.raise_for_status()
        reply = response.json().get("response", "Error: No response from model")
    except Exception as e:
        logging.error(f"Ollama error: {str(e)}")
        reply = f"Error: {str(e)}"

    # Cache result
    cursor.execute("INSERT INTO cache (prompt, response) VALUES (?, ?)", (prompt, reply))
    conn.commit()
    conn.close()

    return jsonify({"reply": reply, "model_used": model})