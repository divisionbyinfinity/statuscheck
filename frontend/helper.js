export async function ping(BaseUrl, ip) {
    return fetch(`${BaseUrl}/ping?ip=${ip}`)
        .then(response => response.json())
        .then(data => {
            return data
        }).catch(error => error)
}

export async function login(BaseUrl, username, password, filename) {
    return fetch(`${BaseUrl}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, filename }),
    })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(error => error)
}

export async function checkToken(BaseUrl, token) {
    return fetch(`${BaseUrl}/checktoken`, {
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
        },
    })
        .then(response => response.json())
        .then(data => {
            return data
        }).catch(error => error)
}

export async function fetchJSON(BaseUrl, fileName) {
    try {
        const response = await fetch(`${BaseUrl}/devices/${fileName}`);
        const data = await response.json();
        return data;
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function MailAlertEnable(BaseUrl, name, enableMailAlert, fileName, token) {
    return fetch(`${BaseUrl}/devices/device/${fileName}?deviceName=${name}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ enableMailAlert }),
    })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(error => error)
}

export async function UpdateSnooze(BaseUrl, name, minutes, fileName, token) {
    const payload = {
        name: name,
        minutes: minutes
    };
    console.log('UpdateSnooze request:', {
        url: `${BaseUrl}/devices/device/snooze/${fileName}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token.substring(0, 10)}...`
        },
        body: payload
    });
    return fetch(`${BaseUrl}/devices/device/snooze/${fileName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    })
    .then(response => response.json())
    .then(data => {
        return data
    })
    .catch(error => error)
}

export async function updateDevice(BaseUrl, body, fileName, name, token) {
    return fetch(`${BaseUrl}/devices/device/${fileName}?deviceName=${name}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    })
    .then(response => response.json())
    .then(data => {
        return data
    })
    .catch(error => error)
}

export async function addDevice(BaseUrl, body, fileName, token) {
    return fetch(`${BaseUrl}/devices/device/add/${fileName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    })
        .then(response => response.json())
        .then(data => {
        return data
        })
        .catch(error => error)
}

export async function deleteDevice(BaseUrl, fileName, name, token) {
    return fetch(`${BaseUrl}/devices/device/${fileName}?deviceName=${name}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'authorization': `Bearer ${token}`,
        }
    })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(error => error)
}

export function createSpinner() {
    const spinner = document.createElement('span');
    spinner.classList.add('spinner');
    spinner.textContent = '⏳';
    return spinner;
}

export function createButton(id, text, displayStyle = 'inline-block') {
    const button = document.createElement('button');
    button.id = id;
    button.classList.add('submitButton');
    button.style.display = displayStyle;
    button.textContent = text;
    return button;
}