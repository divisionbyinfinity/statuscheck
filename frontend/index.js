import { ping, fetchJSON, MailAlertEnable, UpdateSnooze, login, checkToken, updateDevice, deleteDevice, addDevice } from './helper.js';

// Specify the name of the configuration JSON file.
const CONFIG_FILE = 'config.json';  // default
let configFile = CONFIG_FILE;       // variable to hold the active config file

// Check if URL contains a "config" query parameter, e.g., ?config=devices_monitor
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('config')) {
    // Use the parameter's value and append ".json"
    configFile = urlParams.get('config') + '.json';
}

// Ping interval configuration (5 minutes in milliseconds)
const PING_INTERVAL = 5 * 60 * 1000;
// Snooze label update interval (30 seconds in milliseconds)
const SNOOZE_UPDATE_INTERVAL = 30 * 1000;


// Initialize the FILTER_KEYS object.
const FILTER_KEYS = {};

let servers = [];
let filteredServers = [];
let showManageAlert = false;
let ShowSnooze = false;
let showadminFeature = false;
let pageTitle, subTitle, description, BaseUrl, logo, contact, contactEmail, contactPhone, fileName, showAdmin, showAlertStatus;

// Store ping results to track non-responding devices
let pingResults = {};

// New variables for additional config values
let signInTitle, signInIcon, signInUrl;
let monitorTitle, monitorIcon, monitorUrl;
let endpointTitle, endpointIcon, endpointUrl;
let helpTitle, helpIcon, helpUrl;
let devTitle, devIcon, devUrl;
let user = null;
const userStr = localStorage.getItem('user');
try {
    if (userStr) user = JSON.parse(userStr);
} catch {
    user = null;
}

async function loadConfig() {
    await fetch(configFile)
        .then(response => response.json())
        .then(data => {
            console.log('Config loaded:', data);
            // Assign the values from the JSON to the variables
            pageTitle = data.pageTitle;
            subTitle = data.subTitle;
            description = data.description;
            BaseUrl = data.api;
            contact = data.contact;
            logo = data.logo;
            contactEmail = data['contact-email'];
            contactPhone = data['contact-phone'];
            fileName = data.fileName;
            showAdmin = data.showAdmin;
            showAlertStatus = data.showAlertStatus;

            // Assign new values from config
            signInTitle = data.sign_in_title;
            signInIcon = data.sign_in_icon;
            signInUrl = data.sign_in_url;

            monitorTitle = data.monitor_title;
            monitorIcon = data.monitor_icon;
            monitorUrl = data.monitor_url;

            endpointTitle = data.endpoint_title;
            endpointIcon = data.endpoint_icon;
            endpointUrl = data.endpoint_url;

            helpTitle = data.help_title;
            helpIcon = data.help_icon;
            helpUrl = data.help_url;

            devTitle = data.dev_title;
            devIcon = data.dev_icon;
            devUrl = data.dev_url;

            // Update the FILTER_KEYS from the config JSON.
            FILTER_KEYS.first_filter = data.firstFilter;
            FILTER_KEYS.second_filter = data.secondFilter;
        })
        .catch(error => console.error('Error loading config:', error));
}

const appendAlert = (message, isError) => {
    const showAlert = document.getElementById('showAlerts');
    const alertdiv = document.createElement('div');
    alertdiv.classList.add('alert');
    alertdiv.textContent = message;
    showAlert.style.display = 'flex';
    alertdiv.style.backgroundColor = isError ? 'red' : 'green';
    showAlert.appendChild(alertdiv);
    setTimeout(() => {
        if (showAlert.hasChildNodes()) {
            showAlert.removeChild(showAlert.firstChild);
        }
        if (!showAlert.hasChildNodes()) {
            showAlert.style.display = 'none';
        }
    }, 5000);
}

const adminLoginForm = async (e) => {
    const modalCont = document.getElementById('modalCont');
    e.preventDefault();
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    console.log('Login attempt:', { username, password, fileName });
    document.getElementById("modalSubmit").style.display = 'none';
    document.getElementById('modalSpinner').style.display = 'block';

    const res = await login(BaseUrl, username, password, fileName);
    document.getElementById('modalSpinner').style.display = 'none';
    document.getElementById("modalSubmit").style.display = 'block';
    if (!res.success) {
        appendAlert(res.message || res.error || 'No data found', true);
        showadminFeature = false;
        return;
    } else {
        user = res.data;
        modalCont.style.display = 'none';
        showadminFeature = true;
        localStorage.setItem('user', JSON.stringify(res.data));
        populateTable(); // Refresh table with admin features
        await pingdevices(); // Ping devices after table is rendered
    }
}

// Display statistics table after <h2 id="stats"></h2>
function displayStatsTable() {
    // Calculate statistics
    const totalDevices = filteredServers.length;
    const snoozedDevices = filteredServers.filter(server => server['snoozeTime'] > 0 && server['snoozed']).length;
    const alertsDisabledDevices = filteredServers.filter(server => server['Alert Enable'] === false).length;
    const notRespondingDevices = filteredServers.filter(server => pingResults[server.key] === false).length;

    // Try to find the stats h2 element
    let statsH2 = document.getElementById('stats');
    let insertionPoint = statsH2;
    let insertMethod = 'afterend';

    // Fallback to liveTable if stats h2 is not found
    if (!statsH2) {
        console.warn('Stats h2 element not found, falling back to before liveTable');
        insertionPoint = document.getElementById('liveTable');
        insertMethod = 'beforebegin';
        if (!insertionPoint) {
            console.error('LiveTable not found, cannot insert stats table');
            return;
        }
    }

    // Create or update stats table
    let statsTable = document.getElementById('statsTable');
    if (!statsTable) {
        statsTable = document.createElement('table');
        statsTable.id = 'statsTable';
        insertionPoint.insertAdjacentElement(insertMethod, statsTable);
    }

    // Populate stats table
    statsTable.innerHTML = `
        <tbody>
            <tr>
                <td class="stattype">Devices Total: </td>
                <td class="statistic">${totalDevices}</td>
                <td class="stattype">Devices Not Responding: </td>
                <td class="statistic">${notRespondingDevices}</td>
                <td class="stattype">Devices Snoozed: </td>
                <td class="statistic">${snoozedDevices}</td>
                <td class="stattype">Devices Alerts Disabled: </td>
                <td class="statistic">${alertsDisabledDevices}</td>
            </tr>
        </tbody>
    `;
}

