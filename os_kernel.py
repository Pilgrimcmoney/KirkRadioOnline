import uuid
import threading
import queue
import time
import random

class Process:
    def __init__(self, name, type="application", priority=0):
        self.pid = str(uuid.uuid4())[:8]
        self.name = name
        self.type = type
        self.priority = priority
        self.state = "CREATED"
        self.memory_usage = random.randint(10, 200)
        self.cpu_usage = random.randint(1, 10)
        self.start_time = time.time()
        self.end_time = None

class FileSystem:
    def __init__(self):
        self.files = {}
        self.max_storage = 1000  # MB
        self.current_storage = 0

    def create_file(self, name, content, size):
        if self.current_storage + size > self.max_storage:
            return False
        
        self.files[name] = {
            'content': content,
            'size': size,
            'created_at': time.time()
        }
        self.current_storage += size
        return True

    def list_files(self):
        return list(self.files.keys())

class OperatingSystem:
    def __init__(self):
        self.processes = {}
        self.file_system = FileSystem()
        self.total_memory = 2048  # MB
        self.used_memory = 0
        self.cpu_cores = 4

    def create_process(self, name, type="application", priority=0):
        if self.used_memory + 100 > self.total_memory:
            return None

        process = Process(name, type, priority)
        self.processes[process.pid] = process
        self.used_memory += process.memory_usage
        process.state = "RUNNING"
        
        return process

    def terminate_process(self, pid):
        if pid in self.processes:
            process = self.processes[pid]
            process.state = "TERMINATED"
            process.end_time = time.time()
            self.used_memory -= process.memory_usage
            del self.processes[pid]
            return True
        return False

    def get_system_status(self):
        return {
            'total_memory': self.total_memory,
            'used_memory': self.used_memory,
            'cpu_cores': self.cpu_cores,
            'running_processes': len(self.processes)
        }

    def list_processes(self):
        return [
            {
                'pid': p.pid, 
                'name': p.name, 
                'state': p.state, 
                'type': p.type,
                'memory_usage': p.memory_usage
            } for p in self.processes.values()
        ]

# Global OS Instance
tiny_os = OperatingSystem()
