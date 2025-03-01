function createProcess() {
    const processNames = [
        'Browser', 'Text Editor', 'Calculator', 
        'Media Player', 'System Monitor'
    ];
    const randomName = processNames[Math.floor(Math.random() * processNames.length)];

    fetch('/create_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: randomName,
            type: 'application',
            priority: Math.floor(Math.random() * 5)
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshProcessList();
            refreshSystemStatus();
        }
    });
}

function terminateProcess(pid) {
    fetch('/terminate_process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pid: pid })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            refreshProcessList();
            refreshSystemStatus();
        }
    });
}

function refreshProcessList() {
    fetch('/list_processes')
    .then(response => response.json())
    .then(processes => {
        const tableBody = document.getElementById('process-list-body');
        tableBody.innerHTML = '';
        processes.forEach(process => {
            const row = `
                <tr>
                    <td>${process.pid}</td>
                    <td>${process.name}</td>
                    <td>${process.type}</td>
                    <td>${process.memory_usage} MB</td>
                    <td>
                        <button onclick="terminateProcess('${process.pid}')">End</button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    });
}

function refreshSystemStatus() {
    fetch('/system_status')
    .then(response => response.json())
    .then(status => {
        document.getElementById('memory-usage').textContent = 
            `${status.used_memory}/${status.total_memory} MB`;
        document.getElementById('process-count').textContent = 
            status.running_processes;
    });
}

// Initial refresh
refreshProcessList();
refreshSystemStatus();
setInterval(refreshProcessList, 5000);
setInterval(refreshSystemStatus, 5000);