const preProcess = async () => {
    await loadConfig();
    // Validate any stored admin token
    const stored = localStorage.getItem('user');
    if (stored) {
        try {
            user = JSON.parse(stored);
            const tokenRes = await checkToken(BaseUrl, user.token);
            showadminFeature = tokenRes.success;
            if (!tokenRes.success) localStorage.removeItem('user');
        } catch {
            showadminFeature = false;
            localStorage.removeItem('user');
        }
    }

    const res = await fetchJSON(BaseUrl, fileName);
    if (res && typeof res === 'object') {
        servers = res;
    } else {
        appendAlert('Failed to load devices', true);
    }

    document.getElementById('pagetitle').textContent = pageTitle;
    document.getElementById('subtitle').textContent = subTitle;
    const descriptionEl = document.getElementById('description');
    descriptionEl.textContent = description;
    document.getElementById('contact').textContent = contact;
    // Append logo image instead of overwriting innerHTML to preserve timer
    const logoContainer = document.getElementById('logo');
    const logoImg = document.createElement('img');
    logoImg.src = `images/${logo}`;
    logoImg.alt = 'Logo';
    logoContainer.appendChild(logoImg);

    // Helper function to format a 10-digit phone number as (XXX)XXX-XXXX.
    function formatPhoneNumber(phoneNumber) {
        const cleaned = ('' + phoneNumber).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        return match ? `(${match[1]})${match[2]}-${match[3]}` : phoneNumber;
    }

    const contactEmailEl = document.getElementById('contactemail');
    contactEmailEl.innerHTML = `<a href="mailto:${contactEmail}" alt="Email Support">${contactEmail}</a>`;

    const formattedPhone = formatPhoneNumber(contactPhone);
    const contactPhoneEl = document.getElementById('contactphone');
    contactPhoneEl.innerHTML = `<a href="tel:${contactPhone}" alt="Email Support">${formattedPhone}</a>`;

    // Update Sign In section
    if (signInTitle && signInTitle.trim() !== "") {
        const signInP = document.getElementById('sign_in_title');
        signInP.style.display = "flex";
        const signInA = document.getElementById('sign_in_url');
        signInA.href = signInUrl;
        signInA.alt = signInTitle;
        signInA.title = signInTitle;
        const signInImg = document.getElementById('sign_in_icon');
        signInImg.src = "images/" + signInIcon;
        if (signInA.childNodes.length === 1) {
            signInA.append(document.createTextNode(signInTitle));
        }
    }

    // Update Monitor section
    if (monitorTitle && monitorTitle.trim() !== "") {
        const monitorP = document.getElementById('monitor_title');
        monitorP.style.display = "flex";
        const monitorA = document.getElementById('monitor_url');
        monitorA.href = monitorUrl;
        monitorA.alt = monitorTitle;
        monitorA.title = monitorTitle;
        const monitorImg = document.getElementById('monitor_icon');
        monitorImg.src = "images/" + monitorIcon;
        if (monitorA.childNodes.length === 1) {
            monitorA.append(document.createTextNode(monitorTitle));
        }
    }

    // Update Endpoint section
    if (endpointTitle && endpointTitle.trim() !== "") {
        const endpointP = document.getElementById('endpoint_title');
        endpointP.style.display = "flex";
        const endpointA = document.getElementById('endpoint_url');
        endpointA.href = endpointUrl;
        endpointA.alt = endpointTitle;
        endpointA.title = endpointTitle;
        const endpointImg = document.getElementById('endpoint_icon');
        endpointImg.src = "images/" + endpointIcon;
        if (endpointA.childNodes.length === 1) {
            endpointA.append(document.createTextNode(endpointTitle));
        }
    }

    // Update Help section
    if (helpTitle && helpTitle.trim() !== "") {
        const helpP = document.getElementById('help_title');
        helpP.style.display = "flex";
        const helpA = document.getElementById('help_url');
        helpA.href = helpUrl;
        helpA.alt = helpTitle;
        helpA.title = helpTitle;
        const helpImg = document.getElementById('help_icon');
        helpImg.src = "images/" + helpIcon;
        if (helpA.childNodes.length === 1) {
            helpA.append(document.createTextNode(helpTitle));
        }
    }

    // Update Dev (Videowall) section
    if (devTitle && devTitle.trim() !== "") {
        const devP = document.getElementById('dev_title');
        devP.style.display = "flex";
        const devA = document.getElementById('dev_link');
        devA.href = devUrl;
        devA.alt = devTitle;
        devA.title = devTitle;
        const devImg = document.getElementById('dev_icon');
        devImg.src = "images/" + devIcon;
        if (devA.childNodes.length === 1) {
            devA.append(document.createTextNode(devTitle));
        }
    }

    const adminControl = document.getElementById('adminControl');
    adminControl.addEventListener('click', async function (e) {
        e.preventDefault();
        const modalCont = document.getElementById('modalCont');
        const modal = document.getElementById('modal');
        modal.classList.add('modalcss');
        modal.innerHTML = ''; // Clear previous modal content

        // Check user token
        let user = localStorage.getItem('user');
        if (user) {
            try {
                user = JSON.parse(user);
                const res = await checkToken(BaseUrl, user.token);
                showadminFeature = res.success;
                if (!res.success) {
                    localStorage.removeItem('user');
                    user = null;
                    appendAlert(res.message || res.error || 'Session expired', true);
                }
            } catch {
                localStorage.removeItem('user');
                user = null;
                showadminFeature = false;
            }
        } else {
            showadminFeature = false;
        }

        if (showadminFeature && user) {
            modal.innerHTML = `
                <form id="logoutForm">
                    <header>Logout</header>
                    <main>
                        <label>Are you sure you want to logout?</label>
                    </main>
                    <footer>
                        <button type="button" id="closeModal">No</button>
                        <button type="submit" id="modalSubmit">Yes</button>
                        <div class="spinner" style="display:none" id="modalSpinner"></div>
                    </footer>
                </form>
            `;
            modal.querySelector('#closeModal').addEventListener('click', function (e) {
                e.preventDefault();
                modalCont.style.display = 'none';
            });
            modal.querySelector('form').addEventListener('submit', async function (e) {
                e.preventDefault();
                console.log('Logout form submitted');
                document.getElementById('modalSubmit').style.display = 'none';
                document.getElementById('modalSpinner').style.display = 'block';
                localStorage.removeItem('user');
                showadminFeature = false;
                modalCont.style.display = 'none';
                appendAlert('Logged out successfully', false);
                populateTable();
                await pingdevices();
                document.getElementById('modalSpinner').style.display = 'none';
                document.getElementById('modalSubmit').style.display = 'block';
            });
            modalCont.style.display = 'flex';
        } else {
            modal.innerHTML = `
                <form id="adminLoginForm">
                    <header>Login</header>
                    <main>
                        <div>
                            <label for="username" class="username-label">Username :- </label>
                            <input type="text" id="username" name="username" placeholder="Enter username" minlength="5" maxlength="30" required/>
                        </div>
                        <div>
                            <label for="password" class="passwd-label">Password :- </label>
                            <input type="password" id="password" name="password" placeholder="Enter password" minlength="5" maxlength="30" required />
                        </div>
                    </main>
                    <footer>
                        <button type="button" id="closeModal">Close</button>
                        <button type="submit" id="modalSubmit">Submit</button>
                        <div class="spinner" style="display:none" id="modalSpinner"></div>
                    </footer>
                </form>
            `;
            modal.querySelector('#closeModal').addEventListener('click', function (e) {
                e.preventDefault();
                modalCont.style.display = 'none';
            });
            modal.querySelector('form').addEventListener('submit', adminLoginForm);
            modalCont.style.display = 'flex';
        }
    });

    if (!servers || servers.length === 0) {
        appendAlert('No data found', true);
    }

    // ===== Updated filtering code using FILTER_KEYS =====
    const firstFilterKey = FILTER_KEYS.first_filter;
    const secondFilterKey = FILTER_KEYS.second_filter;
    const deviceTypes = [...new Set(Object.values(servers).map(server => server[firstFilterKey]))]
                        .sort((a, b) => a.localeCompare(b));
    const locations = [...new Set(Object.values(servers).map(server => server[secondFilterKey]))]
                      .sort((a, b) => a.localeCompare(b));
    const typeSelector = document.querySelector('#typeSelector');
    const locationSelector = document.querySelector('#locationSelector');

    // Clear previous options if any
    typeSelector.innerHTML = '';
    locationSelector.innerHTML = '';

    // Add default header options using the filter keys as labels
    typeSelector.append(new Option(firstFilterKey, ""));
    locationSelector.append(new Option(secondFilterKey, ""));

    deviceTypes.forEach(type => {
        typeSelector.append(new Option(type, type));
    });
    locations.forEach(location => {
        locationSelector.append(new Option(location, location));
    });
    // ===== End updated filtering code =====

    const goButton = document.querySelector('.submit');
    goButton.addEventListener('click', async function (e) {
        e.preventDefault();
        populateTable();
        await pingdevices(); // Trigger ping test after table is repopulated
    });

    // Start countdown timer for ping interval
    function startCountdown() {
        let startTime = Date.now();
        const updateTimer = () => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, PING_INTERVAL - (elapsed % PING_INTERVAL));
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            const timerP = document.querySelector('#timer p');
            if (timerP) {
                timerP.textContent = formattedTime;
            } else {
                console.warn('Timer element (#timer p) not found in the DOM');
            }
            // Reset startTime when a new cycle begins
            if (remaining === 0) {
                startTime = Date.now();
            }
        };

        // Update immediately and then every second
        updateTimer();
        return setInterval(updateTimer, 1000);
    }

    // Initialize timer by observing the DOM for #timer p
    function initTimer() {
        let timerInterval = null;

        // Check if #timer p already exists (static HTML case)
        const checkTimerElement = () => {
            const timerP = document.querySelector('#timer p');
            if (timerP) {
                console.log('Found #timer p element, starting countdown');
                timerInterval = startCountdown();
                return true;
            }
            return false;
        };

        // If found immediately, no need for observer
        if (checkTimerElement()) {
            return;
        }

        // Set up MutationObserver to detect #timer p addition
        const observer = new MutationObserver((mutations, obs) => {
            if (checkTimerElement()) {
                obs.disconnect(); // Stop observing once found
            }
        });

        // Observe changes to the entire document
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Fallback: Stop observing after 30 seconds if not found
        setTimeout(() => {
            if (!timerInterval) {
                observer.disconnect();
                console.error('Failed to find #timer p element after 30 seconds');
            }
        }, 30000);
    }

    // Update row styles to show snooze status and alert status
    async function updateRowStyles() {
        filteredServers.forEach(async (server, index) => {
            const row = document.getElementById(`row-${index}`);
            if (!row) return;

            // Handle snooze status
            if (server['snoozeTime'] > 0 && server['snoozed'] && server['snoozeStartTime']) {
                const elapsedMinutes = (Date.now() - server['snoozeStartTime']) / (1000 * 60);
                const remainingMinutes = Math.max(0, Math.ceil(server['snoozeTime'] - elapsedMinutes));
                const snoozeLabel = row.querySelector('.snooze-label');
                const snoozeImage = row.querySelector('.snooze-icon');
                if (snoozeLabel && snoozeImage) {
                    if (remainingMinutes > 0) {
                        snoozeLabel.textContent = `${remainingMinutes}m`;
                        snoozeImage.title = `Expiring in ${remainingMinutes} min`;
                        snoozeImage.src = './images/snoozeon.png';
                        row.classList.add('snoozed-row');
                    } else {
                        // Snooze expired, reset state
                        server['snoozeTime'] = 0;
                        server['snoozed'] = false;
                        server['snoozeStartTime'] = null;
                        snoozeLabel.textContent = '';
                        snoozeImage.title = 'Not snoozed';
                        snoozeImage.src = './images/snooze.png';
                        row.classList.remove('snoozed-row');
                        // Sync with backend
                        if (user?.token) {
                            await UpdateSnooze(BaseUrl, server.key, 0, fileName, user.token);
                        }
                    }
                }
            } else {
                // Ensure non-snoozed rows don't have snoozed-row class
                row.classList.remove('snoozed-row');
            }

            // Handle alert status
            if (server['Alert Enable'] === false) {
                row.classList.add('alerts-disabled-row');
            } else {
                row.classList.remove('alerts-disabled-row');
            }
        });
    }

    // Expose initTimer globally for jQuery .load() callback
    window.initTimer = initTimer;

    populateTable();
    pingdevices(); // Initial ping on page load
    initTimer(); // Initialize the countdown timer
    setInterval(updateRowStyles, SNOOZE_UPDATE_INTERVAL); // Update snooze and alert status periodically
}

