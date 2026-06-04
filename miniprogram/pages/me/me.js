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

  _render(records) {
    const list = records.map((r) => ({
      _id: r._id,
      feelingText: r.feeling || '未记录',
      emoji: r.feeling ? poop.FEELING_EMOJI[r.feeling] : '➖',
      color: r.feeling ? poop.FEELING_COLOR[r.feeling] : '#c2b3a0',
      durText: poop.humanDuration(r.duration),
      dateText: poop.formatDateTime(r.endAt),
    }));

    let stats = { total: 0, totalDurText: '—', avgText: '—', maxMinText: '—' };
    if (records.length) {
      const durs = records.map((r) => r.duration);
      const totalDur = durs.reduce((a, b) => a + b, 0);
      const avg = Math.round(totalDur / records.length);
      stats = {
        total: records.length,
        totalDurText: poop.humanDuration(totalDur),
        avgText: poop.humanDuration(avg),
        maxMinText: `${poop.humanDuration(Math.max.apply(null, durs))} / ${poop.humanDuration(Math.min.apply(null, durs))}`,
      };
    }

    this.setData({ records: list, hasRecords: records.length > 0, stats });
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
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除这条记录？',
      content: '删除后无法恢复。',
      confirmColor: '#d8553a',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          const list = await store.removeRecord(id);
          this._render(list);
        } catch (err) {
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      },
    });
  },
});
