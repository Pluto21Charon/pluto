from flask import Flask, request, jsonify, send_file, send_from_directory, abort
import openai
import os
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sys

app = Flask(__name__)

# Change the CWD to the script's directory
os.chdir(os.path.dirname(sys.executable))

openai.api_base = 'your api-linLK '
openai.api_key = "your key"

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')  # Use absolute path
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return {"error": "No file part in the request."}, 400

    file = request.files['file']

    if file.filename == '':
        return {"error": "No selected file."}, 400

    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return {"fileUrl": f"http://localhost:8080/uploads/{filename}"}


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.isfile(filepath):
        print(f"File does not exist: {filepath}")
        abort(404)
    print(f"Attempting to send file: {filepath}")
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


def request_api(prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_tokens=4500,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
    )
    if 'error' in response:
        return f"API error: {response['error']}"
    return response.choices[0]["message"]["content"]


@app.route('/ask', methods=['POST'])
def ask():
    request_data = request.get_json()
    text = request_data.get('text', '')

    # Generate mindmap from GPT-4 here...
    result = request_api(text)

    return {"message": result}


@app.route('/', defaults={'req_path': ''})
@app.route('/<path:req_path>')
def dir_listing(req_path):
    BASE_DIR = os.getcwd()  # Use the current working directory

    # Joining the base and the requested path
    abs_path = os.path.join(BASE_DIR, req_path)

    # Return 404 if path doesn't exist
    if not os.path.exists(abs_path):
        return abort(404)

    # Check if path is a file and serve
    if os.path.isfile(abs_path):
        return send_file(abs_path)

    # Show directory contents
    files = os.listdir(abs_path)
    return jsonify(files)


if __name__ == "__main__":
    app.run(host='127.0.0.1', port=8080)
