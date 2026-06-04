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
    // 立即收起弹窗并清掉计时态，界面即时响应（不再显示“保存中”loading）
    wx.removeStorageSync('poop:active');
    this.setData({ pickerOpen: false, active: null, pendingEnd: null, elapsedText: '00:00' });
    try {
      await store.addRecord(rec);
      this._renderStats(store.getCachedRecords());
      wx.showToast({ title: `保存成功 · 用时 ${poop.humanDuration(duration)}`, icon: 'none' });
    } catch (err) {
      // 失败：存到本地 outbox，在「我的」页顶部提示重新保存
      console.error('[saveRecord] 保存失败，存入本地待重试:', err);
      store.addFailed(rec);
      wx.showToast({ title: '保存失败，请在「我的」重新保存', icon: 'none' });
    } finally {
      this._saving = false;
    }
  },
});
