from dotenv import load_dotenv
load_dotenv()  # Load .env variables


from flask import Flask, render_template, request, jsonify
from ai_routes import ai_bp


app = Flask(__name__)
app.register_blueprint(ai_bp)

@app.route("/")
def index():
    return render_template("index.html", project_name="AI in Healthcare")

@app.route("/health-assistant")
def health_assistant():
    return render_template("health_assistant.html", project_name="AI Health Assistant")
@app.route('/policy')
def policy():
    return render_template('privacy_policy.html')

@app.route('/aboutus')
def about():
    return render_template('about.html')

@app.route("/api/hello", methods=["GET"])
def hello():
    return jsonify({"msg": "Welcome to AI in Healthcare!"})

if __name__ == "__main__":
    app.run(debug=True)