const poop = require('../../utils/poop');
const store = require('../../utils/store');

const DEFAULT_NICKNAME = '拉屎大师';

Page({
  data: {
    avatarUrl: '',
    nickname: DEFAULT_NICKNAME,
    stats: { total: 0, totalDurText: '—', avgText: '—', maxMinText: '—' },
    records: [],
    hasRecords: false,
  },

  onLoad() {
    const profile = store.getCachedProfile();
    if (profile) {
      this.setData({
        avatarUrl: profile.avatarFileID || '',
        nickname: profile.nickname || DEFAULT_NICKNAME,
      });
    }
  },

  onShow() {
    this._render(store.getCachedRecords());
    store
      .fetchRecords()
      .then((list) => this._render(list))
      .catch(() => {});
    store
      .fetchProfile()
      .then((p) => {
        if (p) {
          this.setData({
            avatarUrl: p.avatarFileID || '',
            nickname: p.nickname || DEFAULT_NICKNAME,
          });
        }
      })
      .catch(() => {});
  },

  _render(cloudRecords) {
    const failed = store.getFailedRecords();

    const toItem = (r, isFailed) => ({
      key: isFailed ? r._localId : r._id,
      id: isFailed ? '' : r._id,
      localId: isFailed ? r._localId : '',
      failed: isFailed,
      feelingText: r.feeling || '未记录',
      emoji: r.feeling ? poop.FEELING_EMOJI[r.feeling] : '➖',
      color: r.feeling ? poop.FEELING_COLOR[r.feeling] : '#c2b3a0',
      durText: poop.humanDuration(r.duration),
      dateText: poop.formatDateTime(r.endAt),
    });

    // 失败记录是刚刚发生的，放在最上面（最新）
    const list = failed.map((r) => toItem(r, true)).concat(cloudRecords.map((r) => toItem(r, false)));
    const all = failed.concat(cloudRecords);

    let stats = { total: 0, totalDurText: '—', avgText: '—', maxMinText: '—' };
    if (all.length) {
      const durs = all.map((r) => r.duration);
      const totalDur = durs.reduce((a, b) => a + b, 0);
      const avg = Math.round(totalDur / all.length);
      stats = {
        total: all.length,
        totalDurText: poop.humanDuration(totalDur),
        avgText: poop.humanDuration(avg),
        maxMinText: `${poop.humanDuration(Math.max.apply(null, durs))} / ${poop.humanDuration(Math.min.apply(null, durs))}`,
      };
    }

    this.setData({ records: list, hasRecords: list.length > 0, stats });
  },

  onResave(e) {
    const localId = e.currentTarget.dataset.localid;
    store
      .retryFailed(localId)
      .then((saved) => {
        if (!saved) return;
        this._render(store.getCachedRecords());
        wx.showToast({ title: '保存成功', icon: 'none' });
      })
      .catch(() => wx.showToast({ title: '仍然失败，请稍后再试', icon: 'none' }));
  },

  async onChooseAvatar(e) {
    const filePath = e.detail.avatarUrl;
    if (!filePath) return;
    wx.showLoading({ title: '上传中', mask: true });
    try {
      const fileID = await store.uploadAvatar(filePath);
      await store.upsertProfile({ avatarFileID: fileID, nickname: this.data.nickname });
      this.setData({ avatarUrl: fileID });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'none' });
    }
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  async onNicknameBlur(e) {
    const v = (e.detail.value || '').trim() || DEFAULT_NICKNAME;
    this.setData({ nickname: v });
    try {
      await store.upsertProfile({ nickname: v, avatarFileID: this.data.avatarUrl });
    } catch (err) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  onDelete(e) {
    const { id, localid, failed } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。',
      confirmColor: '#d8553a',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          if (failed) {
            store.removeFailed(localid);
            this._render(store.getCachedRecords());
          } else {
            const list = await store.removeRecord(id);
            this._render(list);
          }
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },
});
