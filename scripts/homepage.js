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
	    const totalSeconds = Math.floor(diffTime / 1000);

	    const diffDays = Math.floor(totalSeconds / (60 * 60 * 24));
	    const diffHours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
	    const diffMinutes = Math.floor((totalSeconds % (60 * 60)) / 60);
	    const diffSeconds = totalSeconds % 60;

	    document.getElementById('uptime-text').innerText = 
		        `已运行 ${diffDays} 天 ${diffHours} 小时 ${diffMinutes} 分 ${diffSeconds} 秒`;
}

updateStatus();
setInterval(updateStatus, 1000);
