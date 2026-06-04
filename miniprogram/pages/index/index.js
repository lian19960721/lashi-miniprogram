const poop = require('../../utils/poop');
const store = require('../../utils/store');

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
    feelingItems: [],
  },

  _timer: null,

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
    this.setData({ pickerOpen: true, pendingEnd, pendingDurText: poop.humanDuration(dur) });
  },

  closePicker() {
    this.setData({ pickerOpen: false });
  },

  noop() {},

  async onPickFeeling(e) {
    const feeling = e.currentTarget.dataset.feeling;
    const pendingEnd = this.data.pendingEnd;
    if (!pendingEnd) return;
    const duration = Math.max(1, Math.floor((pendingEnd.endAt - pendingEnd.startAt) / 1000));
    const rec = { startAt: pendingEnd.startAt, endAt: pendingEnd.endAt, duration, feeling };
    wx.showLoading({ title: '保存中', mask: true });
    try {
      await store.addRecord(rec);
      wx.removeStorageSync('poop:active');
      this.setData({
        active: null,
        pickerOpen: false,
        pendingEnd: null,
        elapsedText: '00:00',
      });
      this._renderStats(store.getCachedRecords());
      wx.hideLoading();
      wx.showToast({ title: `用时 ${poop.humanDuration(duration)}`, icon: 'none' });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
});