const populateTable = () => {
    // Use FILTER_KEYS with the new keys for filtering the devices.
    const selectedType = document.querySelector('#typeSelector').value;
    const selectedLocation = document.querySelector('#locationSelector').value;

    // Include the device key in filteredServers
    filteredServers = Object.entries(servers)
        .map(([key, server]) => ({ key, ...server }))
        .filter((server) => {
            return (!selectedType || server[FILTER_KEYS.first_filter] === selectedType) &&
                   (!selectedLocation || server[FILTER_KEYS.second_filter] === selectedLocation);
        });
    // Optional: sort the filtered entries by the first filter key ("Device Type")
    filteredServers.sort((a, b) => a[FILTER_KEYS.first_filter].localeCompare(b[FILTER_KEYS.first_filter]));

    const tableHead = document.querySelector('#liveTable thead');
    tableHead.innerHTML = '';
    const tableBody = document.querySelector('#liveTable tbody');
    tableBody.innerHTML = '';
    const headerRow = document.createElement('tr');

    const pingHeader = document.createElement('th');
    pingHeader.textContent = 'Update';
    if (showadminFeature) {
        pingHeader.style.display = 'none';
    }
    headerRow.appendChild(pingHeader);

    // Updated headers to include 'Description' between 'DNS Name' and 'Owner'
    const headers = ['DNS Name', 'Description', 'Owner', 'Location', 'Department', 'IP Address', 'DeviceType', 'Connect'];
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        th.classList.add('sortable');
        headerRow.appendChild(th);
    });
    if (showadminFeature) {
        headerRow.lastChild.style.display = 'none';
    }

    if (showadminFeature) {
        const th = document.createElement('th');
        const div = document.createElement('div');
        const span1 = document.createElement('span');
        span1.textContent = 'Admin';
        const span2 = document.createElement('span');
        const img = document.createElement('img');
        img.src = './images/plus.png';
        img.title = 'Add Device';
        img.alt = 'Add Device';
        img.width = '20';
        img.style.cursor = 'pointer';
        img.addEventListener('click', function (e) {
            e.preventDefault();
            const modalCont = document.getElementById('modalCont');
            modalCont.style.display = 'flex';
            const modal = document.getElementById('modal');
            modal.classList.add('modalcss');
            modal.innerHTML = `
                <form id="addDeviceForm">
                    <header>Add Device</header>
                    <main>
                        <div>
                            <label for="DNS Name">DNS NAME:-</label>
                            <input type="text" id="DNS-Name" name="DNS Name" required placeholder="Enter DNS Name" />
                        </div>
                        <div>
                            <label for="Description">Description:-</label>
                            <input type="text" id="Description" name="Description" required placeholder="Enter Description" />
                        </div>
                        <div>
                            <label for="Owner">Owner:-</label>
                            <input type="text" id="Owner" name="Owner" required placeholder="Enter Owner" />
                        </div>
                        <div>
                            <label for="Department">Department:-</label>
                            <input type="text" id="Department" name="Department" required placeholder="Enter Department" />
                        </div>
                        <div>
                            <label for="Location">Location</label>
                            <input type="text" id="Location" name="Location" required placeholder="Enter Location" />
                        </div>
                        <div>
                            <label for="IP Address">IP Address</label>
                            <input type="text" id="IPAddress" name="IP Address" required placeholder="Enter IP Address" />
                        </div>
                        <div>
                            <label for="Device Type">Device Type</label>
                            <input type="text" id="DeviceType" name="Device Type" required placeholder="Enter Device Type" />
                        </div>
                        <div>
                            <label for="Actions">Actions</label>
                            <Select id="Actions" name="Actions" required>
                                <option value="SSH">SSH</option>
                                <option value="HTTP">HTTP</option>
                                <option value="HTTPS">HTTPS</option>
                                <option value="VNC">VNC</option>
                                <option value="RDP">RDP</option>
                                <option value="SFTP">SFTP</option>
                                <option value="PORTAL">PORTAL</option>
                            </Select>
                        </div>
                    </main>
                    <footer>
                        <button type="button" id="closeModal">Close</button>
                        <button type="submit" id="modalSubmit">Submit</button>
                        <div class="spinner" style="display:none" id="modalSpinner"></div>
                    </footer>
                </form>
            `;
            modal.querySelector('#closeModal').addEventListener('click', function (e) {
                e.preventDefault();
                modalCont.style.display = 'none';
            });
            modal.querySelector('form').addEventListener('submit', async function (e) {
                e.preventDefault();
                const deviceObj = {};
                const form = e.target;
                const formData = new FormData(form);
                formData.forEach((value, key) => {
                    deviceObj[key] = value;
                });
                document.getElementById("modalSubmit").style.display = 'none';
                document.getElementById('modalSpinner').style.display = 'block';
                const res = await addDevice(BaseUrl, deviceObj, fileName, user.token);
                document.getElementById('modalSpinner').style.display = 'none';
                document.getElementById("modalSubmit").style.display = 'block';
                if (res.success) {
                    modalCont.style.display = 'none';
                    appendAlert(res.message, false);
                    preProcess();
                } else {
                    appendAlert(res.message || res.error || 'No data found', true);
                }
            });
        });
        span2.appendChild(img);
        div.appendChild(span1);
        div.appendChild(span2);
        th.textContent = '';
        th.appendChild(div);
        th.classList.add('adminFeatureth');
        headerRow.appendChild(th);
    }
    tableHead.appendChild(headerRow);

    filteredServers.forEach(function (server, index) {
        // Check if snooze has expired
        if (server['snoozeTime'] > 0 && server['snoozed'] && server['snoozeStartTime']) {
            const elapsedMinutes = (Date.now() - server['snoozeStartTime']) / (1000 * 60);
            const remainingMinutes = Math.max(0, Math.ceil(server['snoozeTime'] - elapsedMinutes));
            if (remainingMinutes <= 0) {
                server['snoozeTime'] = 0;
                server['snoozed'] = false;
                server['snoozeStartTime'] = null;
                if (user?.token) {
                    UpdateSnooze(BaseUrl, server.key, 0, fileName, user.token);
                }
            }
        }

        const row = document.createElement('tr');
        row.id = `row-${index}`;
        if (server['snoozeTime'] > 0 && server['snoozed']) {
            row.classList.add('snoozed-row');
        }
        if (server['Alert Enable'] === false) {
            row.classList.add('alerts-disabled-row');
        }

        const pingCell = document.createElement('td');
        const pingButton = document.createElement('button');
        pingButton.id = `ping-${index}`;
        pingButton.textContent = 'PING';
        pingCell.appendChild(pingButton);
        if (!showadminFeature) {
            row.appendChild(pingCell);
        }

        const nameCell = document.createElement('td');
        nameCell.textContent = server['DNS Name'];
        row.appendChild(nameCell);

        const descriptionCell = document.createElement('td');
        descriptionCell.textContent = server['Description'] || 'N/A';
        row.appendChild(descriptionCell);

        const ownerCell = document.createElement('td');
        ownerCell.textContent = server['Owner'];
        row.appendChild(ownerCell);

        const locationCell = document.createElement('td');
        locationCell.textContent = server['Location'];
        row.appendChild(locationCell);

        const departmentCell = document.createElement('td');
        departmentCell.textContent = server['Department'];
        row.appendChild(departmentCell);

        const ipCell = document.createElement('td');
        ipCell.textContent = server['IP Address'];
        row.appendChild(ipCell);

        const typeCell = document.createElement('td');
        typeCell.textContent = server['Device Type'];
        row.appendChild(typeCell);

        const actionsCell = document.createElement('td');
        if (server['Actions']) {
            if (server['Actions'] === 'SSH') {
                actionsCell.innerHTML = `<a class="ctr" href="ssh://${server['IP Address']}" target="_blank">SSH</a>`;
            } else if (server['Actions'] === 'HTTP') {
                actionsCell.innerHTML = `<a class="ctr" href="https://${server['IP Address']}" target="_blank">HTTP</a>`;
            } else if (server['Actions'] === 'HTTPS') {
                actionsCell.innerHTML = `<a class="ctr" href="https://${server['IP Address']}" target="_blank">HTTPS</a>`;
            } else if (server['Actions'] === 'SFTP') {
                actionsCell.innerHTML = `<a class="ctr" href="sftp://${server['IP Address']}" target="_blank">SFTP</a>`;
            } else if (server['Actions'] === 'VNC') {
                actionsCell.innerHTML = `<a class="ctr" href="vnc://${server['IP Address']}" target="_blank">VNC</a>`;
            } else if (server['Actions'] === 'RDP') {
                actionsCell.innerHTML = `<a class="ctr" href="rdp://${server['IP Address']}" target="_blank">RDP</a>`;
            } else if (server['Actions'].toUpperCase() === 'PORTAL' && server['Portal']) {
                actionsCell.innerHTML = `<a class="ctr" href="https://${server['Portal']}" target="_blank">Portal</a>`;
            } else {
                actionsCell.innerHTML = `<a class="ctr" href="${server['Actions']}" target="_blank">Visit</a>`;
            }
        } else {
            actionsCell.textContent = 'N/A';
        }
        row.appendChild(actionsCell);

        if (showadminFeature) {
            row.lastChild.style.display = 'none';
            const adminFeatureCell = document.createElement('td');
            adminFeatureCell.classList.add('adminFeaturetd');

            const status = document.createElement('span');
            const statusImage = document.createElement('img');
            statusImage.src = server['Alert Enable'] ? './images/switch.png' : './images/off-button.png';
            statusImage.title = server['Alert Enable'] ? 'Alert Enable' : 'Alert Disable';
            statusImage.alt = 'Toggle alert status';
            statusImage.addEventListener('click', async function (e) {
                e.preventDefault();
                const newStatus = !server['Alert Enable'];
                const res = await MailAlertEnable(BaseUrl, server.key, newStatus, fileName, user.token);
                if (res.success) {
                    appendAlert(res.message, false);
                    server['Alert Enable'] = newStatus;
                    e.target.src = newStatus ? './images/switch.png' : './images/off-button.png';
                    e.target.title = newStatus ? 'Alert Enable' : 'Alert Disable';
                    const row = e.target.closest('tr');
                    if (newStatus) {
                        row.classList.remove('alerts-disabled-row');
                    } else {
                        row.classList.add('alerts-disabled-row');
                    }
                    displayStatsTable(); // Update stats after alert status change
                } else {
                    appendAlert(res.message || res.error || 'No data found', true);
                }
            });
            status.appendChild(statusImage);
            adminFeatureCell.appendChild(status);

            const snoozeCell = document.createElement('div');
            snoozeCell.classList.add('snooze-wrapper');
            const snoozeImage = document.createElement('img');
            snoozeImage.classList.add('snooze-icon');
            const isSnoozed = server['snoozeTime'] && server['snoozeTime'] > 0 && server['snoozed'];
            snoozeImage.src = isSnoozed ? './images/snoozeon.png' : './images/snooze.png';
            snoozeImage.title = isSnoozed
                ? `Expiring in ${server['snoozeTime']} min`
                : 'Not snoozed';
            const snoozeLabel = document.createElement('span');
            snoozeLabel.classList.add('snooze-label');
            let remainingMinutes = 0;
            if (isSnoozed && server['snoozeStartTime']) {
                const elapsedMinutes = (Date.now() - server['snoozeStartTime']) / (1000 * 60);
                remainingMinutes = Math.max(0, Math.ceil(server['snoozeTime'] - elapsedMinutes));
                snoozeLabel.textContent = remainingMinutes > 0 ? `${remainingMinutes}m` : '';
                snoozeImage.title = remainingMinutes > 0 ? `Expiring in ${remainingMinutes} min` : 'Not snoozed';
                snoozeImage.src = remainingMinutes > 0 ? './images/snoozeon.png' : './images/snooze.png';
            } else {
                snoozeLabel.textContent = '';
            }
            snoozeCell.appendChild(snoozeImage);
            snoozeCell.appendChild(snoozeLabel);
            snoozeImage.addEventListener('click', async function (e) {
                e.preventDefault();
                const modalCont = document.getElementById('modalCont');
                modalCont.style.display = 'flex';
                const modal = document.getElementById('modal');
                modal.classList.add('modalcss');
                modal.innerHTML = `
                    <form id="snoozeForm">
                        <header>Snooze</header>
                        <main>
                            <div>
                                <label for="snooze">Snooze Time (in Minutes) :- </label>
                                <input type="number" id="snooze" name="snooze" required placeholder="Enter snooze time in minutes" min="0" max="4320" />
                            </div>
                        </main>
                        <footer>
                            <button type="button" id="closeModal">Close</button>
                            <button type="submit" id="modalSubmit">Submit</button>
                            <div class="spinner" style="display:none" id="modalSpinner"></div>
                        </footer>
                    </form>
                `;
                modal.querySelector('#closeModal').addEventListener('click', function (e) {
                    e.preventDefault();
                    modalCont.style.display = 'none';
                });
                modal.querySelector('form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const snoozeTime = parseInt(document.getElementById('snooze').value, 10);
                    if (isNaN(snoozeTime) || snoozeTime < 0 || snoozeTime > 4320) {
                        appendAlert('Snooze time must be between 0 and 4320 minutes', true);
                        return;
                    }
                    document.getElementById("modalSubmit").style.display = 'none';
                    document.getElementById('modalSpinner').style.display = 'block';
                    const res = await UpdateSnooze(BaseUrl, server.key, snoozeTime, fileName, user.token);
                    document.getElementById('modalSpinner').style.display = 'none';
                    document.getElementById("modalSubmit").style.display = 'block';
                    if (res.success) {
                        modalCont.style.display = 'none';
                        server['snoozeTime'] = res.data?.snoozeTime || snoozeTime;
                        server['snoozed'] = res.data?.snoozed || snoozeTime > 0;
                        server['snoozeStartTime'] = res.data?.snoozeStartTime || (snoozeTime > 0 ? Date.now() : null);
                        if (server['snoozeTime'] > 0) {
                            snoozeImage.title = `Expiring in ${server['snoozeTime']} min`;
                            snoozeLabel.textContent = `${server['snoozeTime']}m`;
                            row.classList.add('snoozed-row');
                        } else {
                            snoozeImage.title = 'Not snoozed';
                            snoozeLabel.textContent = '';
                            row.classList.remove('snoozed-row');
                        }
                        snoozeImage.src = server['snoozeTime'] > 0 ? './images/snoozeon.png' : './images/snooze.png';
                        appendAlert(res.message, false);
                        displayStatsTable(); // Update stats after snooze change
                    } else {
                        appendAlert(res.message || res.error || 'Failed to update snooze', true);
                    }
                });
            });
            adminFeatureCell.appendChild(snoozeCell);

            const editCell = document.createElement('span');
            const editImage = document.createElement('img');
            editImage.src = './images/edit.png';
            editImage.title = 'Edit';
            editImage.alt = 'Edit';
            editCell.appendChild(editImage);
            editImage.addEventListener('click', async function (e) {
                e.preventDefault();
                const modalCont = document.getElementById('modalCont');
                modalCont.style.display = 'flex';
                const modal = document.getElementById('modal');
                modal.classList.add('modalcss');
                modal.innerHTML = `
                    <form id="editForm">
                        <header>Edit</header>
                        <main>
                            <div>
                                <label for="DNS Name">DNS NAME:-</label>
                                <input type="text" id="DNS-Name" name="DNS Name" required placeholder="Enter DNS Name" />
                            </div>
                            <div>
                                <label for="Description">Description:-</label>
                                <input type="text" id="Description" name="Description" required placeholder="Enter Description" />
                            </div>
                            <div>
                                <label for="Owner">Owner:-</label>
                                <input type="text" id="Owner" name="Owner" required placeholder="Enter Owner" />
                            </div>
                            <div>
                                <label for="Department">Department:-</label>
                                <input type="text" id="Department" name="Department" required placeholder="Enter Department" />
                            </div>
                            <div>
                                <label for="Location">Location</label>
                                <input type="text" id="Location" name="Location" required placeholder="Enter Location" />
                            </div>
                            <div>
                                <label for="IP Address">IP Address</label>
                                <input type="text" id="IPAddress" name="IP Address" required placeholder="Enter IP Address" />
                            </div>
                            <div>
                                <label for="Device Type">Device Type</label>
                                <input type="text" id="DeviceType" name="Device Type" required placeholder="Enter Device Type" />
                            </div>
                            <div>
                                <label for="Actions">Actions</label>
                                <Select id="Actions" name="Actions" required>
                                    <option value="SSH">SSH</option>
                                    <option value="HTTP">HTTP</option>
                                    <option value="HTTPS">HTTPS</option>
                                    <option value="VNC">VNC</option>
                                    <option value="RDP">RDP</option>
                                    <option value="SFTP">SFTP</option>
                                    <option value="PORTAL">PORTAL</option>
                                </Select>
                            </div>
                            <div id="portalField" style="display:none">
                                <label for="Portal">Portal URL (hostname only)</label>
                                <input type="text" id="Portal" name="Portal" placeholder="e.g. portal.example.com"/>
                            </div>
                        </main>
                        <footer>
                            <button type="button" id="closeModal">Close</button>
                            <button type="submit" id="modalSubmit">Submit</button>
                            <div class="spinner" style="display:none" id="modalSpinner"></div>
                        </footer>
                    </form>
                `;
                Object.keys(server).forEach(key => {
                    const input = modal.querySelector(`input[name="${key}"]`);
                    if (input) {
                        input.value = server[key];
                    }
                    const select = modal.querySelector(`select[name="${key}"]`);
                    if (select && server[key]) {
                        const match = Array.from(select.options).find(opt => opt.value.toUpperCase() === server[key].toUpperCase());
                        if (match) {
                            select.value = match.value;
                        }
                    }
                });
                const actionSelect = modal.querySelector('select[name="Actions"]');
                const portalField = modal.querySelector('#portalField');
                const portalInput = modal.querySelector('input[name="Portal"]');
                if (actionSelect.value.toUpperCase() === 'PORTAL') {
                    portalField.style.display = 'block';
                    portalInput.value = server['Portal'] || '';
                } else {
                    portalField.style.display = 'none';
                }
                actionSelect.addEventListener('change', function () {
                    if (this.value.toUpperCase() === 'PORTAL') {
                        portalField.style.display = 'block';
                    } else {
                        portalField.style.display = 'none';
                        portalInput.value = '';
                    }
                });
                modal.querySelector('#closeModal').addEventListener('click', function (e) {
                    e.preventDefault();
                    modalCont.style.display = 'none';
                });
                modal.querySelector('form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const deviceObj = {};
                    const form = e.target;
                    const formData = new FormData(form);
                    formData.forEach((value, key) => {
                        deviceObj[key] = value;
                    });
                    const res = await updateDevice(BaseUrl, deviceObj, fileName, server.key, user.token);
                    if (res.success) {
                        modalCont.style.display = 'none';
                        appendAlert(res.message, false);
                        Object.keys(deviceObj).forEach(key => {
                            server[key] = deviceObj[key];
                        });
                        populateTable();
                    } else {
                        appendAlert(res.message || res.error || 'No data found', true);
                    }
                });
            });
            adminFeatureCell.appendChild(editCell);

            const removeCell = document.createElement('span');
            const removeImage = document.createElement('img');
            removeImage.src = './images/remove.png';
            removeImage.title = 'Delete';
            removeImage.alt = 'Delete';
            removeCell.appendChild(removeImage);
            removeImage.addEventListener('click', async function (e) {
                e.preventDefault();
                const modalCont = document.getElementById('modalCont');
                modalCont.style.display = 'flex';
                const modal = document.getElementById('modal');
                modal.classList.add('modalcss');
                modal.innerHTML = `
                    <form id="deleteForm">
                        <header>Delete</header>
                        <main>
                            <label for="delete"><h2>Are you sure you want to delete </h2> <h2>" ${server['DNS Name']}" ?</h2> </label>
                        </main>
                        <footer>
                            <button type="button" id="closeModal">No</button>
                            <button type="submit" id="modalSubmit">Yes</button>
                            <div class="spinner" style="display:none" id="modalSpinner"></div>
                        </footer>
                    </form>
                `;
                modal.querySelector('#closeModal').addEventListener('click', function (e) {
                    e.preventDefault();
                    modalCont.style.display = 'none';
                });
                modal.querySelector('form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const res = await deleteDevice(BaseUrl, fileName, server.key, user.token);
                    if (res.success) {
                        appendAlert(res.message, false);
                        modalCont.style.display = 'none';
                        preProcess();
                    } else {
                        appendAlert(res.message || res.error || 'No data found', true);
                    }
                });
            });
            adminFeatureCell.appendChild(removeCell);
            row.appendChild(adminFeatureCell);
        }
        tableBody.appendChild(row);
    });

    // Append bottom bar row
    const headerRowCount = document.querySelector('#liveTable thead tr');
    const colCount = headerRowCount ? headerRowCount.children.length : 1;
    const bottomRow = document.createElement('tr');
    bottomRow.classList.add('bottombar');
    const bottomTd = document.createElement('td');
    bottomTd.setAttribute('colspan', colCount);
    bottomRow.appendChild(bottomTd);
    tableBody.appendChild(bottomRow);

    // Attach ping button event listeners
    filteredServers.forEach((server, index) => {
        const row = document.getElementById(`row-${index}`);
        const pingButton = row.querySelector(`#ping-${index}`);
        if (pingButton) {
            pingButton.addEventListener('click', async function (e) {
                e.preventDefault();
                if (server['snoozeTime'] > 0 && server['snoozed']) {
                    appendAlert(`${server['DNS Name']} is snoozed and cannot be pinged`, true);
                    return;
                }
                row.classList.remove('pinged-trying', 'pinged-success', 'pinged-failure');
                row.classList.add('pinged', 'pinged-trying');
                const res = await ping(BaseUrl, server['IP Address']);
                row.classList.remove('pinged-trying');
                row.classList.add(res.alive ? 'pinged-success' : 'pinged-failure');
                pingResults[server.key] = res.alive; // Update ping result
                displayStatsTable(); // Update stats after ping
            });
        }
    });

    displayStatsTable(); // Display statistics after table is populated
}

