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
    pieEc: { lazyLoad: true },
    barEc: { lazyLoad: true },
  },

  _pieChart: null,
  _barChart: null,

  onLoad() {
    const profile = store.getCachedProfile();
    if (profile) {
      this.setData({
        avatarUrl: profile.avatarFileID || '',
        nickname: profile.nickname || DEFAULT_NICKNAME,
      });
    }
    this._render(store.getCachedRecords());
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
    if (!records.length) return;
    this._initPie(records);
    this._initBar(records);
  },

  _initPie(records) {
    const counts = {};
    poop.FEELINGS.forEach((f) => (counts[f] = 0));
    records.forEach((r) => (counts[r.feeling] = (counts[r.feeling] || 0) + 1));
    const data = poop.FEELINGS.filter((f) => counts[f] > 0).map((f) => ({
      name: f,
      value: counts[f],
      itemStyle: { color: poop.FEELING_COLOR[f] },
    }));

    const comp = this.selectComponent('#pie-chart');
    if (!comp) return;
    comp.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      chart.setOption({
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        series: [
          {
            type: 'pie',
            radius: ['40%', '68%'],
            center: ['50%', '42%'],
            label: { show: false },
            data: data,
          },
        ],
      });
      this._pieChart = chart;
      canvas.setChart(chart);
      return chart;
    });
  },

  _initBar(records) {
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

    const comp = this.selectComponent('#bar-chart');
    if (!comp) return;
    comp.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, { width, height, devicePixelRatio: dpr });
      chart.setOption({
        grid: { top: 16, right: 8, bottom: 24, left: 24 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: days.map((d) => d.label),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { fontSize: 9, interval: 1, color: '#9a8c7a' },
        },
        yAxis: { type: 'value', minInterval: 1, axisLine: { show: false }, splitLine: { lineStyle: { color: '#ece2d4' } } },
        series: [{ type: 'bar', data: days.map((d) => d.count), itemStyle: { color: '#c8862b', borderRadius: [6, 6, 0, 0] } }],
      });
      this._barChart = chart;
      canvas.setChart(chart);
      return chart;
    });
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
