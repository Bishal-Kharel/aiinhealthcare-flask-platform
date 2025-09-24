# app.py
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, render_template, jsonify, request, abort
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
import os, json
from flask import render_template, abort

from ai_routes import ai_bp
from auth_routes import auth_bp
from models import db 

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db' 
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY")

db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()

app.register_blueprint(ai_bp)
app.register_blueprint(auth_bp)

@app.route("/")
def index():
    return render_template("index.html", project_name="AI in Healthcare")

@app.route("/health-assistant")
def health_assistant():
    return render_template("health_assistant.html", project_name="AI Health Assistant")

@app.route("/healtharticles")
def health_articles():
    return render_template("healtharticles.html", project_name="Articles")

@app.route("/articles/<slug>")
def article_page(slug):
    path = os.path.join(app.root_path, "templates", "articles", f"{slug}.html")
    if not os.path.exists(path):
        abort(404)
    return render_template(f"articles/{slug}.html")

@app.route("/api/articles")
def api_articles():
    limit = int(request.args.get("limit", 1000))
    manifest_path = os.path.join(app.root_path, "static", "blog", "index.json")
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return jsonify(data[:limit])
    except Exception:
        app.logger.exception("Failed to load articles manifest")
        return jsonify([]), 200

@app.route('/policy')
def policy():
    return render_template('privacy_policy.html')

@app.route('/aboutus')
def about():
    return render_template('about.html')

@app.route('/membership')
def membership():
    return render_template('membership.html')

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/signup")
def signup_page():
    return render_template("signup.html")

@app.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Welcome to AI in Healthcare!"})

if __name__ == "__main__":
    app.run(port = 5001, debug=True)
