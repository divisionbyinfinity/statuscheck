import { ping, fetchJSON, MailAlertEnable, UpdateSnooze, login,checkToken, updateDevice, deleteDevice, addDevice } from './helper.js';

// Specify the name of the configuration JSON file.
const CONFIG_FILE = 'config.json';  // default
let configFile = CONFIG_FILE;         // variable to hold the active config file

// Check if URL contains a "config" query parameter, e.g., ?config=devices_monitor
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('config')) {
    // Use the parameter's value and append ".json"
    configFile = urlParams.get('config') + '.json';
}
  
// Initialize the FILTER_KEYS object.
const FILTER_KEYS = {};

let servers = [];
let filteredServers = [];
let showManageAlert = false;
let ShowSnooze = false;
let showadminFeature = false;
let pageTitle, subTitle, description, BaseUrl, logo, contact, contactEmail, contactPhone, fileName, showAdmin, showAlertStatus;

// New variables for additional config values
let signInTitle, signInIcon, signInUrl;
let monitorTitle, monitorIcon, monitorUrl;
let endpointTitle, endpointIcon, endpointUrl;
let helpTitle, helpIcon, helpUrl;
let devTitle, devIcon, devUrl;
let user = localStorage.getItem('user') || null;
user=JSON.parse(user);
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
    e.preventDefault();
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    document.getElementById("modalSubmit").style.display = 'none';
    document.getElementById('modalSpinner').style.display = 'block';

    const res = await login(BaseUrl,username, password,fileName);
    document.getElementById('modalSpinner').style.display = 'none';
    document.getElementById("modalSubmit").style.display = 'block';
    if (!res.success) {
        appendAlert(res.message || res.error || 'No data found', true);
        showadminFeature = false;
        return;
    }
    else {
        user = res.data;
        modalCont.style.display = 'none';
        showadminFeature = true;
        populateTable();
        localStorage.setItem('user', JSON.stringify(res.data));
    }
}

const preProcess = async () => {
    await loadConfig();
    const res = await fetchJSON(BaseUrl, fileName);
    if (res && typeof res === 'object') {
        servers = res;
    } else {
        appendAlert('Failed to load devices', true);
    }
    
    
    document.getElementById('pagetitle').textContent = pageTitle;
    document.getElementById('subtitle').textContent = subTitle;
    document.getElementById('description').textContent = description;
    document.getElementById('contact').textContent = contact;
    document.getElementById('logo').innerHTML = `<img src="images/${logo}" alt="Logo">`;

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
        // Append the sign in title as text after the image if not already added
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
        // Note: for dev, the anchor id is "dev_link"
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
        let user = localStorage.getItem('user');
        user = JSON.parse(user);
        if (user && user.token) { 
            const res = await checkToken(BaseUrl, user.token);
            if (res.success) {
                showadminFeature = true;
                populateTable();
            }
            else {
                appendAlert(res.message || res.error || 'No data found', true);
                localStorage.removeItem('user');
                showadminFeature = false;
            }
        }
        else {
            localStorage.removeItem('user');
            showadminFeature = false;
        }
        
        const modalCont = document.getElementById('modalCont');
        modalCont.style.display = 'flex';
        const modal = document.getElementById('modal');
        modal.classList.add('modalcss');
        if (showadminFeature) {
            modal.innerHTML = `
                <form id="logoutForm">
                    <header>Logout</header>
                    <main>
                        <label for="password">Are you sure you want to logout :- </label>
                    </main>
                    <footer>
                        <button type="button" id="closeModal">No</button>
                        <button type="submit" id="modalSubmit">Yes</button>
                        <div class='spinner' style="display:none" id="modalSpinner"></div>
                    </footer>
                </form>
            `;
        
            modal.querySelector('#closeModal').addEventListener('click', function (e) {
                e.preventDefault();
                modalCont.style.display = 'none';
            });
            modal.querySelector('form').addEventListener('submit', async function (e) {
                e.preventDefault();
                localStorage.removeItem('user');
                showadminFeature = false;
                modalCont.style.display = 'none';
                populateTable();
            });
        }
        else {
            modal.innerHTML = `
                <form id="adminLoginForm">
                    <header>Login</header>
                    <main>
                        <div>
                        <label for="username" class="username-label">Username :- </label>
                        <input type="text" id="username" name="username"  placeholder="Enter username"  minlength="5" maxlength="30" required/>
                        </div>
                        <div>
                            <label for="password" class="passwd-label">Password :- </label>
                            <input type="password" id="password" name="password" placeholder="Enter password" minlength="5" maxlength="30" required />
                        </div>
                    </main>
                    <footer>
                        <button type="button" id="closeModal">Close</button>
                        <button type="submit" id="modalSubmit">Submit</button>
                        <div class='spinner' style="display:none" id="modalSpinner"></div>
                    </footer>
                </form>
            `;
        
            modal.querySelector('#closeModal').addEventListener('click', function (e) {
                e.preventDefault();
                modalCont.style.display = 'none';
            });
            modal.querySelector('form').addEventListener('submit', adminLoginForm);
        }
    });
    if (!servers || servers.length === 0) {
        appendAlert('No data found', true);
    }
    
    // ===== Updated filtering code using FILTER_KEYS =====
    // Use the new keys from FILTER_KEYS for building the dropdowns.
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
    goButton.addEventListener('click', function (e) {
        e.preventDefault();
        populateTable();
    });
    populateTable(); 
}

