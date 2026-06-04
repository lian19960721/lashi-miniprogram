const poop = require('../../utils/poop');
const store = require('../../utils/store');
const echarts = require('../../components/ec-canvas/echarts');

const DEFAULT_NICKNAME = '拉屎大师';

Page({
  data: {
    avatarUrl: '',
    nickname: DEFAULT_NICKNAME,
    stats: { total: 0, totalDurText: '—', avgText: '—', maxMinText: '—' },
    records: [],
    hasRecords: false,
    barEc: { lazyLoad: true },
  },

  _barChart: null,
  _barInitting: false,
  _barOption: null,

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

    this.setData({ records: list, hasRecords: records.length > 0, stats }, () => {
      this._renderCharts(records);
    });
  },

  _renderCharts(records) {
    if (!records.length) {
      // 没有记录时 ec-canvas 已从视图移除，清空实例，下次有数据时重新初始化
      this._barChart = null;
      return;
    }
    this._renderBar(this._buildBarOption(records));
  },

  // 图表只初始化一次，之后数据变化用 setOption 更新，避免反复 init 造成闪烁/不稳定
  _renderBar(option) {
    this._barOption = option; // 始终记住最新 option
    if (this._barChart) {
      this._barChart.setOption(option, true);
      return;
    }
    if (this._barInitting) return; // 初始化进行中，跳过重复 init
    const comp = this.selectComponent('#bar-chart');
    if (!comp) return;
    this._barInitting = true;
    comp.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      chart.setOption(this._barOption); // 用最新 option
      this._barChart = chart;
      this._barInitting = false;
      canvas.setChart(chart);
      return chart;
    });
  },

  _buildBarOption(records) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, ts: d.getTime(), count: 0 });
    }
    records.forEach((r) => {
      const d = new Date(r.endAt);
      d.setHours(0, 0, 0, 0);
      const found = days.find((x) => x.ts === d.getTime());
      if (found) found.count++;
    });
    return {
      grid: { top: 16, right: 8, bottom: 24, left: 24 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: days.map((d) => d.label),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { fontSize: 9, interval: 1, color: '#9a8c7a' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLine: { show: false },
        splitLine: { lineStyle: { color: '#ece2d4' } },
      },
      series: [
        { type: 'bar', data: days.map((d) => d.count), itemStyle: { color: '#c8862b', borderRadius: [6, 6, 0, 0] } },
      ],
    };
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
