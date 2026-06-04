const FEELINGS = ['正常', '喷射', '便秘', '腹泻', '不尽'];

const FEELING_EMOJI = {
  正常: '😌',
  喷射: '🚀',
  便秘: '😣',
  腹泻: '💦',
  不尽: '😮‍💨',
};

const FEELING_COLOR = {
  正常: '#3FB562',
  喷射: '#E08A2B',
  便秘: '#B5663F',
  腹泻: '#3F9FE0',
  不尽: '#8B7FB5',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

function humanDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} 秒`;
  if (s === 0) return `${m} 分`;
  return `${m} 分 ${s} 秒`;
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function formatDateTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatClock(ts) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = {
  FEELINGS,
  FEELING_EMOJI,
  FEELING_COLOR,
  formatDuration,
  humanDuration,
  timeAgo,
  formatDateTime,
  formatClock,
};
