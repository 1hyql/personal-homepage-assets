window.addEventListener('load', () => {
    const loadTime = Math.max(0, Date.now() - window.pageStartTime);
    document.getElementById('load-time').innerText = `${loadTime}ms`;
});

function updateStatus() {
    const now = new Date();
    try {
        const timeString = now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        document.getElementById('current-time').innerText = timeString;
    } catch(e) {
        document.getElementById('current-time').innerText = "--:--";
    }
    const diffTime = Math.abs(now - window.SITE_START_DATE);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('uptime-text').innerText = `已运行 ${diffDays} 天`;
}

updateStatus();
setInterval(updateStatus, 1000);