const pingdevices = async () => {
    console.log('pingdevices called at', new Date().toISOString());
    if (filteredServers.length === 0) {
        console.log('No devices to ping (filteredServers is empty)');
        displayStatsTable(); // Update stats even if no devices
        return;
    }
    for (const [index, server] of filteredServers.entries()) {
        if (server['snoozeTime'] > 0 && server['snoozed']) {
            console.log(`Skipping ping for snoozed device: ${server['DNS Name']}`);
            continue; // Skip snoozed devices
        }
        const row = document.getElementById(`row-${index}`);
        if (row) {
            console.log(`Pinging device: ${server['DNS Name']} (IP: ${server['IP Address']})`);
            row.classList.remove('pinged-trying', 'pinged-success', 'pinged-failure');
            row.classList.add('pinged', 'pinged-trying');
            try {
                const res = await ping(BaseUrl, server['IP Address']);
                row.classList.remove('pinged-trying');
                row.classList.add(res.alive ? 'pinged-success' : 'pinged-failure');
                pingResults[server.key] = res.alive; // Update ping result
                console.log(`Ping result for ${server['DNS Name']}: ${res.alive ? 'Success' : 'Failure'}`);
            } catch (error) {
                console.error(`Ping failed for ${server['DNS Name']}:`, error);
                row.classList.remove('pinged-trying');
                row.classList.add('pinged-failure');
                pingResults[server.key] = false;
            }
        } else {
            console.warn(`Row not found for device: ${server['DNS Name']} (index: ${index})`);
        }
    }
    displayStatsTable(); // Update stats after pinging all devices
}