const populateTable = () => {
    // Use FILTER_KEYS with the new keys for filtering the devices.
    const selectedType = document.querySelector('#typeSelector').value;
    const selectedLocation = document.querySelector('#locationSelector').value;

    filteredServers = Object.values(servers).filter((server) => {
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
                    </main>
                    <footer>
                        <button type="button" id="closeModal">Close</button>
                        <button type="submit" id="modalSubmit">Submit</button>
                        <div class='spinner' style="display:none" id="modalSpinner"></div>
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
                const res = await addDevice(BaseUrl, deviceObj, fileName,user.token);
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
        const row = document.createElement('tr');
        row.id = `row-${index}`;

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
            statusImage.alt = 'checked';
            statusImage.addEventListener('click', async function (e) {
                e.preventDefault();
                // Toggle the current state before making the API call
                const newStatus = !server['Alert Enable'];
                const res = await MailAlertEnable(BaseUrl, server['DNS Name'], newStatus, fileName,user.token);
                if (res.success) {
                    appendAlert(res.message, false);
                    // Update the server object with the new status
                    server['Alert Enable'] = newStatus;
                    // Update the image source based on the new status
                    e.target.src = newStatus ? './images/switch.png' : './images/off-button.png';
                } else {
                    appendAlert(res.message || res.error || 'No data found', true);
                }
            });
            status.appendChild(statusImage);
            adminFeatureCell.appendChild(status);
            const snoozeCell = document.createElement('span');
            const snoozeImage = document.createElement('img');
            
            // Update icon and tooltip
            const isSnoozed = server['snoozeTime'] && server['snoozeTime'] > 0;
            snoozeImage.src = isSnoozed ? './images/snoozeon.png' : './images/snooze.png';
            snoozeImage.title = isSnoozed
              ? `Expiring in ${server['snoozeTime']} min`
              : 'Not snoozed';
            
            snoozeCell.appendChild(snoozeImage);
            
            // Optional: add visible text label
            if (isSnoozed) {
                const snoozeLabel = document.createElement('span');
                snoozeLabel.textContent = ` (${server['snoozeTime']} min)`;
                snoozeLabel.style.fontSize = '0.8em';
                snoozeLabel.style.marginLeft = '4px';
                snoozeLabel.style.color = server['snoozeTime'] < 5 ? '#d9534f' : '#888'; // red if < 5
                snoozeCell.appendChild(snoozeLabel);
              }

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
                        <input type="number" id="snooze" name="snooze" required placeholder="Enter snooze time in minutes" />
                            </div>
                        </main>
                        <footer>
                            <button type="button" id="closeModal">Close</button>
                            <button type="submit" id="modalSubmit">Submit</button>
                            <div class='spinner' style="display:none" id="modalSpinner"></div>
                        </footer>
                    </form>
                `;
                modal.querySelector('#closeModal').addEventListener('click', function (e) {
                    e.preventDefault();
                    modalCont.style.display = 'none';
                });
                modal.querySelector('form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const snoozeTime = document.getElementById('snooze').value;
                    document.getElementById("modalSubmit").style.display = 'none';
                    document.getElementById('modalSpinner').style.display = 'block';
                    const dnsName = server['DNS Name'];
                    const res = await UpdateSnooze(BaseUrl, dnsName, snoozeTime, fileName, user.token);
                    document.getElementById('modalSpinner').style.display = 'none';
                    document.getElementById("modalSubmit").style.display = 'block';
                    if (res.success) {
                        modalCont.style.display = 'none';
                        server['snoozeTime'] = snoozeTime;
                        if (server['snoozeTime'] > 0) {
                            if (server['snoozeTime'] > 0) {
                                snoozeImage.title = `Expiring in ${server['snoozeTime']} min`;
                                snoozeLabel.textContent = ` (${server['snoozeTime']} min)`;
                                snoozeLabel.style.color = server['snoozeTime'] < 5 ? '#d9534f' : '#888';
                            } else {
                                snoozeImage.title = 'Not snoozed';
                                snoozeLabel.textContent = '';
                            }
                        } else {
                            snoozeImage.title = 'Not snoozed';
                        }
                        snoozeImage.src = (server['snoozeTime'] && server['snoozeTime'] > 0) ? './images/snoozeon.png' : './images/snooze.png';
                        appendAlert(res.message, false);
                    } else {
                        appendAlert(res.message || res.error || 'No data found', true);
                    }
                });
            });
            adminFeatureCell.appendChild(snoozeCell);
            const editCell = document.createElement('span');
            const editImage = document.createElement('img');
            editImage.src = './images/edit.png';
            editImage.title = 'Edit';
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
                            <div class='spinner' style="display:none" id="modalSpinner"></div>  
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
                // Handle PORTAL field visibility and pre-fill if applicable
                    const actionSelect = modal.querySelector('select[name="Actions"]');
                    const portalField = modal.querySelector('#portalField');
                    const portalInput = modal.querySelector('input[name="Portal"]');

                    if (actionSelect.value.toUpperCase() === 'PORTAL') {
                        portalField.style.display = 'block';
                        portalInput.value = server['Portal'] || '';
                    } else {
                        portalField.style.display = 'none';
                    }

                    // Dynamically toggle visibility if user changes the action
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
                    const res = await updateDevice(BaseUrl, deviceObj, fileName, server['DNS Name'],user.token);
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
                            <div class='spinner' style="display:none" id="modalSpinner"></div>
                        </footer>
                    </form>
                `;
                modal.querySelector('#closeModal').addEventListener('click', function (e) {
                    e.preventDefault();
                    modalCont.style.display = 'none';
                });
                modal.querySelector('form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const res = await deleteDevice(BaseUrl, fileName, server['DNS Name'],user.token);
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

    pingdevices();
}

const pingdevices = async () => {
    filteredServers.forEach(async (server, index) => {
        const row = document.getElementById(`row-${index}`);
        const pingButton = row.querySelector(`#ping-${index}`);
        if (pingButton) {
            pingButton.addEventListener('click', async function (e) {
                e.preventDefault();
                row.style.backgroundColor = 'rgb(3, 117, 180)';
                const res = await ping(BaseUrl, server['IP Address']);
                if (res.alive) {
                    row.style.backgroundColor = '#3fb618';
                }
                else {
                    row.style.backgroundColor = '#ff0039';
                }
            });
        }
        row.style.backgroundColor = 'rgb(3, 117, 180)';
        const res = await ping(BaseUrl, server['IP Address']);
        if (res.alive) {
            row.style.backgroundColor = '#3fb618';
        }
        else {
            row.style.backgroundColor = '#ff0039';
        }
    });
}

const AdminSelctor = document.querySelector('#AdminSelctor');
AdminSelctor?.addEventListener('change', function (e) {
    e.preventDefault();
    if (AdminSelctor.value === '1') {
        ShowSnooze = true;
        populateTable();
    }
    if (AdminSelctor.value === '0') {
        showManageAlert = true;
        populateTable();
    }
});

const adminLogin = document.querySelector('#adminLogin');
adminLogin?.addEventListener('click', async function (e) {
    e.preventDefault();
    const username = document.querySelector('#username').value;
    const password = document.querySelector('#password').value;
    const res = await login(BaseUrl, username,password,fileName);
    if (!res.success) {
        const showAlert = document.getElementById('showAlerts');
        showAlert.innerHTML = res.message || res.error || 'No data found';
        if (res.error) {
            showAlert.style.color = 'red';
            showAlert.style.display = 'flex';
        }
        return;
    }
    else {
        document.getElementById('adminLoginCont').style.display = 'none';
        document.getElementById('AdminSelctor').style.display = 'flex';
    }
});

preProcess();
setInterval(pingdevices, 5 * 60 * 1000);
 