from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import os_kernel

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create_process', methods=['POST'])
def create_process():
    data = request.json
    process = os_kernel.tiny_os.create_process(
        data.get('name', 'New Process'), 
        data.get('type', 'application'),
        data.get('priority', 0)
    )
    
    if process:
        return jsonify({
            'success': True, 
            'pid': process.pid, 
            'name': process.name
        })
    return jsonify({'success': False, 'message': 'Process creation failed'})

@app.route('/terminate_process', methods=['POST'])
def terminate_process():
    pid = request.json.get('pid')
    result = os_kernel.tiny_os.terminate_process(pid)
    return jsonify({'success': result})

@app.route('/system_status')
def system_status():
    return jsonify(os_kernel.tiny_os.get_system_status())

@app.route('/list_processes')
def list_processes():
    return jsonify(os_kernel.tiny_os.list_processes())

@app.route('/create_file', methods=['POST'])
def create_file():
    data = request.json
    result = os_kernel.tiny_os.file_system.create_file(
        data.get('name'), 
        data.get('content', ''), 
        len(data.get('content', ''))
    )
    return jsonify({'success': result})

@app.route('/list_files')
def list_files():
    return jsonify(os_kernel.tiny_os.file_system.list_files())

if __name__ == '__main__':
    app.run(debug=True)
