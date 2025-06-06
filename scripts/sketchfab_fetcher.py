import os
import requests
import zipfile
import re
from dotenv import load_dotenv

# Load environment variables from the .env file (including SKETCHFAB_API_TOKEN)
load_dotenv()

# Fetch the Sketchfab API token from the environment
API_TOKEN = os.getenv("SKETCHFAB_API_TOKEN")

# Set headers for authorized API access
HEADERS = {
    "Authorization": f"Token {API_TOKEN}"
}

# Base URL for Sketchfab API
BASE_URL = "https://api.sketchfab.com/v3"

def clean_filename(name):
    """Clean model name to be safe for file system folders."""
    # Remove invalid characters and strip trailing spaces
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name).strip()
    # Optionally replace spaces with underscores or hyphens:
    cleaned = cleaned.replace(" ", "_")
    return cleaned

# Function to search and fetch medical/anatomy-related 3D models for multiple queries
def fetch_models_for_queries(queries, limit_per_query=3):
    all_models = []
    for query in queries:
        print(f"\nSearching for models with query: '{query}'")
        params = {
            "q": query,
            "downloadable": "true",
            "license": "cc0","cc"
            "sort_by": "-likeCount",
            "type": "models"
        }

        response = requests.get(f"{BASE_URL}/search", headers=HEADERS, params=params)
        response.raise_for_status()
        data = response.json()  

        models = data.get("results", [])[:limit_per_query]
        for model in models:
            name = model["name"].lower()
            description = model.get("description", "").lower()
            # Filter only human anatomy or organ-related models
            if "human" in name or "human" in description:
                if ("anatomy" in name or "anatomy" in description) or ("organ" in name or "organ" in description):
                    model_uid = model["uid"]
                    print(f"Found anatomy model: {model['name']} (UID: {model_uid})")
                    download_model(model_uid, model["name"])
                    all_models.append(model["name"])
                else:
                    print(f"Skipping model '{model['name']}' - not anatomy related.")
            else:
                print(f"Skipping model '{model['name']}' - not human.")

    print(f"\nDownloaded a total of {len(all_models)} models.")
    return all_models

# Function to download a 3D model by UID and save/unzip using model name
def download_model(model_uid, model_name):
    download_url = f"{BASE_URL}/models/{model_uid}/download"

    response = requests.get(download_url, headers=HEADERS)
    if response.status_code != 200:
        print(f"Failed to get download info for model {model_uid}")
        return

    data = response.json()
    if not data.get("gltf"):
        print(f"Model {model_uid} has no glTF download")
        return

    gltf_info = data["gltf"]
    file_url = gltf_info["url"]

    # Clean model name for folder and zip file name
    safe_name = clean_filename(model_name)

    zip_filename = f"static/assets/3d/{safe_name}.zip"
    extract_dir = f"static/assets/3d/{safe_name}"

    os.makedirs(os.path.dirname(zip_filename), exist_ok=True)

    print(f"Downloading: {file_url}")
    model_data = requests.get(file_url)
    with open(zip_filename, "wb") as f:
        f.write(model_data.content)

    print(f"Saved: {zip_filename}")

    unzip_model(zip_filename, extract_dir)

def unzip_model(zip_path, extract_to):
    os.makedirs(extract_to, exist_ok=True)

    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_to)

    print(f"Unzipped to: {extract_to}")

if __name__ == "__main__":
    # Queries for whole body and individual parts
    queries = [
        "human liver",
        "human Head Anatomy and Musculature",
        "human Heart Anatomy",
        "Female Bust - Human Anatomy Study",
        "human Eye anatomy and functions",
        "human muscle anatomy",
        "human brain anatomy",
        "human kidney anatomy",
        "human liver anatomy",
        "human Muscles and Bones Anatomy body Animation",
        "anatomy"
        "body"
        "human"
    ]

    fetch_models_for_queries(queries, limit_per_query=5)
