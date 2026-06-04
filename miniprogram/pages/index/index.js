const poop = require('../../utils/poop');
const store = require('../../utils/store');

const PICKER_SECONDS = 3;

Page({
  data: {
    active: null,
    elapsedText: '00:00',
    startTimeText: '',
    todayCount: 0,
    lastAgo: '暂无记录',
    pickerOpen: false,
    pendingEnd: null,
    pendingDurText: '',
    countdown: PICKER_SECONDS,
    feelingItems: [],
  },

  _timer: null,
  _pickerTimer: null,
  _saving: false,

  onLoad() {
    const feelingItems = poop.FEELINGS.map((f) => ({ name: f, emoji: poop.FEELING_EMOJI[f] }));
    const active = wx.getStorageSync('poop:active') || null;
    this.setData({ feelingItems, active });
    if (active) {
      this.setData({ startTimeText: poop.formatClock(active.startAt) });
      this._startTimer();
    }
    this._renderStats(store.getCachedRecords());
  },

  onShow() {
    this._renderStats(store.getCachedRecords());
    store
      .fetchRecords()
      .then((list) => this._renderStats(list))
      .catch(() => {});
  },

  onUnload() {
    this._clearTimer();
    this._clearPickerTimer();
  },

  _renderStats(records) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const todayCount = records.filter((r) => r.endAt >= start.getTime()).length;
    const last = records[0];
    this.setData({
      todayCount,
      lastAgo: last ? poop.timeAgo(last.endAt) : '暂无记录',
    });
  },

  _startTimer() {
    this._clearTimer();
    const tick = () => {
      const active = this.data.active;
      if (!active) return;
      const elapsed = Math.max(0, Math.floor((Date.now() - active.startAt) / 1000));
      this.setData({ elapsedText: poop.formatDuration(elapsed) });
    };
    tick();
    this._timer = setInterval(tick, 1000);
  },

  _clearTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  },

  onMainTap() {
    if (this.data.active) this._handleEnd();
    else this._handleStart();
  },

  _handleStart() {
    const active = { startAt: Date.now() };
    wx.setStorageSync('poop:active', active);
    this.setData({ active, startTimeText: poop.formatClock(active.startAt) });
    this._startTimer();
  },

  _handleEnd() {
    const active = this.data.active;
    if (!active) return;
    const pendingEnd = { startAt: active.startAt, endAt: Date.now() };
    const dur = Math.max(1, Math.floor((pendingEnd.endAt - pendingEnd.startAt) / 1000));
    this._clearTimer();
    this.setData({
      pickerOpen: true,
      pendingEnd,
      pendingDurText: poop.humanDuration(dur),
      countdown: PICKER_SECONDS,
    });
    this._startPickerCountdown();
  },

  _startPickerCountdown() {
    this._clearPickerTimer();
    this._pickerTimer = setInterval(() => {
      const c = this.data.countdown - 1;
      if (c <= 0) {
        this.setData({ countdown: 0 });
        this._saveRecord(null); // 倒计时结束：照常记录，但不记这次感受
      } else {
        this.setData({ countdown: c });
      }
    }, 1000);
  },

  _clearPickerTimer() {
    if (this._pickerTimer) {
      clearInterval(this._pickerTimer);
      this._pickerTimer = null;
    }
  },

  // 点 × 或点遮罩：不选感受，照常记录这次
  closePicker() {
    this._saveRecord(null);
  },

  noop() {},

  onPickFeeling(e) {
    this._saveRecord(e.currentTarget.dataset.feeling);
  },

  async _saveRecord(feeling) {
    if (this._saving) return;
    const pendingEnd = this.data.pendingEnd;
    if (!pendingEnd) return;
    this._saving = true;
    this._clearPickerTimer();
    const duration = Math.max(1, Math.floor((pendingEnd.endAt - pendingEnd.startAt) / 1000));
    const rec = {
      startAt: pendingEnd.startAt,
      endAt: pendingEnd.endAt,
      duration,
      feeling: feeling || null,
    };
    this.setData({ pickerOpen: false });
    wx.showLoading({ title: '保存中', mask: true });
    try {
      await store.addRecord(rec);
      wx.removeStorageSync('poop:active');
      this.setData({ active: null, pendingEnd: null, elapsedText: '00:00' });
      this._renderStats(store.getCachedRecords());
      wx.hideLoading();
      wx.showToast({
        title: feeling ? `用时 ${poop.humanDuration(duration)}` : `已记录 · ${poop.humanDuration(duration)}`,
        icon: 'none',
      });
    } catch (err) {
      console.error('[saveRecord] addRecord 失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this._saving = false;
    }
  },
});
