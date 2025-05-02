
let BaseUrl;
const pingdevice=async (element,ip)=>{
    const button = document.createElement('button');
    button.innerHTML = 'Ping';
    const status = document.createElement('span');
    status.classList.add('ping-status');
    status.innerHTML = '🟡';
    element.innerHTML = '';
    element.appendChild(status);
    element.style.setProperty('display', 'flex');
    element.style.setProperty('flex-direction', 'row');
    fetch(`${BaseUrl}?ip=${ip}`)
    .then(response => response.json())
    .then(async data => {
        element.innerHTML = '';
        button.onclick = () => {
            pingdevice(element, ip);
        };
        if (data.alive) {
            element.innerHTML = '';
            element.appendChild(button);
            const status=document.createElement('span');
            status.classList.add('ping-status');
            status.innerHTML='🟢';
            element.appendChild(status);
        } else {
            element.innerHTML = '';
            element.appendChild(button);
            const status=document.createElement('span');
            status.classList.add('ping-status');
            status.innerHTML='🔴';
            element.appendChild(status);
        }
    }
    )
    .catch(error => {
        element.innerHTML = '';
        element.appendChild(button);

        console.error('Error:', error);
        const status=document.createElement('span');
        status.classList.add('ping-status');
        status.innerHTML='⚪';
        element.appendChild(status);
    });
}
async function loadConfig() {
	await fetch(configFile)
        .then(response => response.json())
        .then(data => {
            BaseUrl = data.api; 
        })
        .catch(error => console.error('Error loading config:', error));
}
const initialize = async () => {
    console.log('Loading config file');
    await loadConfig();
    console.log('Sample Status Check Injector Loaded');
    setTimeout(() => {
        const targetStatusBoxes = [...document.getElementsByClassName('status-box')];
        targetStatusBoxes.forEach(element => {
            const checkme = element.getElementsByClassName('checkme')[0];
            const statusbox = element.getElementsByClassName('child-box-right')[0];
            if (statusbox) {
                const ip = statusbox.innerText.trim();
                pingdevice(checkme, ip);            
            }
        });
    }, 2000); // Adjust the delay time as needed
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // Document has already loaded, initialize immediately
    initialize();
}
