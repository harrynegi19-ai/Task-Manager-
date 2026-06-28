const API_URL = 'https://task-manager-api-qm8u.onrender.com';
let isSignUpMode = false;

const getToken = () => localStorage.getItem('token');
const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

function checkSession() {
    const token = getToken();
    if (token) {
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('app-view').style.display = 'block';
        document.getElementById('user-display').innerText = localStorage.getItem('username');
        fetchTasks();
    } else {
        document.getElementById('auth-view').style.display = 'block';
        document.getElementById('app-view').style.display = 'none';
    }
}

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById('auth-title').innerText = isSignUpMode ? "Create Account" : "Welcome to Workspace";
    document.getElementById('auth-submit-btn').innerText = isSignUpMode ? "Sign Up" : "Log In";
    document.getElementById('auth-switch').innerHTML = isSignUpMode ? "Already have an account? <span>Log In</span>" : "Don't have an account? <span>Sign Up</span>";
}

async function handleAuth() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!username || !password) return alert("Please fill in all fields");

    const endpoint = isSignUpMode ? '/auth/signup' : '/auth/login';
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();

    if (data.error) return alert(data.error);

    if (isSignUpMode) {
        alert(data.message);
        toggleAuthMode();
    } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        checkSession();
    }
}

async function fetchTasks() {
    const response = await fetch(`${API_URL}/tasks`, { headers: getHeaders() });
    const tasks = await response.json();
    const container = document.getElementById('task-container');
    container.innerHTML = '';

    if(tasks.error) return logout();

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.innerHTML = `
            <div class="task-text ${task.completed ? 'completed' : ''}" onclick="toggleTask(${task.id}, ${task.completed})">
                <input type="checkbox" ${task.completed ? 'checked' : ''}>
                <span>${task.title}</span>
            </div>
            <button class="del-btn" onclick="event.stopPropagation(); deleteTask(${task.id});">Delete</button>
        `;
        container.appendChild(div);
    });
}

async function addTask() {
    const input = document.getElementById('task-title');
    const title = input.value.trim();
    if (!title) return;

    await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title })
    });
    input.value = '';
    fetchTasks();
}

async function toggleTask(id, currentStatus) {
    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ completed: !currentStatus })
    });
    fetchTasks();
}

async function deleteTask(id) {
    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
    });
    fetchTasks();
}

function logout() {
    localStorage.clear();
    checkSession();
}

window.addEventListener('DOMContentLoaded', checkSession);