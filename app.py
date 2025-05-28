from flask import Flask, render_template, request, jsonify
from ai_routes import ai_bp
from dotenv import load_dotenv

load_dotenv()  # Load .env variables

app = Flask(__name__)
app.register_blueprint(ai_bp)

@app.route("/")
def index():
    return render_template("index.html", project_name="AI in Healthcare")

@app.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Welcome to AI in Healthcare!"})

if __name__ == "__main__":
    app.run(debug=True)