const AdminSelector = document.querySelector('#AdminSelector');
AdminSelector?.addEventListener('change', function (e) {
    e.preventDefault();
    if (AdminSelector.value === '1') {
        ShowSnooze = true;
        populateTable();
    }
    if (AdminSelector.value === '0') {
        showManageAlert = true;
        populateTable();
    }
});

// Inline banner “Sign In” button
const adminLogin = document.querySelector('#adminLogin');
adminLogin?.addEventListener('click', async function (e) {
    e.preventDefault();
    const username = document.querySelector('#username').value.trim();
    const password = document.querySelector('#password').value.trim();
    const res = await login(BaseUrl, username, password, fileName);
    if (!res.success) {
        const showAlert = document.getElementById('showAlerts');
        showAlert.innerHTML = res.message || res.error || 'No data found';
        showAlert.style.color = 'red';
        showAlert.style.display = 'flex';
        return;
    }
    user = res.data;
    localStorage.setItem('user', JSON.stringify(res.data));
    showadminFeature = true;
    document.getElementById('adminLoginCont').style.display = 'none';
    const AdminSelector = document.getElementById('AdminSelector');
    AdminSelector.style.display = 'flex';
    populateTable();
    await pingdevices(); // Ping devices after table is rendered
});

preProcess();
setInterval(pingdevices, PING_INTERVAL);